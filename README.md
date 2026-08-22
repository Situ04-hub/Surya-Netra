
# Surya-Netra

Surya-Netra: Predict in Space, Confirm on Earth. An end-to-end, low-cost early warning system bridging orbital solar telemetry with localized hardware-level geomagnetic validation.

## Run locally

Start the backend from the repository root:

```powershell/Gitbash
cd Surya-Netra-main/backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

In a second terminal, start the frontend:

```powershell
cd Surya-Netra-main/frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal. The frontend defaults to `http://127.0.0.1:8000` for REST calls and `ws://127.0.0.1:8000/ws/telemetry` for live updates. Override these with `VITE_API_BASE_URL` and `VITE_WS_URL` when running against another backend.

The optional hardware simulator can be started after the backend is running:

```powershell
cd hardware/src
python mock_hardware.py
```
