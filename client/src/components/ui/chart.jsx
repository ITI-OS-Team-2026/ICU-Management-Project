import { createContext, useContext, useMemo } from "react";

const ChartContext = createContext({});

/**
 * Minimal chart container that injects computed CSS variable colors
 * into a Recharts-compatible context so child charts can resolve
 * `--chart-*` and semantic color tokens at runtime.
 */
export function ChartContainer({ children, config = {} }) {
  const resolved = useMemo(() => {
    if (typeof document === "undefined") return config;
    const root = getComputedStyle(document.documentElement);
    const out = {};
    Object.entries(config).forEach(([key, meta]) => {
      const color = meta?.color
        ? root.getPropertyValue(meta.color).trim() || meta.defaultColor || "#000"
        : meta?.defaultColor || "#000";
      out[key] = { ...meta, color };
    });
    return out;
  }, [config]);

  return (
    <ChartContext.Provider value={resolved}>
      <div className="w-full h-full">{children}</div>
    </ChartContext.Provider>
  );
}

export function useChartConfig() {
  return useContext(ChartContext);
}
