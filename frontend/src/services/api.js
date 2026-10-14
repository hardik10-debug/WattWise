
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

async function apiRequest(endpoint) {
  try {
    const response = await api.get(endpoint);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response
        ? `API request failed (${error.response.status})`
        : "Unable to connect to the server"
    );
  }
}

export function getProperties() {
  return apiRequest("/properties");
}

export function getMeters() {
  return apiRequest("/meters");
}

export function getBills() {
  return apiRequest("/bills");
}

export function getReadings() {
  return apiRequest("/readings");
}

export function getConsumption(meterId) {
  return apiRequest(
    `/analytics/consumption?meter_id=${encodeURIComponent(meterId)}`
  );
}

export function getReconciliation(meterId) {
  return apiRequest(
    `/analytics/reconciliation?meter_id=${encodeURIComponent(meterId)}`
  );
}
