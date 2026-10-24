
package com.bookleaf.backend.dto;

public class LoginResponse {

    private String message;
    private String email;
    private String role;
    private String authorId;

    public LoginResponse() {
    }

    public LoginResponse(
            String message,
            String email,
            String role,
            String authorId) {
        this.message = message;
        this.email = email;
        this.role = role;
        this.authorId = authorId;
    }

    public String getMessage() {
        return message;
    }

    public String getEmail() {
        return email;
    }

    public String getRole() {
        return role;
    }

    public String getAuthorId() {
        return authorId;
    }
}
