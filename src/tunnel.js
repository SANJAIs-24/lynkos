// src/tunnel.js

// 1. Environment Detection
// Checks if you are running on your local machine or a public URL (like GitHub Pages)
const isLocal = 
  window.location.hostname === "localhost" || 
  window.location.hostname === "127.0.0.1";

// 2. The Base URL
// Replace 'lynkos-server' with the subdomain you use in your npx command
export const API_BASE = isLocal 
  ? "http://localhost:5000" 
  : "https://lynkos-server.loca.lt"; 

// 3. Optional: Standard Headers
// LocalTunnel requires this specific header to skip the 'friendly reminder' page
export const API_HEADERS = {
  "Content-Type": "application/json",
  "Bypass-Tunnel-Reminder": "true"
};