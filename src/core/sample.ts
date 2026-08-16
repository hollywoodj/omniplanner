import { resetIds } from "./ids.js";
import { blankProject, blankResource, blankTask, makeAssignment, makeDependency } from "./factory.js";
import { scheduleProject } from "./scheduler.js";
import type { Project } from "./types.js";

function day(start: Date, n: number): string {
  const d = new Date(start);
  d.setDate(d.getDate() + n);
  d.setHours(8, 0, 0, 0);
  return d.toISOString();
}

/** Demo project modeled on OmniPlan's Standard Project template. */
export function sampleAtlasRelease(): Project {
  resetIds({ task: 1, resource: 1, dep: 1, asg: 1, other: 1 });
  const start = new Date();
  start.setHours(8, 0, 0, 0);
  while (start.getDay() === 0 || start.getDay() === 6) start.setDate(start.getDate() + 1);

  const h = 3600;
  const d = 8 * h;

  const resources = [
    blankResource({ name: "Maya Chen", type: "staff", email: "maya@atlas.dev", costPerHour: 95, units: 1 }),
    blankResource({ name: "Jordan Hale", type: "staff", email: "jordan@atlas.dev", costPerHour: 85, units: 1 }),
    blankResource({ name: "Sam Okonkwo", type: "staff", email: "sam@atlas.dev", costPerHour: 90, units: 1 }),
    blankResource({ name: "Riley Park", type: "staff", email: "riley@atlas.dev", costPerHour: 88, units: 1 }),
    blankResource({ name: "Quinn Sato", type: "staff", email: "quinn@atlas.dev", costPerHour: 80, units: 1 }),
    blankResource({ name: "CI Cluster", type: "equipment", costPerHour: 12, units: 1 }),
    blankResource({ name: "Launch Stickers", type: "material", costPerUse: 2.5, units: 500 }),
  ];
  const [maya, jordan, sam, riley, quinn, ci, stickers] = resources;

  const g1 = blankTask({ title: "Discovery", type: "group", duration: 0, effort: 0, parentId: null, order: 0 });
  const t11 = blankTask({ title: "Stakeholder interviews", duration: 3 * d, effort: 3 * d, parentId: g1.uniqueID, order: 0, completion: 100, effortDone: 3 * d });
  const t12 = blankTask({ title: "Competitive audit", duration: 2 * d, effort: 2 * d, parentId: g1.uniqueID, order: 1, completion: 80, effortDone: 1.6 * d });
  const t13 = blankTask({ title: "PRD & success metrics", duration: 2 * d, effort: 2 * d, parentId: g1.uniqueID, order: 2, completion: 40, effortDone: 0.8 * d });
  const m1 = blankTask({ title: "Discovery complete", type: "milestone", duration: 0, effort: 0, parentId: g1.uniqueID, order: 3 });

  const g2 = blankTask({ title: "Design", type: "group", duration: 0, effort: 0, parentId: null, order: 1 });
  const t21 = blankTask({ title: "IA & user flows", duration: 4 * d, effort: 4 * d, parentId: g2.uniqueID, order: 0 });
  const t22 = blankTask({ title: "Visual design system", duration: 5 * d, effort: 5 * d, parentId: g2.uniqueID, order: 1 });
  const t23 = blankTask({ title: "Hi-fi prototypes", duration: 4 * d, effort: 4 * d, parentId: g2.uniqueID, order: 2 });
  const m2 = blankTask({ title: "Design freeze", type: "milestone", duration: 0, effort: 0, parentId: g2.uniqueID, order: 3 });

  const g3 = blankTask({ title: "Engineering", type: "group", duration: 0, effort: 0, parentId: null, order: 2 });
  const t31 = blankTask({ title: "API contracts", duration: 3 * d, effort: 3 * d, parentId: g3.uniqueID, order: 0 });
  const t32 = blankTask({ title: "Core services", duration: 8 * d, effort: 8 * d, parentId: g3.uniqueID, order: 1 });
  const t33 = blankTask({ title: "Client application", duration: 8 * d, effort: 8 * d, parentId: g3.uniqueID, order: 2 });
  const t34 = blankTask({ title: "Integrations", duration: 5 * d, effort: 5 * d, parentId: g3.uniqueID, order: 3 });
  const t35 = blankTask({ title: "Stabilization buffer", type: "hammock", duration: 5 * d, effort: 5 * d, parentId: g3.uniqueID, order: 4 });
  const m3 = blankTask({
    title: "Code complete",
    type: "milestone",
    duration: 0,
    effort: 0,
    parentId: g3.uniqueID,
    order: 5,
    startNoEarlierThanDate: day(start, 45),
  });

  const g4 = blankTask({ title: "QA & Launch", type: "group", duration: 0, effort: 0, parentId: null, order: 3 });
  const t41 = blankTask({ title: "Test plan", duration: 2 * d, effort: 2 * d, parentId: g4.uniqueID, order: 0 });
  const t42 = blankTask({ title: "Regression suite", duration: 5 * d, effort: 5 * d, parentId: g4.uniqueID, order: 1 });
  const t43 = blankTask({ title: "Beta program", duration: 5 * d, effort: 5 * d, parentId: g4.uniqueID, order: 2 });
  const t44 = blankTask({ title: "Launch checklist", duration: 2 * d, effort: 2 * d, parentId: g4.uniqueID, order: 3 });
  const m4 = blankTask({ title: "Atlas 4.0 ships", type: "milestone", duration: 0, effort: 0, parentId: g4.uniqueID, order: 4 });

  const tasks = [g1, t11, t12, t13, m1, g2, t21, t22, t23, m2, g3, t31, t32, t33, t34, t35, m3, g4, t41, t42, t43, t44, m4];

  const dependencies = [
    makeDependency(t11.uniqueID, t12.uniqueID, "FS"),
    makeDependency(t12.uniqueID, t13.uniqueID, "FS"),
    makeDependency(t13.uniqueID, m1.uniqueID, "FS"),
    makeDependency(m1.uniqueID, t21.uniqueID, "FS"),
    makeDependency(t21.uniqueID, t22.uniqueID, "SS", 1 * d),
    makeDependency(t22.uniqueID, t23.uniqueID, "FS"),
    makeDependency(t23.uniqueID, m2.uniqueID, "FS"),
    makeDependency(m1.uniqueID, t31.uniqueID, "FS"),
    makeDependency(t31.uniqueID, t32.uniqueID, "FS"),
    makeDependency(t31.uniqueID, t33.uniqueID, "FS"),
    makeDependency(m2.uniqueID, t33.uniqueID, "FS"),
    makeDependency(t32.uniqueID, t34.uniqueID, "FS"),
    makeDependency(t33.uniqueID, t34.uniqueID, "FS"),
    makeDependency(t34.uniqueID, t35.uniqueID, "FS"),
    makeDependency(m3.uniqueID, t35.uniqueID, "FF"),
    makeDependency(t31.uniqueID, t41.uniqueID, "FS"),
    makeDependency(t41.uniqueID, t42.uniqueID, "FS"),
    makeDependency(m3.uniqueID, t42.uniqueID, "FS"),
    makeDependency(t42.uniqueID, t43.uniqueID, "FS"),
    makeDependency(t43.uniqueID, t44.uniqueID, "FS"),
    makeDependency(t44.uniqueID, m4.uniqueID, "FS"),
  ];

  const assignments = [
    makeAssignment(t11.uniqueID, maya.uniqueID),
    makeAssignment(t12.uniqueID, jordan.uniqueID),
    makeAssignment(t13.uniqueID, maya.uniqueID),
    makeAssignment(t21.uniqueID, jordan.uniqueID),
    makeAssignment(t22.uniqueID, jordan.uniqueID),
    makeAssignment(t23.uniqueID, jordan.uniqueID),
    makeAssignment(t31.uniqueID, sam.uniqueID),
    makeAssignment(t32.uniqueID, sam.uniqueID),
    makeAssignment(t32.uniqueID, ci.uniqueID, 0.5),
    makeAssignment(t33.uniqueID, riley.uniqueID),
    makeAssignment(t34.uniqueID, sam.uniqueID),
    makeAssignment(t34.uniqueID, riley.uniqueID),
    makeAssignment(t35.uniqueID, sam.uniqueID, 0.5),
    makeAssignment(t41.uniqueID, quinn.uniqueID),
    makeAssignment(t42.uniqueID, quinn.uniqueID),
    makeAssignment(t43.uniqueID, quinn.uniqueID),
    makeAssignment(t43.uniqueID, maya.uniqueID, 0.25),
    makeAssignment(t44.uniqueID, maya.uniqueID),
    makeAssignment(t44.uniqueID, stickers.uniqueID, 200),
  ];

  t13.customData = { OmniFocusID: "" };
  t44.note = "Includes App Store, marketing site, and status page cutover.";

  const project = blankProject({
    id: "atlas-40",
    documentName: "Atlas 4.0 Release.oplx",
    title: "Atlas 4.0 Release",
    startDate: day(start, 0),
    tasks,
    resources,
    dependencies,
    assignments,
    notes: "Standard-styled sample project. Level resources after editing assignments.",
    slackLimitHours: 8,
    criticalPathToMilestoneIds: [m4.uniqueID],
  });

  return scheduleProject(project).project;
}

