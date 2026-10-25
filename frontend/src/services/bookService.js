
import axios from "axios";

const API_URL = "https://bookleaf-portal-lfvr.onrender.com/api/authors";

export const getAllBooks = async (token) => {
  if (!token) {
    throw new Error("Login token is missing. Please log in again.");
  }

  const response = await axios.get(API_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const authors = response.data;

  return authors.flatMap((author) =>
    (author.books || []).map((book) => ({
      ...book,
      authorName: author.name,
      authorId: author.authorId,
    }))
  );
};
