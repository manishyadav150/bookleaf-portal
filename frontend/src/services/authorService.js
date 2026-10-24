import axios from "axios";

const API_URL = "http://localhost:8080/api/authors";

export const getAllAuthors = async (token) => {
  if (!token) {
    throw new Error("Admin login is required to load author records.");
  }

  const response = await axios.get(API_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};