export function simpleProject(): Project {
  resetIds({ task: 1, resource: 1, dep: 1, asg: 1, other: 1 });
  const start = new Date();
  start.setHours(8, 0, 0, 0);
  const d = 8 * 3600;
  const a = blankTask({ title: "Plan", duration: d, effort: d, order: 0 });
  const b = blankTask({ title: "Do", duration: 2 * d, effort: 2 * d, order: 1 });
  const c = blankTask({ title: "Review", duration: d, effort: d, order: 2 });
  const m = blankTask({ title: "Done", type: "milestone", duration: 0, effort: 0, order: 3 });
  const r = blankResource({ name: "You", type: "staff", costPerHour: 50 });
  const project = blankProject({
    id: "simple",
    documentName: "Simple Project.oplx",
    title: "Simple Project",
    startDate: start.toISOString(),
    tasks: [a, b, c, m],
    resources: [r],
    dependencies: [makeDependency(a.uniqueID, b.uniqueID), makeDependency(b.uniqueID, c.uniqueID), makeDependency(c.uniqueID, m.uniqueID)],
    assignments: [makeAssignment(a.uniqueID, r.uniqueID), makeAssignment(b.uniqueID, r.uniqueID), makeAssignment(c.uniqueID, r.uniqueID)],
  });
  return scheduleProject(project).project;
}
