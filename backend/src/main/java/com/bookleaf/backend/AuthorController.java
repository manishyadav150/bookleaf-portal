
package com.bookleaf.backend;

import com.bookleaf.backend.entity.AppUser;
import com.bookleaf.backend.repository.AppUserRepository;
import com.bookleaf.backend.repository.AuthorRepository;

import org.hibernate.Hibernate;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/authors")
public class AuthorController {

    private final AuthorRepository authorRepository;
    private final AppUserRepository appUserRepository;

    public AuthorController(
            AuthorRepository authorRepository,
            AppUserRepository appUserRepository) {
        this.authorRepository = authorRepository;
        this.appUserRepository = appUserRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<Author> getAuthors(Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Please log in to access author records."
            );
        }

        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(authority ->
                        authority.getAuthority().equals("ROLE_ADMIN"));

        if (isAdmin) {
            List<Author> authors = authorRepository.findAllWithBooks();

            for (Author author : authors) {
                for (Book book : author.getBooks()) {
                    Hibernate.initialize(book.getAvailableOn());
                }
            }

            return authors;
        }

        boolean isAuthor = authentication.getAuthorities().stream()
                .anyMatch(authority ->
                        authority.getAuthority().equals("ROLE_AUTHOR"));

        if (!isAuthor) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You do not have permission to access author records."
            );
        }

        AppUser user = appUserRepository
                .findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Your user account could not be found."
                ));

        if (user.getAuthorId() == null || user.getAuthorId().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Your account is not linked to an author profile."
            );
        }

        Author author = authorRepository
                .findByIdWithBooks(user.getAuthorId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Your author profile could not be found."
                ));

        for (Book book : author.getBooks()) {
            Hibernate.initialize(book.getAvailableOn());
        }

        return List.of(author);
    }
}
