
package com.bookleaf.backend.service;

import com.bookleaf.backend.entity.Ticket;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Locale;
import java.util.Map;

@Service
public class AiSupportService {

    private static final Logger log =
            LoggerFactory.getLogger(AiSupportService.class);

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Value("${bookleaf.ai.model:llama3.2}")
    private String model;

    @Value("${bookleaf.ai.enabled:true}")
    private boolean aiEnabled;

    public AiSupportService() {
        this.objectMapper = new ObjectMapper();
        this.restClient = RestClient.builder()
                .baseUrl("http://localhost:11434")
                .build();
    }

    public Map<String, Object> draftResponse(Ticket ticket) {
        Map<String, Object> result = processTicket(ticket);

        Object draft = result.get("draft");

        if (draft == null || draft.toString().isBlank()) {
            throw new IllegalStateException(
                    "No response draft was generated."
            );
        }

        return result;
    }

    public Map<String, Object> analyzeTicket(Ticket ticket) {
        Map<String, Object> result = processTicket(ticket);

        return Map.of(
                "category", result.get("category"),
                "priority", result.get("priority"),
                "source", result.get("source"),
                "notice", result.get("notice")
        );
    }

    public Map<String, Object> processTicket(Ticket ticket) {
        if (aiEnabled) {
            try {
                log.info("Calling local Ollama model: {}", model);

                Map<String, Object> result = requestLocalAi(ticket);

                log.info("Ollama request completed successfully.");
                return result;

            } catch (Exception exception) {
                log.error("Local Ollama AI request failed.", exception);
            }
        }

        log.warn("Using rule-based fallback for ticket.");
        return requestFallback(ticket);
    }

    private Map<String, Object> requestLocalAi(Ticket ticket)
            throws Exception {

        String knowledgeBase = """
                BookLeaf Support Knowledge Base

                1. ROYALTY_PAYMENTS:
                Authors receive 80% of net profit.
                Royalties are calculated quarterly and paid within
                45 days after the quarter ends.
                The minimum payout threshold is INR 1,000.
                Payments are made by bank transfer.
                Never promise a payment date without verification.

                2. ISBN_METADATA_ISSUES:
                ISBN and book metadata errors require HIGH priority.
                Escalate ISBN errors to the production team.
                Never invent ISBNs or change metadata without verification.

                3. PRINTING_QUALITY:
                Normal printing turnaround is 5-7 business days.
                A free reprint may be arranged after a quality issue
                is verified. Ask the author for photos.
                Never guarantee a reprint before verification.

                4. DISTRIBUTION_AVAILABILITY:
                Distribution and availability information may take
                24-48 hours to sync.
                Never invent tracking details or delivery dates.

                5. BOOK_STATUS_PRODUCTION:
                Book listings typically become live within
                7-10 business days.
                Verify production updates before sharing them.
                Never invent production dates or book status.

                6. GENERAL_INQUIRY:
                Questions that do not fit the other categories.

                Priority levels:
                CRITICAL: Severe incident, fraud, or major service failure.
                HIGH: Urgent issue or significant author impact.
                MEDIUM: Issue requiring attention but not urgent.
                LOW: General question or routine request.

                Communication rules:
                Be empathetic, polite, clear, and professional.
                Explain the next steps clearly.
                Never invent facts, dates, or promises.
                If details are missing, say the team will verify them.
                Use only these BookLeaf policies.
                """;

        String prompt = """
                You are the customer support assistant for BookLeaf.

                Knowledge base:
                %s

                Ticket subject: %s
                Ticket description: %s

                Return one valid JSON object with exactly these fields:
                {
                  "category": "GENERAL_INQUIRY",
                  "priority": "LOW",
                  "draft": "A complete customer-facing reply."
                }

                Allowed categories:
                ROYALTY_PAYMENTS
                ISBN_METADATA_ISSUES
                PRINTING_QUALITY
                DISTRIBUTION_AVAILABILITY
                BOOK_STATUS_PRODUCTION
                GENERAL_INQUIRY

                Allowed priorities: CRITICAL, HIGH, MEDIUM, LOW.

                Rules:
                Select the best matching category and priority.
                Never classify a clear delivery issue as GENERAL_INQUIRY.
                Never classify a clear royalty issue as GENERAL_INQUIRY.
                Use CRITICAL only for genuinely severe incidents.
                Write a complete, empathetic customer-facing reply.
                Include relevant knowledge base information when applicable.
                Never invent facts or promise unverified outcomes.
                Do not expose internal notes.
                Return JSON only, without Markdown or extra text.
                """.formatted(
                knowledgeBase,
                safeText(ticket.getSubject()),
                safeText(ticket.getDescription())
        );

        Map<String, Object> requestBody = Map.of(
                "model", model,
                "stream", false,
                "format", "json",
                "messages", new Object[]{
                        Map.of(
                                "role", "system",
                                "content", "Return valid JSON only."
                        ),
                        Map.of(
                                "role", "user",
                                "content", prompt
                        )
                },
                "options", Map.of("temperature", 0.2)
        );

        String response = restClient.post()
                .uri("/api/chat")
                .body(requestBody)
                .retrieve()
                .body(String.class);

        if (response == null || response.isBlank()) {
            throw new IllegalStateException(
                    "Ollama returned an empty HTTP response."
            );
        }

        JsonNode root = objectMapper.readTree(response);

        String content = root.path("message")
                .path("content")
                .asText("");

        if (content.isBlank()) {
            throw new IllegalStateException(
                    "Ollama returned empty message content."
            );
        }

        JsonNode result = objectMapper.readTree(content);

        String aiCategory = normalizeCategory(
                result.path("category").asText("")
        );

        String ruleCategory = classifyCategory(ticket);

        // Prefer the rule-based result when it identifies a
        // specific category but the AI returns GENERAL_INQUIRY.
        String category;

        if (aiCategory.isBlank()
                || ("GENERAL_INQUIRY".equals(aiCategory)
                && !"GENERAL_INQUIRY".equals(ruleCategory))) {
            category = ruleCategory;
        } else {
            category = aiCategory;
        }

        String priority = normalizePriority(
                result.path("priority").asText("")
        );

        if (priority.isBlank()) {
            priority = classifyPriority(ticket);
        }

        String draft = result.path("draft").asText("").trim();

        if (draft.isBlank()) {
            throw new IllegalStateException(
                    "Local AI returned an empty draft."
            );
        }

        return Map.of(
                "category", category,
                "priority", priority,
                "draft", draft,
                "source", "OLLAMA_LOCAL",
                "notice", ""
        );
    }

