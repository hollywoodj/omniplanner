import type { Project } from "./types.js";
import { addWorkSeconds, parseIso } from "./calendar.js";

export interface SimulationResult {
  iterations: number;
  milestones: {
    taskId: string;
    title: string;
    p50: string;
    p80: string;
    p95: string;
    mean: string;
  }[];
}

function pert(min: number, expected: number, max: number): number {
  const mean = (min + 4 * expected + max) / 6;
  const sd = (max - min) / 6;
  const u1 = Math.random() || 0.0001;
  const u2 = Math.random() || 0.0001;
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(min, mean + sd * z);
}

export function autoEstimate(project: Project, taskIds?: string[]): Project {
  for (const t of project.tasks) {
    if (taskIds && !taskIds.includes(t.uniqueID)) continue;
    if (t.type !== "task" && t.type !== "hammock") continue;
    const e = t.effort || t.duration;
    t.expectedEffortEstimate = e;
    t.minEffortEstimate = e * 0.75;
    t.maxEffortEstimate = e * 1.5;
    t.effort = (t.minEffortEstimate + 4 * t.expectedEffortEstimate + t.maxEffortEstimate) / 6;
  }
  return project;
}

export function monteCarlo(project: Project, iterations = 200): SimulationResult {
  const milestones = project.tasks.filter((t) => t.type === "milestone");
  const samples: Record<string, number[]> = {};
  for (const m of milestones) samples[m.uniqueID] = [];

  for (let i = 0; i < iterations; i++) {
    const durations: Record<string, number> = {};
    for (const t of project.tasks) {
      if (t.type === "task" || t.type === "hammock") {
        const min = t.minEffortEstimate ?? t.effort * 0.75;
        const exp = t.expectedEffortEstimate ?? t.effort;
        const max = t.maxEffortEstimate ?? t.effort * 1.5;
        durations[t.uniqueID] = pert(min, exp, max);
      } else durations[t.uniqueID] = t.duration;
    }
    const finish: Record<string, number> = {};
    const start = parseIso(project.startDate)!.getTime();
    for (const t of project.tasks) {
      const pred = project.dependencies.filter((d) => d.dependentTaskId === t.uniqueID);
      const predEnd = pred.length ? Math.max(...pred.map((d) => finish[d.prerequisiteTaskId] || start)) : start;
      const dur = durations[t.uniqueID] || t.duration;
      const begin = new Date(predEnd);
      const end = t.type === "milestone" ? begin : addWorkSeconds(begin, dur, project);
      finish[t.uniqueID] = end.getTime();
    }
    for (const m of milestones) samples[m.uniqueID].push(finish[m.uniqueID] || start);
  }

  const percentile = (arr: number[], p: number) => {
    const s = [...arr].sort((a, b) => a - b);
    const idx = Math.min(s.length - 1, Math.floor((p / 100) * s.length));
    return new Date(s[idx]).toISOString();
  };

  return {
    iterations,
    milestones: milestones.map((m) => {
      const arr = samples[m.uniqueID];
      const mean = arr.reduce((a, b) => a + b, 0) / Math.max(arr.length, 1);
      return {
        taskId: m.uniqueID,
        title: m.title,
        p50: percentile(arr, 50),
        p80: percentile(arr, 80),
        p95: percentile(arr, 95),
        mean: new Date(mean).toISOString(),
      };
    }),
  };
}
