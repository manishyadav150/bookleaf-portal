
package com.bookleaf.backend;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "books")
public class Book {

    @Id
    @Column(name = "book_id")
    private String bookId;

    private String title;
    private String isbn;
    private String genre;

    @Column(name = "publication_date")
    private LocalDate publicationDate;

    private String status;
    private BigDecimal mrp;

    @Column(name = "author_royalty_per_copy")
    private BigDecimal authorRoyaltyPerCopy;

    @Column(name = "total_copies_sold")
    private Integer totalCopiesSold = 0;

    @Column(name = "total_royalty_earned")
    private BigDecimal totalRoyaltyEarned = BigDecimal.ZERO;

    @Column(name = "royalty_paid")
    private BigDecimal royaltyPaid = BigDecimal.ZERO;

    @Column(name = "royalty_pending")
    private BigDecimal royaltyPending = BigDecimal.ZERO;

    @Column(name = "last_royalty_payout_date")
    private LocalDate lastRoyaltyPayoutDate;

    @Column(name = "print_partner")
    private String printPartner;

    @ElementCollection
    @CollectionTable(
        name = "book_platforms",
        joinColumns = @JoinColumn(name = "book_id")
    )
    @Column(name = "platform")
    private List<String> availableOn = new ArrayList<>();

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    private Author author;

    public Book() {
    }

    public String getBookId() {
        return bookId;
    }

    public void setBookId(String bookId) {
        this.bookId = bookId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getIsbn() {
        return isbn;
    }

    public void setIsbn(String isbn) {
        this.isbn = isbn;
    }

    public String getGenre() {
        return genre;
    }

    public void setGenre(String genre) {
        this.genre = genre;
    }

    public LocalDate getPublicationDate() {
        return publicationDate;
    }

    public void setPublicationDate(LocalDate publicationDate) {
        this.publicationDate = publicationDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public BigDecimal getMrp() {
        return mrp;
    }

    public void setMrp(BigDecimal mrp) {
        this.mrp = mrp;
    }

    public BigDecimal getAuthorRoyaltyPerCopy() {
        return authorRoyaltyPerCopy;
    }

    public void setAuthorRoyaltyPerCopy(BigDecimal authorRoyaltyPerCopy) {
        this.authorRoyaltyPerCopy = authorRoyaltyPerCopy;
    }

    public Integer getTotalCopiesSold() {
        return totalCopiesSold;
    }

    public void setTotalCopiesSold(Integer totalCopiesSold) {
        this.totalCopiesSold = totalCopiesSold;
    }

    public BigDecimal getTotalRoyaltyEarned() {
        return totalRoyaltyEarned;
    }

    public void setTotalRoyaltyEarned(BigDecimal totalRoyaltyEarned) {
        this.totalRoyaltyEarned = totalRoyaltyEarned;
    }

    public BigDecimal getRoyaltyPaid() {
        return royaltyPaid;
    }

    public void setRoyaltyPaid(BigDecimal royaltyPaid) {
        this.royaltyPaid = royaltyPaid;
    }

    public BigDecimal getRoyaltyPending() {
        return royaltyPending;
    }

    public void setRoyaltyPending(BigDecimal royaltyPending) {
        this.royaltyPending = royaltyPending;
    }

    public LocalDate getLastRoyaltyPayoutDate() {
        return lastRoyaltyPayoutDate;
    }

    public void setLastRoyaltyPayoutDate(LocalDate lastRoyaltyPayoutDate) {
        this.lastRoyaltyPayoutDate = lastRoyaltyPayoutDate;
    }

    public String getPrintPartner() {
        return printPartner;
    }

    public void setPrintPartner(String printPartner) {
        this.printPartner = printPartner;
    }

    public List<String> getAvailableOn() {
        return availableOn;
    }

    public void setAvailableOn(List<String> availableOn) {
        this.availableOn = availableOn;
    }

    public Author getAuthor() {
        return author;
    }

    public void setAuthor(Author author) {
        this.author = author;
    }
}
