import { useCallback, useEffect, useState } from "react";
import "./SupportPortal.css";

import {
  getAuthorTickets,
  createAuthorTicket,
  getAdminTickets,
  updateTicketStatus,
  updateTicketResponse,
  updateInternalNotes,
  analyzeTicket,
  draftTicketResponse,
  updateTicketClassification,
} from "../services/ticketService";

const API_CATEGORY_LABELS = {
  ROYALTY_PAYMENTS: "Royalty & Payments",
  ROYALTY: "Royalty & Payments",
  ISBN_METADATA_ISSUES: "ISBN & Metadata Issues",
  ISBN_METADATA: "ISBN & Metadata Issues",
  PRINTING_QUALITY: "Printing & Quality",
  PRINTING: "Printing & Quality",
  DISTRIBUTION_AVAILABILITY: "Distribution & Availability",
  DISTRIBUTION: "Distribution & Availability",
  BOOK_STATUS_PRODUCTION: "Book Status & Production Updates",
  BOOK_STATUS: "Book Status & Production Updates",
  GENERAL_INQUIRY: "General Inquiry",
  GENERAL: "General Inquiry",
};

function getCategoryLabel(category) {
  if (!category) return "Not classified";

  const key = String(category)
    .trim()
    .toUpperCase()
    .replace(/[\s&-]+/g, "_");

  return API_CATEGORY_LABELS[key] || category;
}

function getApiCategory(category) {
  const key = String(category || "GENERAL_INQUIRY")
    .trim()
    .toUpperCase()
    .replace(/[\s&-]+/g, "_");

  const aliases = {
    ROYALTY: "ROYALTY_PAYMENTS",
    ISBN_METADATA: "ISBN_METADATA_ISSUES",
    PRINTING: "PRINTING_QUALITY",
    DISTRIBUTION: "DISTRIBUTION_AVAILABILITY",
    BOOK_STATUS: "BOOK_STATUS_PRODUCTION",
    GENERAL: "GENERAL_INQUIRY",
  };

  return aliases[key] || key;
}