    private Map<String, Object> requestFallback(Ticket ticket) {
        String category = classifyCategory(ticket);
        String priority = classifyPriority(ticket);

        String draft = """
                Hello, thank you for contacting BookLeaf Support regarding
                "%s".

                We understand your concern. Our support team will review
                your request and verify the relevant details. We will
                provide an update after the necessary checks are complete.

                Thank you for your patience.
                """.formatted(safeText(ticket.getSubject())).trim();

        return Map.of(
                "category", category,
                "priority", priority,
                "draft", draft,
                "source", "RULE_BASED_FALLBACK",
                "notice", "Local AI unavailable. Rule-based fallback returned."
        );
    }

    private String classifyCategory(Ticket ticket) {
        String text = (
                safeText(ticket.getSubject()) + " "
                        + safeText(ticket.getDescription())
        ).toLowerCase(Locale.ROOT);

        if (containsAny(text, "royalty", "royalties", "payment",
                "payout", "invoice", "billing", "net profit")) {
            return "ROYALTY_PAYMENTS";
        }

        if (containsAny(text, "isbn", "metadata", "book title error",
                "author name error", "wrong isbn")) {
            return "ISBN_METADATA_ISSUES";
        }

        if (containsAny(text, "printing", "print quality", "damaged",
                "poor quality", "misprint", "reprint")) {
            return "PRINTING_QUALITY";
        }

        if (containsAny(text, "distribution", "delivery", "shipping",
                "tracking", "availability", "not available", "stock")) {
            return "DISTRIBUTION_AVAILABILITY";
        }

        if (containsAny(text, "production", "publication status",
                "book status", "publishing status", "listing live",
                "book not published")) {
            return "BOOK_STATUS_PRODUCTION";
        }

        return "GENERAL_INQUIRY";
    }

    private String classifyPriority(Ticket ticket) {
        String text = (
                safeText(ticket.getSubject()) + " "
                        + safeText(ticket.getDescription())
        ).toLowerCase(Locale.ROOT);

        if (containsAny(text, "fraud", "unauthorized transaction",
                "security breach", "critical incident")) {
            return "CRITICAL";
        }

        if (containsAny(text, "isbn error", "urgent", "emergency",
                "immediately", "serious damage", "major failure")) {
            return "HIGH";
        }

        if (containsAny(text, "delay", "problem", "issue",
                "complaint", "failed", "not received", "incorrect")) {
            return "MEDIUM";
        }

        return "LOW";
    }

    private String normalizeCategory(String category) {
        String value = category.trim()
                .toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z0-9]+", "_")
                .replaceAll("^_|_$", "");

        return switch (value) {
            case "ROYALTY", "PAYMENT", "PAYMENTS",
                    "ROYALTY_PAYMENT", "ROYALTY_PAYMENTS" ->
                    "ROYALTY_PAYMENTS";

            case "ISBN", "METADATA", "ISBN_METADATA",
                    "ISBN_METADATA_ISSUES" ->
                    "ISBN_METADATA_ISSUES";

            case "PRINTING", "QUALITY", "PRINTING_QUALITY" ->
                    "PRINTING_QUALITY";

            case "DISTRIBUTION", "AVAILABILITY",
                    "DISTRIBUTION_AVAILABILITY" ->
                    "DISTRIBUTION_AVAILABILITY";

            case "PRODUCTION", "BOOK_STATUS",
                    "BOOK_STATUS_PRODUCTION",
                    "BOOK_STATUS_AND_PRODUCTION_UPDATES" ->
                    "BOOK_STATUS_PRODUCTION";

            case "GENERAL", "GENERAL_INQUIRY", "ACCOUNT", "TECHNICAL" ->
                    "GENERAL_INQUIRY";

            default -> "";
        };
    }

    private String normalizePriority(String priority) {
        String value = priority.trim().toUpperCase(Locale.ROOT);

        return switch (value) {
            case "CRITICAL", "HIGH", "MEDIUM", "LOW" -> value;
            default -> "";
        };
    }

    private boolean containsAny(String text, String... keywords) {
        for (String keyword : keywords) {
            if (text.contains(keyword)) {
                return true;
            }
        }

        return false;
    }

    private String safeText(String value) {
        return value == null ? "" : value.trim();
    }
}
