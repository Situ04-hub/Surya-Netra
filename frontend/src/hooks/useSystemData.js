import { useContext } from "react";
import { SystemContext } from "../context/SystemContext";

export function useSystemData() {
  const context = useContext(SystemContext);
  if (!context) {
    throw new Error("useSystemData must be used within a SystemProvider");
  }
  return context;
}
