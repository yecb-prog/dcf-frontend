"use client";
 
import { useState } from "react";
 
const API_BASE = "http://127.0.0.1:8000";
 
type DCFResult = {
  ticker: string;
  company_name: string;
  wacc: number;
  cost_of_debt_used: number;
  tax_rate: number;
  implied_price_per_share: number;
  implied_price_buyback_adjusted: number;
  buyback_rate: number;
  current_price: number;
  upside_pct: number;
  verdict: string;
  enterprise_value: number;
  equity_value: number;
  sector: string | null;
  industry: string | null;
  exchange: string | null;
  pe_ratio: number | null;
  market_cap: number | null;
  revenue_cagr: number | null;
};
 
type ImpliedGrowth = {
  implied_growth_rate: number;
  wacc_used: number;
  converged: boolean;
};
 
type SensitivityGrid = {
  wacc_labels: string[];
  terminal_growth_labels: string[];
  values: number[][];
};
 
export default function Home() {
  const [ticker, setTicker] = useState("AAPL");
  const [growthRate, setGrowthRate] = useState(0.08);
  const [terminalGrowth, setTerminalGrowth] = useState(0.025);
  const [multistage, setMultistage] = useState(false);
  const [buybackRate, setBuybackRate] = useState(0);
  const [overrideWacc, setOverrideWacc] = useState(false);
  const [waccValue, setWaccValue] = useState(0.09);
 
  const [result, setResult] = useState<DCFResult | null>(null);
  const [grid, setGrid] = useState<SensitivityGrid | null>(null);
  const [impliedGrowth, setImpliedGrowth] = useState<ImpliedGrowth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedGrid, setExpandedGrid] = useState(false);
 
  async function runValuation() {
    setLoading(true);
    setError(null);
    try {
      const body = {
        ticker,
        growth_rate: growthRate,
        terminal_growth: terminalGrowth,
        multistage,
        high_growth_years: 3,
        fade_years: 5,
        buyback_rate: buybackRate,
        wacc_override: overrideWacc ? waccValue : null,
      };
 
      const [dcfRes, sensRes, growthRes] = await Promise.all([
        fetch(`${API_BASE}/api/dcf`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
        fetch(`${API_BASE}/api/sensitivity`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticker,
            growth_rate: growthRate,
            multistage,
            high_growth_years: 3,
            fade_years: 5,
          }),
        }),
        fetch(`${API_BASE}/api/implied-growth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticker,
            terminal_growth: terminalGrowth,
            multistage,
            high_growth_years: 3,
            fade_years: 5,
            wacc_override: overrideWacc ? waccValue : null,
          }),
        }),
      ]);
 
      if (!dcfRes.ok) throw new Error((await dcfRes.json()).detail || "DCF request failed");
      if (!sensRes.ok) throw new Error((await sensRes.json()).detail || "Sensitivity request failed");
      if (!growthRes.ok) throw new Error((await growthRes.json()).detail || "Implied growth request failed");
 
      setResult(await dcfRes.json());
      setGrid(await sensRes.json());
      setImpliedGrowth(await growthRes.json());
    } catch (e: any) {
      setError(e.message || "Something went wrong");
      setResult(null);
      setGrid(null);
      setImpliedGrowth(null);
    } finally {
      setLoading(false);
    }
  }
 
  return (
    <main className="min-h-screen bg-black text-[#E8ECF3]">
      <div className="flex flex-col lg:flex-row">
        {/* --- LEFT: parameters panel --- */}
        <aside className="lg:w-[320px] lg:h-screen bg-[#1A1A1E] border-b lg:border-b-0 lg:border-r border-[#2A2A2E] px-6 py-6 lg:sticky lg:top-0 lg:overflow-y-auto space-y-5">
          <div>
            <h1 className="font-serif text-xl text-[#E8ECF3] font-semibold">💰 Intrinsic Value Desk</h1>
            <p className="mt-1 text-xs text-[#9CA3AF]">
              Pick a ticker, set your assumptions, get a DCF estimate.
            </p>
          </div>
 
          <div>
            <label className="block text-xs uppercase tracking-wide text-[#9CA3AF] mb-1">
              Ticker
            </label>
            <input
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              className="w-full bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg px-3 py-2 font-mono text-lg text-[#3B82F6] focus:outline-none focus:border-[#3B82F6]"
              placeholder="AAPL"
            />
          </div>
 
          <div>
            <SliderRow
              label="Growth rate"
              value={growthRate}
              onChange={setGrowthRate}
              min={0}
              max={0.3}
              step={0.01}
            />
            {result && result.ticker === ticker && result.revenue_cagr !== null && (
              <p className="text-[11px] text-[#9CA3AF] mt-1">
                {result.ticker}'s historical revenue CAGR: {(result.revenue_cagr * 100).toFixed(1)}% — a
                reference point, not a suggestion the slider will follow.
              </p>
            )}
          </div>
          <SliderRow
            label="Terminal growth"
            value={terminalGrowth}
            onChange={setTerminalGrowth}
            min={0.005}
            max={0.045}
            step={0.0025}
          />
          <SliderRow
            label="Buyback rate (adjusted view only)"
            value={buybackRate}
            onChange={setBuybackRate}
            min={0}
            max={0.06}
            step={0.005}
          />
 
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <label className="flex items-center gap-2 text-sm text-[#9CA3AF]">
                <input
                  type="checkbox"
                  checked={overrideWacc}
                  onChange={(e) => setOverrideWacc(e.target.checked)}
                  className="accent-[#3B82F6]"
                />
                Override auto-calculated WACC
              </label>
              <InfoTooltip text="Your WACC is auto-calculated per company using its beta, market cap, and real cost of debt (from the company's own interest expense and total debt). Real analysts refine this further — unlevering/relevering beta against comps, using actual bond yields. Override this if you have a more precise estimate of your own." />
            </div>
            {overrideWacc && (
              <SliderRow
                label="WACC (manual)"
                value={waccValue}
                onChange={setWaccValue}
                min={0.03}
                max={0.16}
                step={0.0025}
              />
            )}
          </div>
 
          <label className="flex items-center gap-2 text-sm text-[#9CA3AF]">
            <input
              type="checkbox"
              checked={multistage}
              onChange={(e) => setMultistage(e.target.checked)}
              className="accent-[#3B82F6]"
            />
            Multi-stage growth
            <InfoTooltip text="Instead of one flat growth rate for every projected year, growth starts high for the first few years, then glides down linearly toward your terminal growth rate before the terminal value kicks in. This mirrors how real analysts model mature companies, and avoids the unrealistic 'cliff' of a high growth rate suddenly dropping straight to terminal growth." />
          </label>
 
          <button
            onClick={runValuation}
            disabled={loading}
            className="w-full py-2.5 bg-[#3B82F6] text-white font-medium rounded-lg hover:bg-[#60A5FA] disabled:opacity-50"
          >
            {loading ? "Calculating…" : "Calculate intrinsic value →"}
          </button>
 
          {error && (
            <div className="border border-[#E5484D] bg-[#E5484D0F] rounded-lg px-3 py-2 text-xs text-[#E5484D]">
              {error}
            </div>
          )}
        </aside>
 
        {/* --- RIGHT: results + sensitivity --- */}
        <section className="flex-1 px-6 py-5">
          {!result && !error && (
            <div className="text-sm text-[#9CA3AF]">
              Set your assumptions on the left, then run a valuation to see results here.
            </div>
          )}
 
          {result && (
            <>
              {/* Big, bold company header */}
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-mono text-sm text-[#9CA3AF]">{result.ticker}</span>
                {result.exchange && (
                  <span className="text-[10px] font-mono text-[#9CA3AF] border border-[#2A2A2E] rounded px-1.5 py-0.5">
                    {result.exchange}
                  </span>
                )}
              </div>
              <h2 className="font-serif font-bold text-3xl sm:text-4xl text-white leading-tight mb-1">
                {result.company_name}
              </h2>
              {(result.sector || result.industry) && (
                <div className="text-sm text-[#9CA3AF] mb-5">
                  {[result.sector, result.industry].filter(Boolean).join(" · ")}
                  {(result.market_cap || result.pe_ratio) && " · "}
                  {result.market_cap && `Mkt cap $${(result.market_cap / 1e9).toFixed(1)}B`}
                  {result.market_cap && result.pe_ratio && " · "}
                  {result.pe_ratio && `P/E ${result.pe_ratio.toFixed(1)}`}
                </div>
              )}
 
              {/* Hero row: the two numbers that matter most, large and bold */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <div>
                  <div className="text-xs uppercase tracking-wide text-[#9CA3AF] mb-1">Current price</div>
                  <div className="font-mono font-bold text-3xl sm:text-4xl text-white">
                    ${result.current_price.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-[#9CA3AF] mb-1">Implied price</div>
                  <div
                    className="font-mono font-bold text-3xl sm:text-4xl"
                    style={{ color: verdictColor(result.verdict) }}
                  >
                    ${result.implied_price_per_share.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-[#9CA3AF] mb-1">Verdict</div>
                  <div
                    className="font-mono font-bold text-xl sm:text-2xl"
                    style={{ color: verdictColor(result.verdict) }}
                  >
                    {result.verdict}
                  </div>
                  <div
                    className="font-mono text-base mt-0.5"
                    style={{ color: verdictColor(result.verdict) }}
                  >
                    {result.upside_pct >= 0 ? "+" : ""}
                    {(result.upside_pct * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
 
              {/* Secondary details, compact */}
              <SectionHeader emoji="💵" text="Model details" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-3 mt-3">
                <MetricCard label="WACC" value={`${(result.wacc * 100).toFixed(2)}%`} />
                <MetricCard
                  label={result.buyback_rate > 0 ? `Buyback-adj (${(result.buyback_rate * 100).toFixed(1)}%/yr)` : "Buyback-adj"}
                  value={`$${result.implied_price_buyback_adjusted.toFixed(2)}`}
                  muted={result.buyback_rate === 0}
                />
                <MetricCard label="Cost of debt" value={`${(result.cost_of_debt_used * 100).toFixed(2)}%`} />
                <MetricCard label="Tax rate" value={`${(result.tax_rate * 100).toFixed(1)}%`} muted />
                {impliedGrowth && (
                  <MetricCard
                    label="Mkt-implied growth"
                    value={`${(impliedGrowth.implied_growth_rate * 100).toFixed(1)}%`}
                  />
                )}
              </div>
 
              {impliedGrowth && (
                <p className="text-xs text-[#9CA3AF] mb-5 leading-relaxed">
                  At {(impliedGrowth.wacc_used * 100).toFixed(2)}% WACC, {(impliedGrowth.implied_growth_rate * 100).toFixed(1)}%
                  {" "}is the growth rate that would make the DCF's implied price exactly match today's
                  market price — in other words, what the market is currently betting on.
                  {!impliedGrowth.converged && " (search did not fully converge — treat as approximate)"}
                </p>
              )}
 
              {grid && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <SectionHeader emoji="📊" text="Sensitivity — implied price / share" />
                    <button
                      onClick={() => setExpandedGrid(true)}
                      className="flex items-center gap-1.5 text-xs text-[#9CA3AF] border border-[#2A2A2E] rounded-lg px-3 py-1.5 hover:border-[#3B82F6] hover:text-[#3B82F6] shrink-0"
                    >
                      ⤢ Expand
                    </button>
                  </div>
                  <p className="text-xs text-[#9CA3AF] mb-4">
                    Green = furthest above current price, red = furthest below.
                  </p>
                  <div className="flex justify-center overflow-x-auto">
                    <SensitivityTable grid={grid} currentPrice={result.current_price} size="normal" />
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
 
      {/* Expanded sensitivity table modal */}
      {expandedGrid && grid && result && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
          onClick={() => setExpandedGrid(false)}
        >
          <div
            className="bg-[#0E0E10] border border-[#2A2A2E] rounded-xl p-8 max-w-[95vw] max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <SectionHeader emoji="📊" text="Sensitivity — implied price / share" />
              <button
                onClick={() => setExpandedGrid(false)}
                className="text-[#9CA3AF] hover:text-white text-2xl leading-none px-2"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <SensitivityTable grid={grid} currentPrice={result.current_price} size="large" />
          </div>
        </div>
      )}
    </main>
  );
}
 
function SensitivityTable({
  grid,
  currentPrice,
  size,
}: {
  grid: { wacc_labels: string[]; terminal_growth_labels: string[]; values: number[][] };
  currentPrice: number;
  size: "normal" | "large";
}) {
  const textClass = size === "large" ? "text-base" : "text-sm";
  const cellPad = size === "large" ? "px-14 py-2 min-w-[140px]" : "px-10 py-1.5 min-w-[110px]";
 
  const flatValues = grid.values.flat();
  const minValue = Math.min(...flatValues);
  const maxValue = Math.max(...flatValues);
  const midValue = (minValue + maxValue) / 2;
 
  return (
    <div>
      <div className="text-sm font-medium text-[#E8ECF3] mb-4">
        Intrinsic Value: WACC vs Terminal Growth Rate (current price: ${currentPrice.toFixed(2)})
      </div>
 
      <div className="flex items-stretch gap-4">
        {/* Rotated WACC axis label */}
        <div className="flex items-center justify-center">
          <span
            className="text-xs text-[#9CA3AF] whitespace-nowrap"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            WACC
          </span>
        </div>
 
        <div>
          {/* Terminal growth axis label, centered above the table */}
          <div className="text-center text-xs text-[#9CA3AF] mb-2">Terminal Growth Rate</div>
 
          <table className={`border-collapse font-mono ${textClass}`}>
            <thead>
              <tr>
                <th className={`${cellPad} text-[#9CA3AF] text-left`}></th>
                {grid.terminal_growth_labels.map((g) => (
                  <th key={g} className={`${cellPad} text-[#9CA3AF] font-normal`}>
                    {g}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.wacc_labels.map((w, i) => (
                <tr key={w}>
                  <td className={`${cellPad} text-[#9CA3AF]`}>{w}</td>
                  {grid.values[i].map((v, j) => (
                    <td
                      key={j}
                      className={`${cellPad} text-center`}
                      style={{
                        backgroundColor: heatColor(v, currentPrice),
                        color: "#000000",
                        fontWeight: 500,
                      }}
                    >
                      ${v.toFixed(0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
 
        {/* Color-scale legend, matching heatColor's red -> yellow -> green ramp */}
        <div className="flex flex-col items-center pl-2">
          <span className="text-xs text-[#9CA3AF] mb-2 whitespace-nowrap">Value/Share</span>
          <div className="flex items-stretch gap-1.5" style={{ height: size === "large" ? 220 : 160 }}>
            <div
              className="w-4 rounded"
              style={{
                background: "linear-gradient(to top, rgb(229,90,79), rgb(232,200,61), rgb(79,209,121))",
              }}
            />
            <div className="flex flex-col justify-between text-[10px] text-[#9CA3AF] py-0.5">
              <span>${maxValue.toFixed(0)}</span>
              <span>${midValue.toFixed(0)}</span>
              <span>${minValue.toFixed(0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
 
function SectionHeader({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[#3B82F6] font-serif text-base">
        <span>{emoji}</span>
        <span>{text}</span>
      </div>
      <div className="h-[2px] bg-gradient-to-r from-[#3B82F6] to-transparent mt-1.5 w-full" />
    </div>
  );
}
 
function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onBlur={() => setOpen(false)}
        className="w-4 h-4 rounded-full border border-[#9CA3AF] text-[#9CA3AF] text-[10px] leading-[14px] flex items-center justify-center hover:border-[#3B82F6] hover:text-[#3B82F6]"
        aria-label="More info"
      >
        i
      </button>
      {open && (
        <span className="absolute left-0 top-6 z-10 w-64 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg text-xs text-[#9CA3AF] p-3 leading-relaxed shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}
 
function SliderRow({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs uppercase tracking-wide text-[#9CA3AF] mb-1">
        <span>{label}</span>
        <span className="font-mono text-[#3B82F6]">{(value * 100).toFixed(1)}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[#3B82F6]"
      />
    </div>
  );
}
 
// Compact metric card, modeled after Streamlit's st.metric — small, dense,
// sits in a tight grid rather than a large boxed panel. This is the main
// fix for the "too much white space" feedback: results now read as a row
// of data points, not a series of big enclosed cards with padding to spare.
function MetricCard({
  label,
  value,
  sub,
  color,
  muted,
  small,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  muted?: boolean;
  small?: boolean;
}) {
  return (
    <div className="bg-[#141417] border border-[#2A2A2E] rounded-xl px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] mb-0.5 truncate">
        {label}
      </div>
      <div
        className={`font-mono ${small ? "text-sm" : "text-lg"} ${muted ? "text-[#9CA3AF]" : ""}`}
        style={color ? { color } : muted ? {} : { color: "#E8ECF3" }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-xs font-mono mt-0.5" style={{ color: color || "#9CA3AF" }}>
          {sub}
        </div>
      )}
    </div>
  );
}
 
// Reserves color for actual meaning: green = undervalued (upside), red =
// overvalued (downside), neutral gray = fairly priced. Orange/amber stays
// reserved for interactive elements (sliders, ticker input, the CTA button).
function verdictColor(verdict: string): string {
  if (verdict === "UNDERPRICED") return "#4ADE80";
  if (verdict === "OVERPRICED") return "#F87171";
  return "#9CA3AF";
}
 
// Classic green -> yellow -> red diverging gradient (like Excel/Streamlit
// heatmaps), based on how far each cell's implied price sits from the
// current market price. Green = furthest above (most "undervalued" at that
// WACC/growth combo), red = furthest below (most "overvalued").
function heatColor(impliedPrice: number, currentPrice: number): string {
  const pct = (impliedPrice - currentPrice) / currentPrice;
  const clamped = Math.max(-0.6, Math.min(0.6, pct));
  const t = (clamped + 0.6) / 1.2; // 0 (red) -> 0.5 (yellow) -> 1 (green)
 
  const red = [229, 90, 79];
  const yellow = [232, 200, 61];
  const green = [79, 209, 121];
 
  let mixed: number[];
  if (t < 0.5) {
    const localT = t / 0.5;
    mixed = red.map((c, i) => Math.round(c + (yellow[i] - c) * localT));
  } else {
    const localT = (t - 0.5) / 0.5;
    mixed = yellow.map((c, i) => Math.round(c + (green[i] - c) * localT));
  }
 
  return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`;
}
 
