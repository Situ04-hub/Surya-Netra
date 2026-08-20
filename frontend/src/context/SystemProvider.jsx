import { useEffect, useMemo, useReducer, useState } from "react";
import { SystemContext } from "./SystemContext";
import { mockData } from "../data/mockData";
import { TelemetrySocket } from "../services/websocket";
import {
  deriveOperationalState,
  OPERATIONAL_STATES,
} from "../utils/operationalState";

function deriveFlowStage(groundValidation) {
  const status = groundValidation.groundValidationStatus;
  if (status === "CONFIRMED") return "confirm";
  if (status === "VALIDATING") return "validate";
  return "predict";
}

function operationalReducer(state, action) {
  if (action.type !== "UPDATE") return state;

  const result = deriveOperationalState({
    spacePrediction: action.spacePrediction,
    groundValidation: action.groundValidation,
    previousOperationalState: state.previousState,
    currentTime: action.currentTime,
    dangerEnteredAt: state.dangerEnteredAt,
  });

  return {
    previousState: result.operationalState,
    dangerEnteredAt: result.operationalStateMeta.dangerEnteredAt || null,
    operationalState: result.operationalState,
    operationalStateMeta: result.operationalStateMeta,
  };
}

const INITIAL_OP_STATE = {
  previousState: OPERATIONAL_STATES.SAFE,
  dangerEnteredAt: null,
  operationalState: OPERATIONAL_STATES.SAFE,
  operationalStateMeta: null,
};

export function SystemProvider({ children }) {
  const [data, setData] = useState(mockData);
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    const socket = new TelemetrySocket();

    const unsubscribe = socket.subscribe((msg) => {
      if (msg.type === "connection") {
        const connected = msg.status === "CONNECTED";
        setSocketConnected(connected);
        setData((prevData) => ({
          ...prevData,
          systemStatus: {
            ...prevData.systemStatus,
            websocketConnectionStatus: connected ? "CONNECTED" : "DISCONNECTED",
            backendConnectionStatus: connected ? "ONLINE" : "OFFLINE",
            lastUpdated: new Date().toISOString(),
          },
        }));
      } else if (msg.type === "telemetry") {
        const payload = msg.payload;

        if (payload.event_type === "INITIAL_SNAPSHOT" || payload.event_type === "TELEMETRY_STREAM" || payload.event_type === "SPACE_CONTEXT_CHANGE") {
            setData((prevData) => {
                const nextData = { ...prevData };
                
                let telemetry = null;
                let context = null;

                if (payload.event_type === "INITIAL_SNAPSHOT") {
                    telemetry = payload.snapshot.last_telemetry;
                    context = payload.snapshot;
                } else if (payload.event_type === "TELEMETRY_STREAM") {
                    telemetry = payload.telemetry;
                    context = payload.space_context;
                } else if (payload.event_type === "SPACE_CONTEXT_CHANGE") {
                    context = payload.space_context;
                }

                if (context) {
                    nextData.demoMode = context.demo_mode;
                    nextData.spacePrediction = {
                        ...nextData.spacePrediction,
                        flareClass: context.flare_class || "NORMAL",
                        predictionProbability: (context.prediction_prob || 20) / 100,
                        predictionStatus: context.noaa_alert_active ? "WARNING" : "NOMINAL"
                    };
                    nextData.solarTelemetry = {
                        ...nextData.solarTelemetry,
                        fluxClass: context.flare_class || "NORMAL",
                    };
                    if (context.xray_flux !== undefined) {
                        nextData.solarTelemetry.xrayFlux = context.xray_flux * 1e6;
                        nextData.solarTelemetry.timestamp = context.noaa_time_tag || new Date().toISOString();
                        
                        const newSolarPoint = {
                            timestamp: context.noaa_time_tag || new Date().toISOString(),
                            xrayFlux: context.xray_flux * 1e6,
                        };
                        nextData.solarFluxSeries = [...nextData.solarFluxSeries.slice(-14), newSolarPoint];
                    }
                    
                    if (context.noaa_satellite) {
                        nextData.systemStatus = {
                            ...nextData.systemStatus,
                            noaaSatellite: context.noaa_satellite,
                            noaaTimeTag: context.noaa_time_tag,
                            noaaConnectionStatus: "ONLINE"
                        };
                    }

                    nextData.groundValidation = {
                        ...nextData.groundValidation,
                        magneticBaseline: context.danger_threshold || 7.0,
                    };
                }

                if (telemetry) {
                    const dev = telemetry.magnetic_field - nextData.groundValidation.magneticBaseline;
                    let groundStatus = "BASELINE";
                    if (telemetry.system_state === "DANGER_SHUTDOWN") groundStatus = "CONFIRMED";
                    else if (telemetry.system_state === "ARMED_WARNING") groundStatus = "VALIDATING";

                    nextData.groundValidation = {
                        ...nextData.groundValidation,
                        magneticFieldMagnitude: telemetry.magnetic_field,
                        magneticFieldX: telemetry.magnetic_field_x !== undefined ? telemetry.magnetic_field_x : nextData.groundValidation.magneticFieldX,
                        magneticFieldY: telemetry.magnetic_field_y !== undefined ? telemetry.magnetic_field_y : nextData.groundValidation.magneticFieldY,
                        magneticFieldZ: telemetry.magnetic_field_z !== undefined ? telemetry.magnetic_field_z : nextData.groundValidation.magneticFieldZ,
                        magneticDeviation: dev,
                        groundStationId: telemetry.device_id,
                        groundValidationStatus: groundStatus,
                        groundStationStatus: "ONLINE",
                        groundValidationTimestamp: telemetry.timestamp || new Date().toISOString()
                    };

                    const newMagPoint = { 
                        timestamp: telemetry.timestamp || new Date().toISOString(), 
                        magneticFieldMagnitude: telemetry.magnetic_field 
                    };
                    nextData.magneticSeries = [...nextData.magneticSeries.slice(-14), newMagPoint];
                    nextData.magneticTelemetry = {
                         ...nextData.magneticTelemetry,
                         magneticFieldMagnitude: telemetry.magnetic_field,
                         timestamp: telemetry.timestamp || new Date().toISOString(),
                    };
                }

                // systemStatus is preserved from previous state, 
                // we should update it only when a connection event is received, not here!
                return nextData;
            });
        }
      }
    });

    socket.connect();
    return () => {
      unsubscribe();
      socket.disconnect();
    };
  }, []);

  const flowStage = useMemo(() => deriveFlowStage(data.groundValidation), [data]);

  const [opState, dispatchOp] = useReducer(operationalReducer, INITIAL_OP_STATE);

  useEffect(() => {
    dispatchOp({
      type: "UPDATE",
      spacePrediction: data.spacePrediction,
      groundValidation: data.groundValidation,
      currentTime: Date.now(),
    });
  }, [data]);

  const { operationalState, operationalStateMeta } = opState;

  const value = useMemo(
    () => ({
      ...data,
      flowStage,
      operationalState,
      operationalStateMeta,
    }),
    [data, flowStage, operationalState, operationalStateMeta]
  );

  return <SystemContext.Provider value={value}>{children}</SystemContext.Provider>;
}
