/* Service layer — clean seam between UI/hooks and the backend.
   UI → hooks/state → services → backend */

export { apiClient } from "./api";
export { TelemetrySocket } from "./websocket";
