
package com.bookleaf.backend.controller;

import com.bookleaf.backend.dto.LoginRequest;
import com.bookleaf.backend.dto.LoginResponse;
import com.bookleaf.backend.entity.AppUser;
import com.bookleaf.backend.service.AuthService;
import com.bookleaf.backend.service.JwtService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;

    public AuthController(
            AuthService authService,
            JwtService jwtService) {
        this.authService = authService;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest request) {

        try {
            AppUser user = authService.authenticate(
                    request.getEmail(),
                    request.getPassword()
            );

            String token = jwtService.generateToken(user);

            return ResponseEntity.ok(
                    Map.of(
                            "message", "Login successful",
                            "token", token,
                            "email", user.getEmail(),
                            "role", user.getRole(),
                            "authorId",
                            user.getAuthorId() == null
                                    ? ""
                                    : user.getAuthorId()
                    )
            );

        } catch (IllegalArgumentException exception) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "message", "Invalid email or password."
                    ));
        }
    }
}
