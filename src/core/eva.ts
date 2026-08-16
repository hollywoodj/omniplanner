import type { Project } from "./types.js";
import { parseIso } from "./calendar.js";

export interface EarnedValue {
  bac: number;
  pv: number;
  ev: number;
  ac: number;
  cpi: number;
  spi: number;
  cv: number;
  sv: number;
  eac: number;
  etc: number;
  vac: number;
  teac: string | null;
}

export function earnedValue(project: Project, asOf = new Date()): EarnedValue {
  const baseline = project.baselines.find((b) => b.id === project.currentBaselineId);
  const bac = project.tasks.filter((t) => !t.parentId).reduce((s, t) => s + t.totalCost, 0) ||
    project.tasks.reduce((s, t) => s + t.staticCost, 0);
  let pv = 0;
  let ev = 0;
  let ac = 0;
  for (const t of project.tasks) {
    if (project.tasks.some((x) => x.parentId === t.uniqueID)) continue;
    const planned = baseline?.tasks[t.uniqueID];
    const start = parseIso(planned?.startDate || t.startDate);
    const end = parseIso(planned?.endDate || t.endDate);
    const cost = planned?.cost ?? t.totalCost;
    if (start && end) {
      if (end <= asOf) pv += cost;
      else if (start < asOf) {
        const frac = (asOf.getTime() - start.getTime()) / Math.max(1, end.getTime() - start.getTime());
        pv += cost * Math.min(1, Math.max(0, frac));
      }
    }
    ev += cost * (t.completion / 100);
    ac += t.assignmentsCost * (t.completion / 100) + t.staticCost * (t.completion / 100);
  }
  const cpi = ac > 0 ? ev / ac : 1;
  const spi = pv > 0 ? ev / pv : 1;
  const cv = ev - ac;
  const sv = ev - pv;
  const eac = cpi > 0 ? bac / cpi : bac;
  const etc = eac - ac;
  const vac = bac - eac;
  return { bac, pv, ev, ac, cpi, spi, cv, sv, eac, etc, vac, teac: null };
}
