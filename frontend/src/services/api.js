/* ============================================================
   SURYA-NETRA REST API SERVICE
   ------------------------------------------------------------
   Axios client for the future FastAPI backend.

   RULES
   - No hardcoded backend URLs. Configure via environment:
       VITE_API_BASE_URL  (e.g. http://127.0.0.1:8000)
     Falls back to a relative base so the app still boots.
   - Endpoints are intentionally NOT defined yet. Components
     must never call axios directly — route calls through
     hooks/services so the mock layer can be swapped later.
   - AbortController/signal: Axios supports `signal` natively.
     Future callers pass { signal } in the request config — no
     custom cancellation system is needed.

   ERROR NORMALIZATION
   The response interceptor rejects with a normalized error
   object so future consumers see a predictable shape:

     { status: number | null, message: string, isNetwork: boolean, original: Error }

   Callers can catch and decide how to present errors; api.js
   never displays or stores them itself.
   ============================================================ */

import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL
  || `${window.location.protocol}//${window.location.hostname}:8000`;

export const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

/* ---------------------------------------------------------------
   Response interceptor — normalizes errors so downstream code
   gets a consistent shape without Axios internals leaking.
   --------------------------------------------------------------- */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status ?? null;
    const message = error.response?.data?.detail
      || error.response?.data?.message
      || error.message
      || "Unknown error";
    const isNetwork = !error.response && Boolean(error.request);

    if (import.meta.env.DEV) {
      /* Log enough to debug — never log tokens, payloads, or
         sensitive headers. */
      console.warn(
        `[Surya-Netra API] ${isNetwork ? "network error" : `HTTP ${status}`}:`,
        message,
      );
    }

    /* Throw a plain object — easy to serialize, inspect, and
       avoids leaking Axios prototype methods into UI code. */
    const normalized = new Error(message);
    normalized.status = status;
    normalized.isNetwork = isNetwork;
    normalized.original = error;
    return Promise.reject(normalized);
  },
);

/* Endpoint helpers will be added here when the backend contract
   is finalized. Example:
   export const getSpacePrediction = (signal) =>
     apiClient.get("/api/v1/prediction/current", { signal });
*/

export default apiClient;
