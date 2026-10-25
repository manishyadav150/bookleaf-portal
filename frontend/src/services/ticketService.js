
import axios from "axios";

const API_URL = "https://bookleaf-portal-lfvr.onrender.com/api";

export const loginUser = async (email, password) => {
  const response = await axios.post(`${API_URL}/auth/login`, {
    email,
    password,
  });

  return response.data;
};

export const getAuthorTickets = async (token) => {
  const response = await axios.get(`${API_URL}/author/tickets`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return response.data;
};

export const createAuthorTicket = async (token, ticket) => {
  const response = await axios.post(
    `${API_URL}/author/tickets`,
    ticket,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.data;
};

export const getAdminTickets = async (token) => {
  const response = await axios.get(`${API_URL}/admin/tickets`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return response.data;
};

export const updateTicketStatus = async (token, ticketId, status) => {
  const response = await axios.patch(
    `${API_URL}/admin/tickets/${ticketId}/status`,
    { status },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.data;
};

export const updateTicketResponse = async (
  token,
  ticketId,
  adminResponse
) => {
  const response = await axios.patch(
    `${API_URL}/admin/tickets/${ticketId}/response`,
    { adminResponse },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.data;
};

export const updateInternalNotes = async (
  token,
  ticketId,
  internalNotes
) => {
  const response = await axios.patch(
    `${API_URL}/admin/tickets/${ticketId}/internal-notes`,
    { internalNotes },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.data;
};

export const analyzeTicket = async (token, ticketId) => {
  const response = await axios.post(
    `${API_URL}/admin/tickets/${ticketId}/analyze`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.data;
};

export const draftTicketResponse = async (token, ticketId) => {
  const response = await axios.post(
    `${API_URL}/admin/tickets/${ticketId}/draft-response`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.data;
};

export const updateTicketClassification = async (
  token,
  ticketId,
  category,
  priority
) => {
  const response = await axios.patch(
    `${API_URL}/admin/tickets/${ticketId}/classification`,
    { category, priority },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.data;
};
