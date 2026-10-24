
package com.bookleaf.backend.repository;

import com.bookleaf.backend.Author;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AuthorRepository extends JpaRepository<Author, String> {

    @Query("""
        SELECT DISTINCT a
        FROM Author a
        LEFT JOIN FETCH a.books
        WHERE a.authorId = :authorId
        """)
    Optional<Author> findByIdWithBooks(
            @Param("authorId") String authorId
    );

    @Query("""
        SELECT DISTINCT a
        FROM Author a
        LEFT JOIN FETCH a.books
        """)
    List<Author> findAllWithBooks();
}
