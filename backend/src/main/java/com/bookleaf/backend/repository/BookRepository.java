
package com.bookleaf.backend.repository;

import com.bookleaf.backend.Book;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookRepository extends JpaRepository<Book, String> {
}
