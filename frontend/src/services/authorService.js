
import axios from "axios";

const API_URL = "https://bookleaf-portal-lfvr.onrender.com/api/authors";

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
