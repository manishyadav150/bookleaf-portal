
package com.bookleaf.backend.repository;

import com.bookleaf.backend.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TicketRepository extends JpaRepository<Ticket, Long> {

    List<Ticket> findByAuthorIdOrderByCreatedAtDesc(String authorId);

    List<Ticket> findAllByOrderByCreatedAtDesc();
}
