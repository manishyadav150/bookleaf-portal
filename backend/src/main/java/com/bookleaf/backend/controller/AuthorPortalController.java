
package com.bookleaf.backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/author")
public class AuthorPortalController {

    @GetMapping("/dashboard")
    public Map<String, String> dashboard() {
        return Map.of(
                "message", "Author access successful",
                "role", "AUTHOR"
        );
    }
}
