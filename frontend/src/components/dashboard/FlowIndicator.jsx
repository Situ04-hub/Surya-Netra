import { Fragment } from "react";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { FLOW_STAGES, ALERT_TONES } from "../../constants";
import { useSystemData } from "../../hooks/useSystemData";

export default function FlowIndicator() {
  const { flowStage, alertConsole } = useSystemData();
  const activeIndex = FLOW_STAGES.findIndex((stage) => stage.key === flowStage);

  return (
    <motion.div
      className="glass-panel flow-indicator"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      {FLOW_STAGES.map((stage, index) => {
        const Icon = stage.icon;
        const state = index < activeIndex ? "reached" : index === activeIndex ? "active" : "pending";
        const confirmTone = ALERT_TONES[alertConsole.alertLevel] === "red" ? "critical" : "advisory";
        return (
          <Fragment key={stage.key}>
            <div
              className={`flow-stage ${stage.className} ${state} ${
                stage.key === "confirm" ? `flow-confirm-${confirmTone}` : ""
              }`}
            >
              <div className="flow-node">
                <Icon size={20} strokeWidth={1.9} />
              </div>
              <div className="flow-label">{stage.label}</div>
              <div className="flow-desc">{stage.desc}</div>
            </div>
            {index < FLOW_STAGES.length - 1 ? (
              <div className="flow-connector">
                <ChevronRight size={18} strokeWidth={2} />
              </div>
            ) : null}
          </Fragment>
        );
      })}
    </motion.div>
  );
}
