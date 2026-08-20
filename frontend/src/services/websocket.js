/* ============================================================
   SURYA-NETRA WEBSOCKET SERVICE
   ------------------------------------------------------------
   Real-time telemetry transport wrapper.

   RULES
   - No hardcoded URLs. Configure via environment:
       VITE_WS_URL  (e.g. ws://127.0.0.1:8000/ws/telemetry)
   - Components consume telemetry via context/hooks — the
     transport can be swapped between mock and WebSocket
     without a UI rewrite.
   - This is the INTERFACE only. The backend/hardware stream
     does not exist yet.

   HEARTBEAT LIMITATION
   Browsers do not expose WebSocket ping/pong frames to
   JavaScript. A true connection heartbeat requires backend
   cooperation (e.g. periodic JSON ping messages with a
   matching pong response). Without that protocol, we detect
   connection health via onclose/onerror callbacks, which
   the browser does fire reliably on genuine drops. If the
   backend later defines a ping/pong message contract, the
   onmessage handler below is the correct place to implement
   response logic.
   ============================================================ */

const DEFAULT_URL = import.meta.env.VITE_WS_URL
  || `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.hostname}:8000/ws/telemetry`;

/* Reconnection backoff (ms). First retry after ~1 s, then
   doubling up to MAX_DELAY. Reset after a successful open. */
const INITIAL_DELAY = 1000;
const MAX_DELAY = 30000;
const BACKOFF_FACTOR = 2;

export class TelemetrySocket {
  constructor(url = DEFAULT_URL) {
    this.url = url;
    this.socket = null;
    this.connected = false;
    this.handlers = new Set();

    /* Reconnection state. `intentional` is set by disconnect()
       so onclose does not schedule a reconnect. */
    this._intentional = false;
    this._retryDelay = 0;
    this._retryTimer = null;
    this._connecting = false;
  }

  /* --- public API ------------------------------------------------- */

  connect() {
    /* Guard: prevent duplicate sockets (e.g. React StrictMode double-mount). */
    if (this._connecting || this.connected) return;

    this._intentional = false;
    this._connecting = true;
    this._openSocket();
  }

  disconnect() {
    this._intentional = true;
    this._cancelReconnect();
    this._closeSocket();
  }

  subscribe(handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /* --- internal --------------------------------------------------- */

  _openSocket() {
    try {
      this.socket = new WebSocket(this.url);
    } catch {
      /* Invalid URL or environment issue — treat as immediate failure. */
      this._connecting = false;
      this._scheduleReconnect();
      return;
    }

    this.socket.onopen = () => {
      this.connected = true;
      this._connecting = false;
      this._retryDelay = 0; // reset backoff on successful connection
      this.emit({ type: "connection", status: "CONNECTED" });
    };

    this.socket.onmessage = (event) => {
      try {
        this.emit({ type: "telemetry", payload: JSON.parse(event.data) });
      } catch {
        /* Non-JSON payload — emit raw. The backend may later send
           domain-specific messages; routing will be added here. */
        this.emit({ type: "telemetry", payload: event.data });
      }
    };

    this.socket.onclose = () => {
      this.connected = false;
      this._connecting = false;
      this.emit({ type: "connection", status: "DISCONNECTED" });
      this._scheduleReconnect();
    };

    this.socket.onerror = (error) => {
      this.emit({ type: "error", error });
      /* onerror is always followed by onclose on the same socket,
         so reconnect is handled there. */
    };
  }

  _closeSocket() {
    if (this.socket) {
      /* Guard against close() on an already-closing socket. */
      try {
        if (this.socket.readyState === WebSocket.OPEN ||
            this.socket.readyState === WebSocket.CONNECTING) {
          this.socket.close();
        }
      } catch { /* ignore — socket is being torn down */ }
      this.socket = null;
    }
    this.connected = false;
    this._connecting = false;
  }

  /* --- reconnect -------------------------------------------------- */

  _scheduleReconnect() {
    if (this._intentional) return;

    /* Exponential backoff: 1s → 2s → 4s → … → MAX_DELAY. */
    if (this._retryDelay === 0) {
      this._retryDelay = INITIAL_DELAY;
    } else {
      this._retryDelay = Math.min(this._retryDelay * BACKOFF_FACTOR, MAX_DELAY);
    }

    this._retryTimer = setTimeout(() => {
      this._retryTimer = null;
      this._openSocket();
    }, this._retryDelay);
  }

  _cancelReconnect() {
    if (this._retryTimer) {
      clearTimeout(this._retryTimer);
      this._retryTimer = null;
    }
    this._retryDelay = 0;
  }

  /* --- event fan-out ---------------------------------------------- */

  emit(payload) {
    this.handlers.forEach((handler) => {
      try { handler(payload); } catch { /* do not let a handler crash the loop */ }
    });
  }
}

export default TelemetrySocket;
