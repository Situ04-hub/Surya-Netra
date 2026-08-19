import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SystemProvider } from "./context/SystemProvider";
import AppLayout from "./components/layout/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import TelemetryPage from "./pages/TelemetryPage";
import AlertsPage from "./pages/AlertsPage";
import SystemPage from "./pages/SystemPage";

function App() {
  return (
    <SystemProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/telemetry" element={<TelemetryPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/about" element={<SystemPage />} />
            <Route path="*" element={<DashboardPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SystemProvider>
  );
}

export default App;
