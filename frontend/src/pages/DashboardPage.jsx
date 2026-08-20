import { motion } from "framer-motion";
import FlowIndicator from "../components/dashboard/FlowIndicator";
import SystemOverviewStrip from "../components/dashboard/SystemOverviewStrip";
import SpacePredictionPanel from "../components/dashboard/SpacePredictionPanel";
import GroundValidationPanel from "../components/dashboard/GroundValidationPanel";
import AlertConsolePanel from "../components/dashboard/AlertConsolePanel";
import LiveIndicator from "../components/common/LiveIndicator";
import OperationalStateIndicator from "../components/common/OperationalStateIndicator";
import { useSystemData } from "../hooks/useSystemData";

export default function DashboardPage() {
  const { demoMode } = useSystemData();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="page-head">
        <div>
          <h1>
            Mission <span className="title-accent">Dashboard</span>
          </h1>
          <p className="page-sub">Real-time solar prediction and ground-level geomagnetic validation</p>
        </div>
        <LiveIndicator label={demoMode ? "Replay" : "Live"} tone={demoMode ? "amber" : "green"} />
      </div>

      <SystemOverviewStrip />

      <FlowIndicator />

      <OperationalStateIndicator />

      <div className="dashboard-grid">
        <div className="dashboard-main">
          <SpacePredictionPanel />
          <GroundValidationPanel />
        </div>
        <div className="dashboard-rail">
          <AlertConsolePanel />
        </div>
      </div>
    </motion.div>
  );
}
