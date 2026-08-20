from fastapi import FastAPI, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import json
import asyncio
import urllib.request
import urllib.error
import subprocess
import sys

app = FastAPI(
    title="SURYA-NETRA Central Orchestration Engine",
    description="Distributed Ground Validation Layer for Space-Weather Risk Mitigation",
    version="1.0.0"
)

# Enable CORS for frontend dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------
# 1. DATA CONTRACTS
# ----------------------------------------------------
class HardwareTelemetry(BaseModel):
    device_id: str = Field(default="node_proto_01", example="node_proto_01")
    system_state: str = Field(default="SAFE", example="SAFE")  
    magnetic_field: float = Field(default=4.12, example=4.12)
    magnetic_field_x: float = Field(default=2.0, example=2.0)
    magnetic_field_y: float = Field(default=-1.8, example=-1.8)
    magnetic_field_z: float = Field(default=3.1, example=3.1)
    polling_mode: str = Field(default="IDLE_2S", example="IDLE_2S")

class NOAAStatusResponse(BaseModel):
    noaa_alert_active: bool
    danger_threshold: float 

class SpaceSimulationRequest(BaseModel):
    active: bool
    flare_class: Optional[str] = "M-CLASS"
    probability: Optional[int] = 85

class DemoModeRequest(BaseModel):
    active: bool

class ThresholdRequest(BaseModel):
    threshold: float 

mock_process = None

# ----------------------------------------------------
# 2. IN-MEMORY STATE STORAGE
# ----------------------------------------------------
system_state_db = {
    "noaa_alert_active": False,
    "danger_threshold": 7.0, 
    "flare_class": "C-CLASS",
    "prediction_prob": 20,
    "demo_mode": False,
    "last_telemetry": {
        "device_id": "node_proto_01",
        "system_state": "SAFE",
        "magnetic_field": 0.0,
        "magnetic_field_x": 0.0,
        "magnetic_field_y": 0.0,
        "magnetic_field_z": 0.0,
        "polling_mode": "IDLE_2S",
        "timestamp": None
    }
}

active_websockets: List[WebSocket] = []

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "surya-netra-backend"}

async def poll_noaa_live():
    while True:
        try:
            req = urllib.request.Request("https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json", headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode())
                
                # Filter for the standard 0.1-0.8nm flare measurement channel
                longwave_readings = [r for r in data if r.get("energy") == "0.1-0.8nm"]
                
                if len(longwave_readings) > 0:
                    latest = longwave_readings[-1]
                    flux = latest.get("flux", 0.0)
                    time_tag = latest.get("time_tag", "")
                    satellite = latest.get("satellite", "")
                    
                    flare_class = "NORMAL"
                    if flux >= 1e-4:
                        flare_class = "X-CLASS"
                    elif flux >= 1e-5:
                        flare_class = "M-CLASS"
                    elif flux >= 1e-6:
                        flare_class = "C-CLASS"
                    
                    system_state_db["flare_class"] = flare_class
                    system_state_db["xray_flux"] = flux
                    system_state_db["noaa_time_tag"] = time_tag
                    system_state_db["noaa_satellite"] = satellite
                    
                    if flux >= 1e-5:
                        system_state_db["noaa_alert_active"] = True
                        system_state_db["prediction_prob"] = 80
                    else:
                        # Only overwrite back to False if not in a simulated active state
                        # Or if we want to just track live data strictly:
                        system_state_db["noaa_alert_active"] = False
                        system_state_db["prediction_prob"] = 20
                    
                    sync_payload = {
                        "event_type": "SPACE_CONTEXT_CHANGE",
                        "space_context": {
                            "noaa_alert_active": system_state_db["noaa_alert_active"],
                            "danger_threshold": system_state_db["danger_threshold"], 
                            "flare_class": system_state_db["flare_class"],
                            "prediction_prob": system_state_db["prediction_prob"],
                            "demo_mode": system_state_db["demo_mode"],
                            "xray_flux": flux,
                            "noaa_time_tag": time_tag,
                            "noaa_satellite": satellite
                        }
                    }
                    for ws in list(active_websockets):
                        try:
                            await ws.send_text(json.dumps(sync_payload))
                        except Exception:
                            active_websockets.remove(ws)
        except Exception as e:
            print(f"Error fetching NOAA live data: {e}")
            
        await asyncio.sleep(60)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(poll_noaa_live())

# ----------------------------------------------------
# 3. ENDPOINTS FOR HARDWARE
# ----------------------------------------------------