function getSavedSession() {
  try {
    const saved = localStorage.getItem("bookleaf_session");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function SupportPortal({ onBack, session: propSession }) {
  const [savedSession] = useState(getSavedSession);
  const session = propSession || savedSession;

  const [tickets, setTickets] = useState([]);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [responses, setResponses] = useState({});
  const [notes, setNotes] = useState({});
  const [priorityDrafts, setPriorityDrafts] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [analysisResults, setAnalysisResults] = useState({});
  const [aiLoading, setAiLoading] = useState({});

  const isAdmin = session?.role === "ADMIN";
  const isAuthor = session?.role === "AUTHOR";

  const loadTickets = useCallback(async () => {
    if (!session?.token) {
      setError("Your session is missing. Please log in again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = isAdmin
        ? await getAdminTickets(session.token)
        : await getAuthorTickets(session.token);

      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load tickets. Please check your login and try again."
      );
    } finally {
      setLoading(false);
    }
  }, [session, isAdmin]);

  useEffect(() => {
    if (session?.token) {
      loadTickets();
    }
  }, [session?.token, session?.role, loadTickets]);

  const handleCreateTicket = async (event) => {
    event.preventDefault();

    if (!session?.token) {
      setError("Your session has expired. Please log in again.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      await createAuthorTicket(session.token, {
        subject: subject.trim(),
        description: description.trim(),
      });

      setSubject("");
      setDescription("");
      setMessage("Your support ticket was submitted successfully.");

      await loadTickets();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to create the ticket."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (ticketId, status) => {
    setError("");
    setMessage("");

    try {
      await updateTicketStatus(session.token, ticketId, status);
      setMessage(`Ticket #${ticketId} status updated.`);
      await loadTickets();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update ticket status."
      );
    }
  };

  // Admin can manually change a ticket's priority.
  const handleSavePriority = async (ticket) => {
    const priority =
      priorityDrafts[ticket.id] ?? ticket.priority ?? "MEDIUM";

    const allowedPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

    if (!allowedPriorities.includes(priority)) {
      setError("Please select a valid ticket priority.");
      return;
    }

    setError("");
    setMessage("");

    setAiLoading((previous) => ({
      ...previous,
      [ticket.id]: "priority",
    }));

    try {
      // The existing backend endpoint requires both category and priority.
      await updateTicketClassification(
        session.token,
        ticket.id,
        getApiCategory(ticket.category),
        priority
      );

      setPriorityDrafts((previous) => ({
        ...previous,
        [ticket.id]: priority,
      }));

      setMessage(
        `Priority updated to ${priority} for ticket #${ticket.id}.`
      );

      await loadTickets();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update ticket priority."
      );
    } finally {
      setAiLoading((previous) => ({
        ...previous,
        [ticket.id]: null,
      }));
    }
  };

  const handleSaveResponse = async (ticketId) => {
    const responseText = responses[ticketId]?.trim();

    if (!responseText) {
      setError("Please enter a response before saving.");
      return;
    }

    setError("");
    setMessage("");

    try {
      await updateTicketResponse(
        session.token,
        ticketId,
        responseText
      );

      setMessage(`Response saved for ticket #${ticketId}.`);
      await loadTickets();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save the response."
      );
    }
  };

  const handleSaveNotes = async (ticketId) => {
    const internalNotes = notes[ticketId]?.trim();

    if (!internalNotes) {
      setError("Please enter internal notes before saving.");
      return;
    }

    setError("");
    setMessage("");

    try {
      await updateInternalNotes(
        session.token,
        ticketId,
        internalNotes
      );

      setMessage(`Internal notes saved for ticket #${ticketId}.`);
      await loadTickets();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save internal notes."
      );
    }
  };

  const handleAnalyzeTicket = async (ticketId) => {
    setError("");
    setMessage("");

    setAiLoading((previous) => ({
      ...previous,
      [ticketId]: "analyze",
    }));

    try {
      const result = await analyzeTicket(session.token, ticketId);

      setAnalysisResults((previous) => ({
        ...previous,
        [ticketId]: {
          ...previous[ticketId],
          analysis: result,
        },
      }));

      setMessage(`Ticket #${ticketId} analyzed successfully.`);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          `Unable to analyze ticket #${ticketId}.`
      );
    } finally {
      setAiLoading((previous) => ({
        ...previous,
        [ticketId]: null,
      }));
    }
  };

  const handleApplyClassification = async (ticketId) => {
    const analysis = analysisResults[ticketId]?.analysis;

    if (!analysis?.category || !analysis?.priority) {
      setError("Analyze the ticket first.");
      return;
    }

    setError("");
    setMessage("");

    setAiLoading((previous) => ({
      ...previous,
      [ticketId]: "classification",
    }));

    try {
      await updateTicketClassification(
        session.token,
        ticketId,
        getApiCategory(analysis.category),
        analysis.priority
      );

      setMessage(`Classification saved for ticket #${ticketId}.`);

      await loadTickets();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save ticket classification."
      );
    } finally {
      setAiLoading((previous) => ({
        ...previous,
        [ticketId]: null,
      }));
    }
  };

  const handleDraftResponse = async (ticketId) => {
    setError("");
    setMessage("");

    setAiLoading((previous) => ({
      ...previous,
      [ticketId]: "draft",
    }));

    try {
      const result = await draftTicketResponse(
        session.token,
        ticketId
      );

      if (!result.draft?.trim()) {
        throw new Error(
          "The response draft was empty. Please try again."
        );
      }

      setResponses((previous) => ({
        ...previous,
        [ticketId]: result.draft,
      }));

      setAnalysisResults((previous) => ({
        ...previous,
        [ticketId]: {
          ...previous[ticketId],
          draft: result,
        },
      }));

      setMessage(
        `Draft generated for ticket #${ticketId}. Review it before saving.`
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to generate a response draft."
      );
    } finally {
      setAiLoading((previous) => ({
        ...previous,
        [ticketId]: null,
      }));
    }
  };

  if (!session) {
    return (
      <main className="support-portal">
        <header className="support-header">
          <div>
            <p className="support-eyebrow">BOOKLEAF SUPPORT</p>
            <h1>Author Support Portal</h1>
            <p>Manage support requests and responses.</p>
          </div>

          <button
            type="button"
            className="support-secondary-button"
            onClick={onBack}
          >
            Back to dashboard
          </button>
        </header>

        <section className="support-panel">
          <h2>Session not found</h2>
          <p>
            Please log in through the main BookLeaf dashboard and open
            Support Portal again.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="support-portal">
      <header className="support-header">
        <div>
          <p className="support-eyebrow">BOOKLEAF SUPPORT</p>
          <h1>Author Support Portal</h1>
          <p>
            Submit queries, track tickets, and manage support responses.
          </p>
        </div>

        <button
          type="button"
          className="support-secondary-button"
          onClick={onBack}
        >
          Back to dashboard
        </button>
      </header>

      {message && (
        <div className="support-success" role="status">
          {message}
        </div>
      )}

      {error && (
        <div className="support-error" role="alert">
          {error}
        </div>
      )}

      <section className="support-session-bar">
        <div>
          <span className="support-role">{session.role}</span>
          <strong>{session.email}</strong>
        </div>
      </section>

      {isAuthor && (
        <section className="support-panel">
          <h2>Submit a support ticket</h2>
          <p>Tell us what you need help with.</p>

          <form onSubmit={handleCreateTicket} className="support-form">
            <label htmlFor="ticket-subject">Subject</label>
            <input
              id="ticket-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={200}
              placeholder="e.g. Royalty payment query"
              required
            />

            <label htmlFor="ticket-description">Description</label>
            <textarea
              id="ticket-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={3000}
              rows={4}
              placeholder="Explain how we can help..."
              required
            />

            <button
              type="submit"
              className="support-primary-button"
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit ticket"}
            </button>
          </form>
        </section>
      )}

      <section className="support-ticket-section">
        <div className="support-section-heading">
          <div>
            <p className="support-eyebrow">
              {isAdmin ? "ADMIN WORKSPACE" : "YOUR REQUESTS"}
            </p>
            <h2>{isAdmin ? "All support tickets" : "My tickets"}</h2>
          </div>

          <button
            type="button"
            className="support-secondary-button"
            onClick={loadTickets}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {loading && tickets.length === 0 ? (
          <section className="support-panel">
            <p>Loading support tickets...</p>
          </section>
        ) : tickets.length === 0 ? (
          <section className="support-panel">
            <h3>No tickets found</h3>
            <p>
              {isAdmin
                ? "There are no support tickets to review yet."
                : "You have not submitted any support tickets yet."}
            </p>
          </section>
        ) : (
          <div className="support-ticket-list">
            {tickets.map((ticket) => (
              <article className="support-panel" key={ticket.id}>
                <div className="support-ticket-heading">
                  <div>
                    <span className="support-ticket-id">
                      Ticket #{ticket.id}
                    </span>
                    <h3>{ticket.subject}</h3>
                  </div>

                  <span
                    className={`support-status status-${String(
                      ticket.status || "open"
                    ).toLowerCase()}`}
                  >
                    {ticket.status || "OPEN"}
                  </span>
                </div>

                <p className="support-ticket-description">
                  {ticket.description}
                </p>

                <div className="support-ticket-meta">
                  <span>
                    Category: {getCategoryLabel(ticket.category)}
                  </span>

                  <span>
                    Priority: {ticket.priority || "Not assigned"}
                  </span>

                  {isAdmin && (
                    <span>
                      Author: {ticket.authorEmail || "Unavailable"}
                    </span>
                  )}
                </div>

                {isAdmin && (
                  <div className="support-admin-controls">
                    <div className="support-ai-controls">
                      <h4>AI Support Assistant</h4>

                      <div className="support-ai-buttons">
                        <button
                          type="button"
                          className="support-secondary-button"
                          onClick={() => handleAnalyzeTicket(ticket.id)}
                          disabled={Boolean(aiLoading[ticket.id])}
                        >
                          {aiLoading[ticket.id] === "analyze"
                            ? "Analyzing..."
                            : "Analyze Ticket"}
                        </button>

                        <button
                          type="button"
                          className="support-primary-button"
                          onClick={() => handleDraftResponse(ticket.id)}
                          disabled={Boolean(aiLoading[ticket.id])}
                        >
                          {aiLoading[ticket.id] === "draft"
                            ? "Generating..."
                            : "Generate Response Draft"}
                        </button>
                      </div>

                      {analysisResults[ticket.id]?.analysis && (
                        <>
                          <div className="support-ai-result">
                            <strong>Ticket Analysis</strong>

                            <p>
                              Suggested category:{" "}
                              {getCategoryLabel(
                                analysisResults[ticket.id].analysis.category
                              )}
                            </p>

                            <p>
                              Suggested priority:{" "}
                              {analysisResults[ticket.id].analysis.priority}
                            </p>

                            <p>
                              Source:{" "}
                              {analysisResults[ticket.id].analysis.source ||
                                "Not specified"}
                            </p>

                            {analysisResults[ticket.id].analysis.notice && (
                              <p>
                                {analysisResults[ticket.id].analysis.notice}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            className="support-primary-button"
                            onClick={() =>
                              handleApplyClassification(ticket.id)
                            }
                            disabled={Boolean(aiLoading[ticket.id])}
                          >
                            {aiLoading[ticket.id] === "classification"
                              ? "Applying..."
                              : "Apply Classification"}
                          </button>
                        </>
                      )}

                      {analysisResults[ticket.id]?.draft && (
                        <div className="support-ai-result">
                          <strong>Response Draft Generated</strong>

                          <p>
                            Source:{" "}
                            {analysisResults[ticket.id].draft.source ||
                              "Not specified"}
                          </p>

                          {analysisResults[ticket.id].draft.notice && (
                            <p>
                              {analysisResults[ticket.id].draft.notice}
                            </p>
                          )}

                          <p>
                            Review the Public response field below before
                            saving.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Manual priority controls */}
                    <label htmlFor={`priority-${ticket.id}`}>
                      Ticket priority
                    </label>

                    <div className="support-priority-controls">
                      <select
                        id={`priority-${ticket.id}`}
                        value={
                          priorityDrafts[ticket.id] ??
                          ticket.priority ??
                          "MEDIUM"
                        }
                        onChange={(event) =>
                          setPriorityDrafts((previous) => ({
                            ...previous,
                            [ticket.id]: event.target.value,
                          }))
                        }
                      >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="CRITICAL">CRITICAL</option>
                      </select>

                      <button
                        type="button"
                        className="support-primary-button"
                        onClick={() => handleSavePriority(ticket)}
                        disabled={Boolean(aiLoading[ticket.id])}
                      >
                        {aiLoading[ticket.id] === "priority"
                          ? "Saving priority..."
                          : "Update Priority"}
                      </button>
                    </div>

                    <label htmlFor={`status-${ticket.id}`}>
                      Ticket status
                    </label>

                    <select
                      id={`status-${ticket.id}`}
                      value={ticket.status || "OPEN"}
                      onChange={(event) =>
                        handleStatusChange(ticket.id, event.target.value)
                      }
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>

                    <label htmlFor={`response-${ticket.id}`}>
                      Public response
                    </label>

                    <textarea
                      id={`response-${ticket.id}`}
                      rows={3}
                      value={
                        responses[ticket.id] ?? ticket.adminResponse ?? ""
                      }
                      onChange={(event) =>
                        setResponses((previous) => ({
                          ...previous,
                          [ticket.id]: event.target.value,
                        }))
                      }
                      placeholder="Write a response visible to the author..."
                    />

                    <button
                      type="button"
                      className="support-primary-button"
                      onClick={() => handleSaveResponse(ticket.id)}
                    >
                      Save response
                    </button>

                    <label htmlFor={`notes-${ticket.id}`}>
                      Internal notes (admin only)
                    </label>

                    <textarea
                      id={`notes-${ticket.id}`}
                      rows={3}
                      value={
                        notes[ticket.id] ?? ticket.internalNotes ?? ""
                      }
                      onChange={(event) =>
                        setNotes((previous) => ({
                          ...previous,
                          [ticket.id]: event.target.value,
                        }))
                      }
                      placeholder="Private notes for the support team..."
                    />

                    <button
                      type="button"
                      className="support-secondary-button"
                      onClick={() => handleSaveNotes(ticket.id)}
                    >
                      Save internal notes
                    </button>
                  </div>
                )}

                {ticket.adminResponse && (
                  <div className="support-public-response">
                    <strong>BookLeaf Support response</strong>
                    <p>{ticket.adminResponse}</p>
                  </div>
                )}

                <p className="support-ticket-date">
                  Last updated:{" "}
                  {ticket.updatedAt
                    ? new Date(ticket.updatedAt).toLocaleString()
                    : "Not available"}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default SupportPortal;