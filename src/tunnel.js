// src/tunnel.js

// 1. Environment Detection
const isLocal = 
  window.location.hostname === "localhost" || 
  window.location.hostname === "127.0.0.1";

// 2. The Base URL
export const API_BASE = isLocal 
  ? "http://localhost:5000" 
  : "https://lynkos-be-prod.loca.lt"; // <--- UPDATED THIS LINE

// 3. The Bypass Headers
export const API_HEADERS = {
  "Content-Type": "application/json",
  "Bypass-Tunnel-Reminder": "true"
};

// 4. The fetchData function
export async function fetchData(endpoint) {
    try {
        const response = await fetch(`${API_BASE}/${endpoint}`, {
            method: "GET",
            headers: API_HEADERS
        });
        return await response.json();
    } catch (error) {
        console.error("Connection failed:", error);
        throw error;
    }
}