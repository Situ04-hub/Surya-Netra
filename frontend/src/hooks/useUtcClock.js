import { useEffect, useState } from "react";
import { formatUtcClock } from "../utils/format";

export function useUtcClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return formatUtcClock(now);
}
