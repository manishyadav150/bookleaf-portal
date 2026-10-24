
package com.bookleaf.backend;

import com.bookleaf.backend.repository.AuthorRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Configuration
public class DataLoader {

    @Bean
    CommandLineRunner loadData(AuthorRepository authorRepository) {

        ObjectMapper objectMapper = new ObjectMapper();

        return args -> {

            if (authorRepository.count() > 0) {
                System.out.println(
                        "Author data already exists. Skipping import."
                );
                return;
            }

            Path filePath = Path.of(
                    "..", "data", "bookleaf_sample_data.json"
            );

            if (!filePath.toFile().exists()) {
                throw new IllegalStateException(
                        "Dataset file not found: "
                                + filePath.toAbsolutePath()
                );
            }

            JsonNode root = objectMapper.readTree(filePath.toFile());
            JsonNode authorsNode = root.path("authors");

            List<Author> authors = new ArrayList<>();

            for (JsonNode authorNode : authorsNode) {

                Author author = new Author();
                author.setAuthorId(authorNode.path("author_id").asText());
                author.setName(authorNode.path("name").asText());
                author.setEmail(authorNode.path("email").asText());
                author.setPhone(authorNode.path("phone").asText());
                author.setCity(authorNode.path("city").asText());

                author.setJoinedDate(
                        parseDate(authorNode.get("joined_date"))
                );

                for (JsonNode bookNode : authorNode.path("books")) {

                    Book book = new Book();

                    book.setBookId(bookNode.path("book_id").asText());
                    book.setTitle(bookNode.path("title").asText());
                    book.setIsbn(bookNode.path("isbn").asText());
                    book.setGenre(bookNode.path("genre").asText());
                    book.setStatus(bookNode.path("status").asText());

                    book.setPublicationDate(
                            parseDate(bookNode.get("publication_date"))
                    );

                    book.setMrp(parseDecimal(bookNode.get("mrp")));

                    book.setAuthorRoyaltyPerCopy(
                            parseDecimal(
                                    bookNode.get("author_royalty_per_copy")
                            )
                    );

                    book.setTotalCopiesSold(
                            bookNode.path("total_copies_sold").asInt()
                    );

                    book.setTotalRoyaltyEarned(
                            parseDecimal(
                                    bookNode.get("total_royalty_earned")
                            )
                    );

                    book.setRoyaltyPaid(
                            parseDecimal(bookNode.get("royalty_paid"))
                    );

                    book.setRoyaltyPending(
                            parseDecimal(bookNode.get("royalty_pending"))
                    );

                    book.setLastRoyaltyPayoutDate(
                            parseDate(
                                    bookNode.get("last_royalty_payout_date")
                            )
                    );

                    book.setPrintPartner(
                            parseText(bookNode.get("print_partner"))
                    );

                    List<String> platforms = new ArrayList<>();

                    for (JsonNode platform : bookNode.path("available_on")) {
                        platforms.add(platform.asText());
                    }

                    book.setAvailableOn(platforms);
                    book.setAuthor(author);
                    author.getBooks().add(book);
                }

                authors.add(author);
            }

            authorRepository.saveAll(authors);

            System.out.println(
                    "BookLeaf dataset imported: "
                            + authors.size() + " authors."
            );
        };
    }

    private static String parseText(JsonNode node) {
        return node == null || node.isNull() ? null : node.asText();
    }

    private static BigDecimal parseDecimal(JsonNode node) {
        return node == null || node.isNull()
                ? null
                : node.decimalValue();
    }

    private static LocalDate parseDate(JsonNode node) {
        return node == null || node.isNull()
                ? null
                : LocalDate.parse(node.asText());
    }
}
