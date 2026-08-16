import type { Project } from "./types.js";

const UNIT_SECONDS: Record<string, (p: Project) => number> = {
  s: () => 1,
  m: () => 60,
  h: () => 3600,
  d: (p) => p.hoursPerDay * 3600,
  w: (p) => p.hoursPerWeek * 3600,
  mo: (p) => p.hoursPerMonth * 3600,
  y: (p) => p.hoursPerYear * 3600,
};

const UNIT_ORDER = ["y", "mo", "w", "d", "h", "m", "s"] as const;

export function parseDuration(input: string | number, project: Project): { seconds: number; elapsed: boolean } {
  if (typeof input === "number" && Number.isFinite(input)) return { seconds: input, elapsed: false };
  const raw = String(input).trim().toLowerCase();
  if (!raw) return { seconds: 0, elapsed: false };
  const elapsed = /^e/.test(raw) || /\d\s*e[hmdwys]/.test(raw);
  const text = raw.replace(/^e/, "").replace(/(\d)\s*e(?=[hmdwys])/g, "$1");
  let total = 0;
  const re = /(\d+(?:\.\d+)?)\s*(mo|ms|y|w|d|h|m|s)?/g;
  let match: RegExpExecArray | null;
  let found = false;
  while ((match = re.exec(text))) {
    found = true;
    const n = Number(match[1]);
    const unit = (match[2] || smallestUnit(project)) as keyof typeof UNIT_SECONDS;
    const factor = UNIT_SECONDS[unit]?.(project) ?? 3600;
    total += n * factor;
  }
  if (!found) {
    const n = Number(text);
    if (Number.isFinite(n)) total = n * UNIT_SECONDS[smallestUnit(project)](project);
  }
  return { seconds: total, elapsed };
}

function smallestUnit(project: Project): keyof typeof UNIT_SECONDS {
  const units = project.durationUnits;
  if (units.includes("s")) return "s";
  if (units.includes("m")) return "m";
  if (units.includes("h")) return "h";
  return "d";
}

export function formatDuration(seconds: number, project: Project, elapsed = false): string {
  if (!Number.isFinite(seconds) || seconds === 0) return "0";
  const prefix = elapsed ? "e" : "";
  const units = project.durationUnits.length ? project.durationUnits : ["d", "h"];
  let remaining = Math.round(seconds);
  const parts: string[] = [];
  for (const u of UNIT_ORDER) {
    if (!units.includes(u) && u !== "h" && u !== "d") continue;
    if (!units.includes(u) && !(u === "h" && units.includes("d"))) continue;
    const size = UNIT_SECONDS[u](project);
    if (size <= 0) continue;
    const n = Math.floor(remaining / size);
    if (n > 0) {
      parts.push(`${n}${u}`);
      remaining -= n * size;
    }
  }
  if (!parts.length) {
    if (seconds < 60) return `${prefix}${Math.round(seconds)}s`;
    if (seconds < 3600) return `${prefix}${Math.round(seconds / 60)}m`;
    return `${prefix}${(seconds / 3600).toFixed(1)}h`;
  }
  return prefix + parts.join(" ");
}

export function formatEffort(seconds: number, project: Project): string {
  return formatDuration(seconds, project);
}

export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.replace(/[^A-Z]/g, "") || "USD" }).format(amount);
  } catch {
    return `${currency}${amount.toFixed(2)}`;
  }
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}
