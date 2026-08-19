# Surya-Netra
<<<<<<< HEAD

Surya-Netra: Predict in Space, Confirm on Earth. An early warning dashboard that combines NOAA solar telemetry with local geomagnetic validation.

## Run locally

Start the backend from the repository root:

```powershell
Push-Location backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

In a second terminal, start the frontend:

```powershell
Push-Location frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal. The frontend defaults to `http://127.0.0.1:8000` for REST calls and `ws://127.0.0.1:8000/ws/telemetry` for live updates. Override these with `VITE_API_BASE_URL` and `VITE_WS_URL` when running against another backend.

The optional hardware simulator can be started after the backend is running:

```powershell
python hardware/src/mock_hardware.py
```
=======
Surya-Netra: Predict in Space, Confirm on Earth.  An end-to-end, low-cost early warning system bridging orbital solar telemetry with localized hardware-level geomagnetic validation.
>>>>>>> 13a7ccade2979ad331e4aefc3a5c0caeb58c714e
