
package com.bookleaf.backend.config;

import com.bookleaf.backend.entity.AppUser;
import com.bookleaf.backend.repository.AppUserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DemoAccountInitializer {

    @Bean
    CommandLineRunner createDemoAccounts(
            AppUserRepository repository,
            PasswordEncoder passwordEncoder,
            @Value("${bookleaf.demo.admin-email:admin@bookleaf.local}") String adminEmail,
            @Value("${bookleaf.demo.admin-password:}") String adminPassword,
            @Value("${bookleaf.demo.author-password:}") String authorPassword) {

        return args -> {
            if (adminPassword.isBlank() || authorPassword.isBlank()) {
                System.out.println(
                        "Demo accounts skipped: configure demo passwords.");
                return;
            }

            createAccount(repository, passwordEncoder,
                    adminEmail, adminPassword, "ADMIN", null);

            createAccount(repository, passwordEncoder,
                    "priya.sharma@email.com", authorPassword,
                    "AUTHOR", "AUTH001");

            createAccount(repository, passwordEncoder,
                    "rohit.kapoor@email.com", authorPassword,
                    "AUTHOR", "AUTH002");

            System.out.println("Demo account initialization completed.");
        };
    }

    private void createAccount(
            AppUserRepository repository,
            PasswordEncoder passwordEncoder,
            String email,
            String password,
            String role,
            String authorId) {

        AppUser user = repository.findByEmailIgnoreCase(email)
                .orElseGet(AppUser::new);

        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole(role);
        user.setAuthorId(authorId);

        repository.save(user);
    }
}
