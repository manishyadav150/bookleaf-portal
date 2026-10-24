
package com.bookleaf.backend.controller;

import com.bookleaf.backend.dto.AdminTicketResponse;
import com.bookleaf.backend.entity.AppUser;
import com.bookleaf.backend.entity.Ticket;
import com.bookleaf.backend.repository.AppUserRepository;
import com.bookleaf.backend.service.AiSupportService;
import com.bookleaf.backend.service.TicketService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class TicketController {

    private final TicketService ticketService;
    private final AppUserRepository appUserRepository;
    private final AiSupportService aiSupportService;

    public TicketController(
            TicketService ticketService,
            AppUserRepository appUserRepository,
            AiSupportService aiSupportService) {

        this.ticketService = ticketService;
        this.appUserRepository = appUserRepository;
        this.aiSupportService = aiSupportService;
    }

    // AUTHOR: Create a support ticket
    @PostMapping("/author/tickets")
    public ResponseEntity<?> createTicket(
            @RequestBody Ticket request,
            Authentication authentication) {

        if (request.getSubject() == null
                || request.getSubject().isBlank()
                || request.getDescription() == null
                || request.getDescription().isBlank()) {

            return ResponseEntity.badRequest().body(
                    Map.of("message",
                            "Subject and description are required."));
        }

        AppUser user = appUserRepository
                .findByEmailIgnoreCase(authentication.getName())
                .orElse(null);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message",
                            "Authenticated user not found."));
        }

        if (!"AUTHOR".equals(user.getRole())
                || user.getAuthorId() == null) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message",
                            "An author account is required."));
        }

        Ticket ticket = new Ticket();
        ticket.setSubject(request.getSubject().trim());
        ticket.setDescription(request.getDescription().trim());
        ticket.setCategory("GENERAL_INQUIRY");
        ticket.setPriority("MEDIUM");
        ticket.setAuthorId(user.getAuthorId());
        ticket.setAuthorEmail(user.getEmail());

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ticketService.createTicket(ticket));
    }

    // AUTHOR: Get only the logged-in author's tickets
    @GetMapping("/author/tickets")
    public ResponseEntity<?> getAuthorTickets(
            Authentication authentication) {

        AppUser user = appUserRepository
                .findByEmailIgnoreCase(authentication.getName())
                .orElse(null);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message",
                            "Authenticated user not found."));
        }

        if (!"AUTHOR".equals(user.getRole())
                || user.getAuthorId() == null) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message",
                            "An author account is required."));
        }

        return ResponseEntity.ok(
                ticketService.getAuthorTickets(user.getAuthorId()));
    }

    // ADMIN: Get all tickets
    @GetMapping("/admin/tickets")
    public List<AdminTicketResponse> getAllTickets() {
        return ticketService.getAllTickets()
                .stream()
                .map(AdminTicketResponse::new)
                .toList();
    }

    // ADMIN: Update ticket status
    @PatchMapping("/admin/tickets/{id}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {

        String status = request.get("status");

        if (status == null
                || !List.of(
                        "OPEN",
                        "IN_PROGRESS",
                        "RESOLVED",
                        "CLOSED")
                        .contains(status)) {

            return ResponseEntity.badRequest().body(
                    Map.of("message", "Invalid ticket status."));
        }

        try {
            return ResponseEntity.ok(
                    ticketService.updateTicketStatus(id, status));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", exception.getMessage()));
        }
    }

    // ADMIN: Save a public response for the author
    @PatchMapping("/admin/tickets/{id}/response")
    public ResponseEntity<?> updateResponse(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {

        String response = request.get("adminResponse");

        if (response == null || response.isBlank()) {
            return ResponseEntity.badRequest().body(
                    Map.of("message",
                            "Admin response cannot be empty."));
        }

        try {
            Ticket ticket = ticketService.getTicketById(id);
            ticket.setAdminResponse(response.trim());

            return ResponseEntity.ok(
                    ticketService.saveTicket(ticket));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", exception.getMessage()));
        }
    }

    // ADMIN: Save internal notes
    @PatchMapping("/admin/tickets/{id}/internal-notes")
    public ResponseEntity<?> updateInternalNotes(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {

        String notes = request.get("internalNotes");

        if (notes == null || notes.isBlank()) {
            return ResponseEntity.badRequest().body(
                    Map.of("message",
                            "Internal notes cannot be empty."));
        }

        try {
            Ticket ticket = ticketService.getTicketById(id);
            ticket.setInternalNotes(notes.trim());

            return ResponseEntity.ok(
                    ticketService.saveTicket(ticket));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", exception.getMessage()));
        }
    }

    // ADMIN: Analyze ticket category and priority
    @PostMapping("/admin/tickets/{id}/analyze")
    public ResponseEntity<?> analyzeTicket(
            @PathVariable Long id) {

        try {
            Ticket ticket = ticketService.getTicketById(id);

            return ResponseEntity.ok(
                    aiSupportService.analyzeTicket(ticket));

        } catch (IllegalArgumentException exception) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", exception.getMessage()));
        }
    }

    // ADMIN: Apply suggested category and priority
    @PatchMapping("/admin/tickets/{id}/classification")
    public ResponseEntity<?> updateClassification(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {

        String category = request.get("category");
        String priority = request.get("priority");

        List<String> allowedCategories = List.of(
                "ROYALTY_PAYMENTS",
                "ISBN_METADATA_ISSUES",
                "PRINTING_QUALITY",
                "DISTRIBUTION_AVAILABILITY",
                "BOOK_STATUS_PRODUCTION",
                "GENERAL_INQUIRY"
        );

        List<String> allowedPriorities = List.of(
                "LOW",
                "MEDIUM",
                "HIGH",
                "CRITICAL"
        );

        if (category == null
                || !allowedCategories.contains(category)) {

            return ResponseEntity.badRequest().body(
                    Map.of("message", "Invalid ticket category."));
        }

        if (priority == null
                || !allowedPriorities.contains(priority)) {

            return ResponseEntity.badRequest().body(
                    Map.of("message", "Invalid ticket priority."));
        }

        try {
            Ticket ticket = ticketService.getTicketById(id);

            ticket.setCategory(category);
            ticket.setPriority(priority);

            return ResponseEntity.ok(
                    ticketService.saveTicket(ticket));

        } catch (IllegalArgumentException exception) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", exception.getMessage()));
        }
    }

    // ADMIN: Generate a response draft
    @PostMapping("/admin/tickets/{id}/draft-response")
    public ResponseEntity<?> draftResponse(
            @PathVariable Long id) {

        try {
            Ticket ticket = ticketService.getTicketById(id);

            return ResponseEntity.ok(
                    aiSupportService.draftResponse(ticket));

        } catch (IllegalArgumentException exception) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", exception.getMessage()));
        }
    }
}
