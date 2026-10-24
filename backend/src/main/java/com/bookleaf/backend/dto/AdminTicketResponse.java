package com.bookleaf.backend.dto;

import com.bookleaf.backend.entity.Ticket;
import java.time.LocalDateTime;

public class AdminTicketResponse {

    private Long id;
    private String subject;
    private String description;
    private String category;
    private String priority;
    private String status;
    private String authorId;
    private String authorEmail;
    private String adminResponse;
    private String internalNotes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public AdminTicketResponse(Ticket ticket) {
        this.id = ticket.getId();
        this.subject = ticket.getSubject();
        this.description = ticket.getDescription();
        this.category = ticket.getCategory();
        this.priority = ticket.getPriority();
        this.status = ticket.getStatus();
        this.authorId = ticket.getAuthorId();
        this.authorEmail = ticket.getAuthorEmail();
        this.adminResponse = ticket.getAdminResponse();
        this.internalNotes = ticket.getInternalNotes();
        this.createdAt = ticket.getCreatedAt();
        this.updatedAt = ticket.getUpdatedAt();
    }

    public Long getId() { return id; }
    public String getSubject() { return subject; }
    public String getDescription() { return description; }
    public String getCategory() { return category; }
    public String getPriority() { return priority; }
    public String getStatus() { return status; }
    public String getAuthorId() { return authorId; }
    public String getAuthorEmail() { return authorEmail; }
    public String getAdminResponse() { return adminResponse; }
    public String getInternalNotes() { return internalNotes; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}