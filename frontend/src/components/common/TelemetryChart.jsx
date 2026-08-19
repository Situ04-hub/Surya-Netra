import { useId } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import ChartPlaceholder from "./ChartPlaceholder";
import { formatIso } from "../../utils/format";

export default function TelemetryChart({
  data,
  dataKey,
  color = "cyan",
  unit = "",
  label = "Value",
  height = 150,
  baseline = null,
  band = null,
}) {
  const gradientId = useId().replace(/:/g, "");
  const stroke = `var(--color-${color})`;

  if (!data || data.length === 0) {
    return <ChartPlaceholder title={label} subtitle="Awaiting data stream" height={height} />;
  }

  return (
    <div className="telemetry-chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.32} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-border-faint)" vertical={false} />
          {band && band.from !== null && band.to !== null && band.from < band.to ? (
            <ReferenceArea
              y1={band.from}
              y2={band.to}
              fill={`var(--color-${band.tone || "amber"}-soft)`}
              fillOpacity={1}
              stroke="none"
            />
          ) : null}
          <XAxis
            dataKey="timestamp"
            tickFormatter={(value) => formatIso(value).slice(11)}
            tick={{ fill: "var(--color-text-muted)", fontSize: 9, fontFamily: "var(--font-mono)" }}
            axisLine={{ stroke: "var(--color-border)" }}
            tickLine={false}
            minTickGap={48}
            dy={4}
          />
          <YAxis
            tick={{ fill: "var(--color-text-muted)", fontSize: 9, fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            width={52}
            domain={["auto", "auto"]}
            tickFormatter={(value) => Number(value).toFixed(1)}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-surface-solid)",
              border: "1px solid var(--color-border-strong)",
              borderRadius: 8,
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: "var(--color-text-primary)",
            }}
            labelStyle={{ color: "var(--color-text-muted)" }}
            labelFormatter={(value) => formatIso(value)}
            formatter={(value) => [`${Number(value).toFixed(2)}${unit ? ` ${unit}` : ""}`, label]}
          />
          {baseline !== null && baseline !== undefined ? (
            <ReferenceLine y={baseline} stroke="var(--color-text-muted)" strokeDasharray="4 4" strokeOpacity={0.5} />
          ) : null}
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={stroke}
            strokeWidth={1.7}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
