
import { useEffect, useMemo, useState } from "react";
import { getAllAuthors } from "./services/authorService";
import { getAllBooks } from "./services/bookService";
import SupportPortal from "./components/SupportPortal";
import "./App.css";

const API_URL = "http://localhost:8080/api";

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
}

function getInitials(name) {
  return (
    name
      ?.split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "AU"
  );
}

function App() {
  const [session, setSession] = useState(() => {
    try {
      const saved = localStorage.getItem("bookleaf_session");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [email, setEmail] = useState("admin@bookleaf.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [authors, setAuthors] = useState([]);
  const [books, setBooks] = useState([]);
  const [activePage, setActivePage] = useState("authors");
  const [loading, setLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState("All cities");
  const [selectedStatus, setSelectedStatus] = useState("All statuses");
  const [authorTickets, setAuthorTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  const isAdmin = session?.role === "ADMIN";
  const isAuthor = session?.role === "AUTHOR";

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoginLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Login failed. Check your credentials."
        );
      }

      if (
        !data.token ||
        (data.role !== "ADMIN" && data.role !== "AUTHOR")
      ) {
        throw new Error("Login response is missing a valid session.");
      }

      const userSession = {
        token: data.token,
        email: data.email,
        role: data.role,
        authorId: data.authorId || "",
      };

      localStorage.setItem(
        "bookleaf_session",
        JSON.stringify(userSession)
      );

      setSession(userSession);
      setPassword("");
      setError("");
      setActivePage(data.role === "AUTHOR" ? "my-books" : "authors");
    } catch (err) {
      setError(err.message || "Unable to sign in. Check the backend.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("bookleaf_session");
    setSession(null);
    setAuthors([]);
    setBooks([]);
    setAuthorTickets([]);
    setPassword("");
    setEmail("admin@bookleaf.local");
    setError("");
    setDataError("");
    setActivePage("authors");
    setSearch("");
    setSelectedCity("All cities");
    setSelectedStatus("All statuses");
  };

  useEffect(() => {
    if (!session?.token) return;

    let cancelled = false;

    async function fetchDashboardData() {
      setLoading(true);
      setDataError("");

      try {
        if (session.role === "ADMIN") {
          const [authorData, bookData] = await Promise.all([
            getAllAuthors(session.token),
            getAllBooks(session.token),
          ]);

          if (!cancelled) {
            setAuthors(authorData);
            setBooks(bookData);
          }
        } else if (session.role === "AUTHOR") {
          const response = await fetch(`${API_URL}/authors`, {
            headers: {
              Authorization: `Bearer ${session.token}`,
            },
          });

          if (!response.ok) {
            throw new Error("Could not load your author profile.");
          }

          const authorData = await response.json();

          // The API should return only this author's profile.
          const ownAuthor = Array.isArray(authorData)
            ? authorData.find(
                (author) => author.authorId === session.authorId
              )
            : authorData;

          if (
            !ownAuthor ||
            ownAuthor.authorId !== session.authorId
          ) {
            throw new Error("Your author profile was not found.");
          }

          if (!cancelled) {
            setAuthors([ownAuthor]);
            setBooks(
              (ownAuthor.books || []).map((book) => ({
                ...book,
                authorName: ownAuthor.name,
                authorId: ownAuthor.authorId,
              }))
            );
          }
        }
      } catch (err) {
        console.error("Error loading dashboard:", err);

        if (!cancelled) {
          setDataError(
            err.message ||
              "Unable to load portal data. Check the backend and login."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDashboardData();

    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (!isAuthor || activePage !== "my-tickets" || !session?.token) {
      return;
    }

    let cancelled = false;

    async function fetchTickets() {
      setTicketsLoading(true);

      try {
        const response = await fetch(`${API_URL}/author/tickets`, {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Unable to load your support tickets.");
        }

        const data = await response.json();

        if (!cancelled) {
          setAuthorTickets(Array.isArray(data) ? data : []);
          setDataError("");
        }
      } catch (err) {
        if (!cancelled) {
          setDataError(err.message || "Unable to load support tickets.");
        }
      } finally {
        if (!cancelled) setTicketsLoading(false);
      }
    }

    fetchTickets();

    return () => {
      cancelled = true;
    };
  }, [isAuthor, activePage, session]);

  const cities = useMemo(
    () =>
      [...new Set(authors.map((author) => author.city).filter(Boolean))].sort(),
    [authors]
  );

  const filteredAuthors = useMemo(() => {
    const query = search.trim().toLowerCase();

    return authors.filter((author) => {
      const values = [
        author.name,
        author.email,
        author.authorId,
        author.city,
      ];

      const matchesSearch = values.some((value) =>
        String(value || "").toLowerCase().includes(query)
      );

      const matchesCity =
        selectedCity === "All cities" || author.city === selectedCity;

      return matchesSearch && matchesCity;
    });
  }, [authors, search, selectedCity]);

  const filteredBooks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return books.filter((book) => {
      const values = [
        book.title,
        book.bookId,
        book.isbn,
        book.authorName,
        book.genre,
      ];

      const matchesSearch = values.some((value) =>
        String(value || "").toLowerCase().includes(query)
      );

      const matchesStatus =
        selectedStatus === "All statuses" ||
        book.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [books, search, selectedStatus]);

  const totalPending = books.reduce(
    (sum, book) => sum + (Number(book.royaltyPending) || 0),
    0
  );

  const totalEarned = books.reduce(
    (sum, book) => sum + (Number(book.totalRoyaltyEarned) || 0),
    0
  );

  const totalPaid = books.reduce(
    (sum, book) => sum + (Number(book.royaltyPaid) || 0),
    0
  );

  const totalSold = books.reduce(
    (sum, book) => sum + (Number(book.totalCopiesSold) || 0),
    0
  );

  const publishedCount = books.filter(
    (book) => book.status === "Published & Live"
  ).length;

  if (!session) {
    return (
      <main className="login-page">
        <form className="login-card" onSubmit={handleLogin}>
          <div className="login-brand">BOOKLEAF</div>
          <h1>Welcome back</h1>
          <p>Sign in to the Author Support &amp; Communication Portal.</p>

          {error && <div className="login-error">{error}</div>}

          <label htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <button type="submit" disabled={loginLoading}>
            {loginLoading ? "Signing in..." : "Sign in"}
          </button>

          <small>Use your assigned BookLeaf demo account.</small>
        </form>
      </main>
    );
  }

  if (loading) {
    return <main className="page-message">Loading BookLeaf Portal...</main>;
  }

  if (dataError) {
    return (
      <main className="page-message error-message">
        <p>{dataError}</p>
        <button onClick={() => window.location.reload()}>Try again</button>
        <button onClick={handleLogout}>Log out</button>
      </main>
    );
  }

  if (isAuthor) {
    return (
      <div className="app">
        <header className="header author-header">
          <div className="brand">
            <h1>BookLeaf</h1>
            <p>Author Workspace</p>
          </div>

          <div className="header-account">
            <span>{session.email}</span>
            <button onClick={handleLogout}>Log out</button>
          </div>
        </header>

        <div className="portal-layout">
          <aside className="sidebar">
            <p className="sidebar-label">MY WORKSPACE</p>

            <button
              className={`nav-item ${
                activePage === "my-books" ? "active" : ""
              }`}
              onClick={() => setActivePage("my-books")}
            >
              My Books
            </button>

            <button
              className={`nav-item ${
                activePage === "my-tickets" ? "active" : ""
              }`}
              onClick={() => setActivePage("my-tickets")}
            >
              My Support Tickets
            </button>

            <button
              className={`nav-item ${
                activePage === "support" ? "active" : ""
              }`}
              onClick={() => setActivePage("support")}
            >
              Support Portal
            </button>
          </aside>

          <main className="container">
            {activePage === "support" ? (
              <SupportPortal
                onBack={() => setActivePage("my-books")}
                session={session}
              />
            ) : activePage === "my-tickets" ? (
              <>
                <div className="page-heading">
                  <div>
                    <p className="eyebrow">AUTHOR SUPPORT</p>
                    <h2>My Support Tickets</h2>
                    <p className="section-description">
                      Track your requests and view responses from BookLeaf.
                    </p>
                  </div>

                  <button onClick={() => setActivePage("support")}>
                    Create a ticket
                  </button>
                </div>

                {ticketsLoading ? (
                  <p>Loading tickets...</p>
                ) : authorTickets.length === 0 ? (
                  <div className="empty-state">
                    <h3>No tickets yet</h3>
                    <p>Create a support ticket if you need help.</p>
                  </div>
                ) : (
                  <div className="author-grid">
                    {authorTickets.map((ticket) => (
                      <article className="author-card" key={ticket.id}>
                        <h3>{ticket.subject}</h3>
                        <p>{ticket.description}</p>
                        <p>
                          Status: <strong>{ticket.status}</strong>
                        </p>
                        <p>
                          Category: {ticket.category || "Not classified"}
                        </p>

                        {ticket.adminResponse && (
                          <div>
                            <strong>BookLeaf response</strong>
                            <p>{ticket.adminResponse}</p>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="page-heading">
                  <div>
                    <p className="eyebrow">AUTHOR DASHBOARD</p>
                    <h2>My Books</h2>
                    <p className="section-description">
                      View your book details, sales, and royalty information.
                    </p>
                  </div>

                  <div className="total-badge">
                    <span className="total-number">{books.length}</span>
                    <span>My books</span>
                  </div>
                </div>

                <section className="metrics-grid">
                  <article className="metric-card">
                    <span>Copies sold</span>
                    <strong>{totalSold.toLocaleString("en-IN")}</strong>
                  </article>
                  <article className="metric-card">
                    <span>Royalty earned</span>
                    <strong>{formatCurrency(totalEarned)}</strong>
                  </article>
                  <article className="metric-card">
                    <span>Royalty paid</span>
                    <strong>{formatCurrency(totalPaid)}</strong>
                  </article>
                  <article className="metric-card">
                    <span>Pending royalties</span>
                    <strong>{formatCurrency(totalPending)}</strong>
                  </article>
                </section>

                <section className="filter-panel">
                  <div className="search-box">
                    <label htmlFor="author-book-search">Search my books</label>
                    <input
                      id="author-book-search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Title, ISBN, or book ID..."
                    />
                  </div>

                  <div className="city-filter">
                    <label htmlFor="author-book-status">Status</label>
                    <select
                      id="author-book-status"
                      value={selectedStatus}
                      onChange={(event) => setSelectedStatus(event.target.value)}
                    >
                      <option>All statuses</option>
                      {[...new Set(
                        books.map((book) => book.status).filter(Boolean)
                      )]
                        .sort()
                        .map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                    </select>
                  </div>
                </section>

                <div className="book-table-wrapper">
                  <table className="book-table">
                    <thead>
                      <tr>
                        <th>Book</th>
                        <th>ISBN</th>
                        <th>Genre</th>
                        <th>Publication date</th>
                        <th>Status</th>
                        <th>MRP</th>
                        <th>Copies sold</th>
                        <th>Royalty earned</th>
                        <th>Royalty paid</th>
                        <th>Pending</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBooks.map((book) => (
                        <tr key={book.bookId}>
                          <td>
                            <strong>{book.title}</strong>
                            <div className="table-book-subtitle">
                              {book.bookId}
                            </div>
                          </td>
                          <td>{book.isbn || "—"}</td>
                          <td>{book.genre || "—"}</td>
                          <td>{book.publicationDate || "—"}</td>
                          <td>
                            <span className="status-badge">
                              {book.status || "Unknown"}
                            </span>
                          </td>
                          <td>{formatCurrency(book.mrp)}</td>
                          <td>
                            {Number(book.totalCopiesSold || 0).toLocaleString("en-IN")}
                          </td>
                          <td>{formatCurrency(book.totalRoyaltyEarned)}</td>
                          <td>{formatCurrency(book.royaltyPaid)}</td>
                          <td>{formatCurrency(book.royaltyPending)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {filteredBooks.length === 0 && (
                    <div className="empty-state">
                      <h3>No books found</h3>
                      <p>Try changing the search or status filter.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <h1>BookLeaf</h1>
          <p>Author Support &amp; Communication Portal</p>
        </div>

        <div className="header-account">
          <span>{session.email} (ADMIN)</span>
          <button onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <div className="portal-layout">
        <aside className="sidebar">
          <p className="sidebar-label">WORKSPACE</p>

          <button
            className={`nav-item ${
              activePage === "authors" ? "active" : ""
            }`}
            onClick={() => {
              setActivePage("authors");
              setSearch("");
              setSelectedCity("All cities");
            }}
          >
            Authors
          </button>

          <button
            className={`nav-item ${
              activePage === "books" ? "active" : ""
            }`}
            onClick={() => {
              setActivePage("books");
              setSearch("");
              setSelectedStatus("All statuses");
            }}
          >
            Books
          </button>

          <button
            className={`nav-item ${
              activePage === "support" ? "active" : ""
            }`}
            onClick={() => setActivePage("support")}
          >
            Support Portal
          </button>

          <div className="sidebar-note">
            <strong>Publishing operations</strong>
            <p>
              Manage author records, book information, and support requests.
            </p>
          </div>
        </aside>

        <main className="container">
          {activePage === "support" ? (
            <SupportPortal
              onBack={() => setActivePage("authors")}
              session={session}
            />
          ) : activePage === "authors" ? (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">DIRECTORY</p>
                  <h2>Authors</h2>
                  <p className="section-description">
                    View author profiles and their associated books.
                  </p>
                </div>

                <div className="total-badge">
                  <span className="total-number">{authors.length}</span>
                  <span>Total authors</span>
                </div>
              </div>

              <section className="filter-panel">
                <div className="search-box">
                  <label htmlFor="author-search">Search authors</label>
                  <input
                    id="author-search"
                    type="search"
                    placeholder="Name, email or author ID..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>

                <div className="city-filter">
                  <label htmlFor="city-filter">Filter by city</label>
                  <select
                    id="city-filter"
                    value={selectedCity}
                    onChange={(event) => setSelectedCity(event.target.value)}
                  >
                    <option>All cities</option>
                    {cities.map((city) => (
                      <option key={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <button
                  className="reset-button"
                  onClick={() => {
                    setSearch("");
                    setSelectedCity("All cities");
                  }}
                >
                  Clear filters
                </button>
              </section>

              <div className="directory-summary">
                <p className="results-summary">
                  Showing <strong>{filteredAuthors.length}</strong> of{" "}
                  {authors.length} authors
                </p>
                <span>Author directory</span>
              </div>

              <div className="book-table-wrapper">
                <table className="book-table author-directory-table">
                  <thead>
                    <tr>
                      <th>Author</th>
                      <th>Contact</th>
                      <th>City</th>
                      <th>Phone</th>
                      <th>Books</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredAuthors.map((author) => (
                      <tr key={author.authorId}>
                        <td>
                          <div className="author-table-identity">
                            <div className="author-avatar">
                              {getInitials(author.name)}
                            </div>
                            <div>
                              <strong>{author.name || "Unnamed author"}</strong>
                              <div className="table-book-subtitle">
                                {author.authorId}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td>
                          {author.email ? (
                            <a href={`mailto:${author.email}`}>
                              {author.email}
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>

                        <td>{author.city || "—"}</td>
                        <td>{author.phone || "—"}</td>

                        <td>
                          <div className="author-table-books">
                            <strong>
                              {author.books?.length ?? 0} books
                            </strong>

                            {author.books?.length ? (
                              <div className="author-table-book-list">
                                {author.books.map((book) => (
                                  <div
                                    className="author-table-book"
                                    key={book.bookId}
                                  >
                                    <span className="author-table-book-title">
                                      {book.title || book.bookId}
                                    </span>
                                    <span className="status-badge">
                                      {book.status || "Unknown"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="table-book-subtitle">
                                No books listed
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredAuthors.length === 0 && (
                  <div className="empty-state">
                    <h3>No authors found</h3>
                    <p>Try changing your search or city filter.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">CATALOGUE</p>
                  <h2>Books</h2>
                  <p className="section-description">
                    Publishing status, sales, pricing, and royalty information.
                  </p>
                </div>

                <div className="total-badge">
                  <span className="total-number">{books.length}</span>
                  <span>Total books</span>
                </div>
              </div>

              <section className="metrics-grid">
                <article className="metric-card">
                  <span>Total books</span>
                  <strong>{books.length}</strong>
                  <small>Across all authors</small>
                </article>
                <article className="metric-card">
                  <span>Published titles</span>
                  <strong>{publishedCount}</strong>
                  <small>Published &amp; live</small>
                </article>
                <article className="metric-card">
                  <span>Copies sold</span>
                  <strong>{totalSold.toLocaleString("en-IN")}</strong>
                  <small>Recorded sales</small>
                </article>
                <article className="metric-card">
                  <span>Pending royalties</span>
                  <strong>{formatCurrency(totalPending)}</strong>
                  <small>Across all books</small>
                </article>
                <article className="metric-card">
                  <span>Total royalty earned</span>
                  <strong>{formatCurrency(totalEarned)}</strong>
                  <small>Across all books</small>
                </article>
                <article className="metric-card">
                  <span>Total royalty paid</span>
                  <strong>{formatCurrency(totalPaid)}</strong>
                  <small>Recorded payments</small>
                </article>
              </section>

              <section className="filter-panel book-filters">
                <div className="search-box">
                  <label htmlFor="book-search">Search books</label>
                  <input
                    id="book-search"
                    type="search"
                    placeholder="Title, author, ISBN or book ID..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>

                <div className="city-filter">
                  <label htmlFor="book-status">Publishing status</label>
                  <select
                    id="book-status"
                    value={selectedStatus}
                    onChange={(event) => setSelectedStatus(event.target.value)}
                  >
                    <option>All statuses</option>
                    {[...new Set(books.map((book) => book.status).filter(Boolean))]
                      .sort()
                      .map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                  </select>
                </div>

                <button
                  className="reset-button"
                  onClick={() => {
                    setSearch("");
                    setSelectedStatus("All statuses");
                  }}
                >
                  Clear filters
                </button>
              </section>

              <p className="results-summary">
                Showing {filteredBooks.length} of {books.length} books
              </p>

              <div className="book-table-wrapper">
                <table className="book-table">
                  <thead>
                    <tr>
                      <th>Book</th>
                      <th>Author</th>
                      <th>ISBN</th>
                      <th>Status</th>
                      <th>Publication date</th>
                      <th>MRP</th>
                      <th>Copies sold</th>
                      <th>Royalty earned</th>
                      <th>Royalty paid</th>
                      <th>Pending royalties</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredBooks.map((book) => (
                      <tr key={book.bookId}>
                        <td>
                          <strong>{book.title}</strong>
                          <div className="table-book-subtitle">
                            {book.bookId} · {book.genre || "Genre unavailable"}
                          </div>
                        </td>
                        <td>
                          {book.authorName}
                          <div className="table-book-subtitle">
                            {book.authorId}
                          </div>
                        </td>
                        <td>{book.isbn || "—"}</td>
                        <td>
                          <span className="status-badge">
                            {book.status || "Unknown"}
                          </span>
                        </td>
                        <td>{book.publicationDate || "—"}</td>
                        <td>{formatCurrency(book.mrp)}</td>
                        <td>
                          {Number(book.totalCopiesSold || 0).toLocaleString("en-IN")}
                        </td>
                        <td>{formatCurrency(book.totalRoyaltyEarned)}</td>
                        <td>{formatCurrency(book.royaltyPaid)}</td>
                        <td>{formatCurrency(book.royaltyPending)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredBooks.length === 0 && (
                  <div className="empty-state">
                    <h3>No books found</h3>
                    <p>Try a different search or publishing status.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
