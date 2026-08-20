import { motion } from "framer-motion";

export default function GlassPanel({ children, className = "", glow }) {
  const glowClass = glow ? `glow-${glow}` : "";
  return (
    <motion.section
      className={`glass-panel ${glowClass} ${className}`.trim()}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      {children}
    </motion.section>
  );
}
