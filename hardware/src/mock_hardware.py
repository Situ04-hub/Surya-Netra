import time
import requests
import random

BACKEND_URL = "http://127.0.0.1:8000"

BUFFER_SIZE = 15
field_buffer = [0.0] * BUFFER_SIZE
buffer_index = 0
readings_count = 0

noaa_warning_confirmed = False
warning_start_time = 0
WARNING_TIMEOUT = 60.0  # 60 seconds alert window

in_danger_state = False
flare_gone_start_time = 0
RECOVERY_DELAY = 7.0  # 7 seconds recovery delay
counting_recovery = False

def check_noaa_server():
    global noaa_warning_confirmed, warning_start_time, field_buffer, buffer_index, readings_count
    try:
        res = requests.get(f"{BACKEND_URL}/api/noaa-status", timeout=1.0)
        if res.status_code == 200:
            is_active = res.json().get("noaa_alert_active", False)
            if is_active and not noaa_warning_confirmed:
                noaa_warning_confirmed = True
                warning_start_time = time.time()
                field_buffer = [0.0] * BUFFER_SIZE
                buffer_index = 0
                readings_count = 0
                print("\n[MOCK ESP8266] >>> NOAA ALERT DETECTED! System ARMED (Fast polling 500ms) <<<")
            elif not is_active and noaa_warning_confirmed:
                reset_to_safe()
    except Exception as e:
        print(f"[MOCK ESP8266] Backend check error: {e}")

def post_telemetry(state: str, field_val: float, mode: str):
    payload = {
        "device_id": "node_proto_01",
        "system_state": state,
        "magnetic_field": round(field_val, 2),
        "magnetic_field_x": round(field_val * 0.45, 2),
        "magnetic_field_y": round(field_val * -0.4, 2),
        "magnetic_field_z": round(field_val * 0.78, 2),
        "polling_mode": mode
    }
    try:
        requests.post(f"{BACKEND_URL}/api/telemetry", json=payload, timeout=1.0)
    except Exception as e:
        print(f"[MOCK ESP8266] Failed to post telemetry: {e}")

def reset_to_safe():
    global noaa_warning_confirmed, in_danger_state, counting_recovery, field_buffer, buffer_index, readings_count
    noaa_warning_confirmed = False
    in_danger_state = False
    counting_recovery = False
    field_buffer = [0.0] * BUFFER_SIZE
    buffer_index = 0
    readings_count = 0
    print("\n[MOCK ESP8266] >>> System Reset to SAFE / IDLE mode (2s interval) <<<")

def run_simulation():
    global buffer_index, readings_count, in_danger_state, counting_recovery, flare_gone_start_time
    print("==================================================")
    print(" SURYA-NETRA Hardware Node Mock Simulator Running ")
    print("==================================================")
    
    while True:
        check_noaa_server()

        # STATE 1: SAFE / IDLE MODE
        if not noaa_warning_confirmed:
            total_field = round(random.uniform(3.8, 4.3), 2)
            print(f"[SAFE HEARTBEAT - 2s] Field: {total_field} uT | Polling NOAA...")
            post_telemetry("SAFE", total_field, "IDLE_2S")
            time.sleep(2.0)

        # STATE 2: ARMED / ALERT / DANGER MODE
        else:
            if (time.time() - warning_start_time) > WARNING_TIMEOUT:
                print("\n[MOCK ESP8266] 1-Minute Alert Window Expired. Reverting.")
                reset_to_safe()
                continue

            # Injects simulated spike 5 to 15 seconds after arming
            elapsed_armed = time.time() - warning_start_time
            if 5.0 <= elapsed_armed <= 15.0:
                total_field = round(random.uniform(7.8, 9.5), 2)  # Spike > 7.0
            else:
                total_field = round(random.uniform(3.8, 4.3), 2)

            field_buffer[buffer_index] = total_field
            buffer_index = (buffer_index + 1) % BUFFER_SIZE
            if readings_count < BUFFER_SIZE:
                readings_count += 1

            avg_field = sum(field_buffer[:readings_count]) / readings_count
            current_state = "ARMED_WARNING"

            if readings_count >= BUFFER_SIZE:
                if avg_field > 7.0:
                    in_danger_state = True
                    counting_recovery = False
                    current_state = "DANGER_SHUTDOWN"
                    print(f"[FAST POLL - 500ms] Field: {total_field} | Avg: {round(avg_field, 2)} -> [DANGER / SHUTDOWN]")
                else:
                    if in_danger_state:
                        current_state = "RECOVERY"
                        if not counting_recovery:
                            counting_recovery = True
                            flare_gone_start_time = time.time()
                            print(f"[FAST POLL - 500ms] Spike subsided. Starting 7s Recovery Countdown...")
                        else:
                            rem = RECOVERY_DELAY - (time.time() - flare_gone_start_time)
                            if rem <= 0:
                                print("[MOCK ESP8266] Auto-recovery complete.")
                                reset_to_safe()
                                continue
                            else:
                                print(f"[FAST POLL - 500ms] Recovery Countdown: {round(rem, 1)}s remaining...")
                    else:
                        print(f"[FAST POLL - 500ms] Field: {total_field} | Avg: {round(avg_field, 2)} -> [ARMED WAITING]")
            else:
                print(f"[FAST POLL - 500ms] Buffering readings ({readings_count}/{BUFFER_SIZE})...")

            post_telemetry(current_state, total_field, "FAST_500MS")
            time.sleep(0.5)

if __name__ == "__main__":
    run_simulation()