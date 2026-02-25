// src/tunnel.js
const IS_PRODUCTION = true; // Keep true so GitHub uses the URL below

// This is the direct line to your local Flask server
const PROD_URL = "http://localhost:5000"; 

export const API_BASE = PROD_URL;

export const API_HEADERS = {
  'Content-Type': 'application/json'
};