@app.post("/api/telemetry", status_code=status.HTTP_201_CREATED)
@app.post("/api/v1/telemetry", status_code=status.HTTP_201_CREATED)
async def receive_hardware_telemetry(payload: HardwareTelemetry):
    timestamp = datetime.now(timezone.utc).isoformat()
    
    # Debug print so you can see data arriving in your terminal!
    print(f"⚡ [HARDWARE DATA RECEIVED] State: {payload.system_state} | Field: {payload.magnetic_field}")

    system_state_db["last_telemetry"] = {
        "device_id": payload.device_id,
        "system_state": payload.system_state,
        "magnetic_field": payload.magnetic_field,
        "magnetic_field_x": payload.magnetic_field_x,
        "magnetic_field_y": payload.magnetic_field_y,
        "magnetic_field_z": payload.magnetic_field_z,
        "polling_mode": payload.polling_mode,
        "timestamp": timestamp
    }

    broadcast_payload = {
        "event_type": "TELEMETRY_STREAM",
        "telemetry": system_state_db["last_telemetry"],
        "space_context": {
            "noaa_alert_active": system_state_db["noaa_alert_active"],
            "danger_threshold": system_state_db["danger_threshold"], 
            "flare_class": system_state_db["flare_class"],
            "prediction_prob": system_state_db["prediction_prob"],
            "demo_mode": system_state_db["demo_mode"],
            "xray_flux": system_state_db.get("xray_flux", 0.0)
        }
    }
    
    for ws in list(active_websockets):
        try:
            await ws.send_text(json.dumps(broadcast_payload))
        except Exception:
            active_websockets.remove(ws)

    return {"status": "success", "processed_at": timestamp}


@app.get("/api/noaa-status", response_model=NOAAStatusResponse)
@app.get("/api/v1/status", response_model=NOAAStatusResponse)
async def get_noaa_alert_status():
    return {
        "noaa_alert_active": system_state_db["noaa_alert_active"],
        "danger_threshold": system_state_db["danger_threshold"] 
    }


# ----------------------------------------------------
# 4. FRONTEND SIMULATION & WEBSOCKET ENDPOINTS
# ----------------------------------------------------

@app.post("/api/set-threshold")
@app.post("/api/v1/set-threshold")
async def update_danger_threshold(req: ThresholdRequest):
    system_state_db["danger_threshold"] = req.threshold
    
    sync_payload = {
        "event_type": "SPACE_CONTEXT_CHANGE",
        "space_context": {
            "noaa_alert_active": system_state_db["noaa_alert_active"],
            "danger_threshold": system_state_db["danger_threshold"],
            "flare_class": system_state_db["flare_class"],
            "prediction_prob": system_state_db["prediction_prob"],
            "demo_mode": system_state_db["demo_mode"],
            "xray_flux": system_state_db.get("xray_flux", 0.0)
        }
    }
    for ws in list(active_websockets):
        try:
            await ws.send_text(json.dumps(sync_payload))
        except Exception:
            active_websockets.remove(ws)

    return {"status": "threshold_updated", "new_threshold": req.threshold}


@app.post("/api/simulation/noaa-alert")
@app.post("/api/v1/simulation/noaa-alert")
async def trigger_noaa_simulation(req: SpaceSimulationRequest):
    system_state_db["noaa_alert_active"] = req.active
    if req.active:
        system_state_db["flare_class"] = req.flare_class
        system_state_db["prediction_prob"] = req.probability
    else:
        system_state_db["flare_class"] = "C-CLASS"
        system_state_db["prediction_prob"] = 20

    sync_payload = {
        "event_type": "SPACE_CONTEXT_CHANGE",
        "space_context": {
            "noaa_alert_active": system_state_db["noaa_alert_active"],
            "danger_threshold": system_state_db["danger_threshold"], 
            "flare_class": system_state_db["flare_class"],
            "prediction_prob": system_state_db["prediction_prob"],
            "demo_mode": system_state_db["demo_mode"],
            "xray_flux": system_state_db.get("xray_flux", 0.0)
        }
    }
    for ws in list(active_websockets):
        try:
            await ws.send_text(json.dumps(sync_payload))
        except Exception:
            active_websockets.remove(ws)

    return {"status": "simulation_updated", "current_db": system_state_db}


@app.post("/api/demo-mode")
@app.post("/api/v1/demo-mode")
async def toggle_demo_mode(req: DemoModeRequest):
    system_state_db["demo_mode"] = req.active
    
    if not req.active:
        system_state_db["noaa_alert_active"] = False

    sync_payload = {
        "event_type": "SPACE_CONTEXT_CHANGE",
        "space_context": {
            "noaa_alert_active": system_state_db["noaa_alert_active"],
            "danger_threshold": system_state_db["danger_threshold"], 
            "flare_class": system_state_db["flare_class"],
            "prediction_prob": system_state_db["prediction_prob"],
            "demo_mode": system_state_db["demo_mode"],
            "xray_flux": system_state_db.get("xray_flux", 0.0)
        }
    }
    for ws in list(active_websockets):
        try:
            await ws.send_text(json.dumps(sync_payload))
        except Exception:
            active_websockets.remove(ws)

    return {"status": "success", "demo_mode": req.active}


@app.websocket("/ws/telemetry")
async def websocket_dashboard_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_websockets.append(websocket)
    try:
        await websocket.send_text(json.dumps({
            "event_type": "INITIAL_SNAPSHOT",
            "snapshot": system_state_db
        }))
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_websockets.remove(websocket)