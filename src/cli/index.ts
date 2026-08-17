#!/usr/bin/env node
import { Command } from "commander";
import {
  applyOmniFocusLinks,
  copyTasksToOmniFocusPayload,
  createProject,
  deleteProject,
  earnedValue,
  formatDuration,
  getProject,
  ingestOmniFocusTasks,
  levelResources,
  loadState,
  defaultState,
  monteCarlo,
  catchUp,
  rescheduleIncomplete,
  setBaseline,
  mutateProject,
  parseOmniUrl,
  putProject,
  saveState,
  toCsv,
  blankTask,
  blankResource,
  makeDependency,
  makeAssignment,
  parseDuration,
  outlineNumber,
  flattenedOutline,
  type OFToOPTaskPayload,
} from "../core/index.js";

const API = process.env.OMNIPLAN_URL || "http://127.0.0.1:4577";

const program = new Command();
program.name("omniplan").description("OmniPlan 4 clone CLI — same surface as the app, API, and OmniFocus bridge").version("4.10.3");

function pid(opts: { project?: string }): string {
  return opts.project || loadState().projects[0]?.id;
}

program
  .command("projects")
  .description("List projects")
  .action(() => {
    for (const p of loadState().projects) {
      console.log(`${p.id}\t${p.title}\t${p.tasks.length} tasks\t${p.documentName}`);
    }
  });

program
  .command("project")
  .description("Create or show a project")
  .argument("[title]")
  .option("--create")
  .option("--template <id>", "standard | simple | empty")
  .option("--delete <id>")
  .action((title, opts) => {
    if (opts.delete) {
      deleteProject(opts.delete);
      console.log("deleted", opts.delete);
      return;
    }
    if (opts.create || title) {
      const p = createProject(title || "Untitled", opts.template);
      console.log(p.id, p.title);
      return;
    }
    console.log(JSON.stringify(loadState().projects.map((p) => ({ id: p.id, title: p.title })), null, 2));
  });

program
  .command("tasks")
  .description("List tasks in outline order")
  .option("-p, --project <id>")
  .action((opts) => {
    const p = getProject(pid(opts));
    for (const t of flattenedOutline({ ...p, tasks: p.tasks.map((x) => ({ ...x, collapsed: false })) })) {
      const num = outlineNumber(p, t.uniqueID, "hierarchical");
      const indent = "  ".repeat((num.match(/\./g) || []).length);
      console.log(`${t.uniqueID}\t${indent}${num} ${t.title}\t${t.type}\t${formatDuration(t.duration, p)}\t${Math.round(t.completion)}%\t${t.startDate.slice(0, 10)}`);
    }
  });

program
  .command("task")
  .description("Add or inspect a task")
  .argument("[title]")
  .option("-p, --project <id>")
  .option("--id <taskId>")
  .option("--duration <dur>", "2d, 4h, 48eh")
  .option("--type <type>", "task | milestone | group | hammock")
  .option("--parent <id>")
  .option("--note <text>")
  .option("--complete <pct>")
  .action((title, opts) => {
    const project = mutateProject(pid(opts), (p) => {
      if (opts.id && !title) return p;
      if (opts.id) {
        const t = p.tasks.find((x) => x.uniqueID === opts.id);
        if (!t) throw new Error("task not found");
        if (title) t.title = title;
        if (opts.duration) t.duration = parseDuration(opts.duration, p).seconds;
        if (opts.type) t.type = opts.type;
        if (opts.note) t.note = opts.note;
        if (opts.complete) t.completion = Number(opts.complete);
        return p;
      }
      const dur = opts.duration ? parseDuration(opts.duration, p).seconds : p.hoursPerDay * 3600;
      p.tasks.push(blankTask({ title: title || "New Task", type: opts.type || "task", duration: dur, effort: dur, parentId: opts.parent || null, note: opts.note || "", order: p.tasks.length }));
      return p;
    });
    const t = [...project.tasks].reverse().find((x) => !opts.id || x.uniqueID === opts.id) || project.tasks.at(-1);
    console.log(t?.uniqueID, t?.title, `omniplan:///task/${t?.uniqueID}`);
  });

program
  .command("connect")
  .description("Create a dependency (FS FF SS SF)")
  .argument("<from>")
  .argument("<to>")
  .option("-p, --project <id>")
  .option("--type <type>", "FS", "FS")
  .option("--lead <seconds>", "0")
  .action((from, to, opts) => {
    mutateProject(pid(opts), (p) => {
      p.dependencies.push(makeDependency(from, to, opts.type, Number(opts.lead || 0)));
      return p;
    });
    console.log(`${from} -${opts.type}-> ${to}`);
  });

program
  .command("assign")
  .description("Assign a resource to a task")
  .argument("<taskId>")
  .argument("<resourceId>")
  .option("-p, --project <id>")
  .option("--units <n>", "1")
  .action((taskId, resourceId, opts) => {
    mutateProject(pid(opts), (p) => {
      p.assignments.push(makeAssignment(taskId, resourceId, Number(opts.units || 1)));
      return p;
    });
    console.log("assigned");
  });

program
  .command("resources")
  .option("-p, --project <id>")
  .action((opts) => {
    for (const r of getProject(pid(opts)).resources) {
      console.log(`${r.uniqueID}\t${r.name}\t${r.type}\t${Math.round(r.units * 100)}%`);
    }
  });

program
  .command("resource")
  .argument("<name>")
  .option("-p, --project <id>")
  .option("--type <type>", "staff")
  .option("--rate <hourly>")
  .action((name, opts) => {
    const p = mutateProject(pid(opts), (proj) => {
      proj.resources.push(blankResource({ name, type: opts.type, costPerHour: Number(opts.rate || 0) }));
      return proj;
    });
    console.log(p.resources.at(-1)?.uniqueID, name);
  });

program
  .command("level")
  .option("-p, --project <id>")
  .action((opts) => {
    putProject(levelResources(getProject(pid(opts))));
    console.log("leveled");
  });

program
  .command("catch-up")
  .option("-p, --project <id>")
  .option("--date <iso>")
  .action((opts) => {
    putProject(catchUp(getProject(pid(opts)), opts.date ? new Date(opts.date) : new Date()));
    console.log("caught up");
  });

program
  .command("reschedule")
  .option("-p, --project <id>")
  .option("--date <iso>")
  .action((opts) => {
    putProject(rescheduleIncomplete(getProject(pid(opts)), opts.date ? new Date(opts.date) : new Date()));
    console.log("rescheduled");
  });

program
  .command("baseline")
  .argument("[name]")
  .option("-p, --project <id>")
  .action((name, opts) => {
    const p = setBaseline(getProject(pid(opts)), name || "Baseline");
    putProject(p);
    console.log(p.currentBaselineId);
  });

program
  .command("simulate")
  .option("-p, --project <id>")
  .option("-n, --iterations <n>", "200")
  .action((opts) => {
    console.log(JSON.stringify(monteCarlo(getProject(pid(opts)), Number(opts.iterations)), null, 2));
  });

program
  .command("eva")
  .option("-p, --project <id>")
  .action((opts) => {
    console.log(JSON.stringify(earnedValue(getProject(pid(opts))), null, 2));
  });

program
  .command("export")
  .option("-p, --project <id>")
  .option("--format <fmt>", "json")
  .action((opts) => {
    const p = getProject(pid(opts));
    if (opts.format === "csv") console.log(toCsv(p));
    else console.log(JSON.stringify(p, null, 2));
  });

program
  .command("url")
  .description("Resolve an omniplan:// or omnifocus:// URL")
  .argument("<url>")
  .action((url) => {
    console.log(JSON.stringify(parseOmniUrl(url), null, 2));
  });

program
  .command("link")
  .description("Print omniplan:///task/id for a task")
  .argument("<taskId>")
  .action((taskId) => {
    console.log(`omniplan:///task/${taskId}`);
  });

program
  .command("copy-to-omnifocus")
  .description("Copy tasks to OmniFocus using the official tellFunction payload")
  .argument("<taskIds...>")
  .option("-p, --project <id>")
  .action(async (taskIds, opts) => {
    const project = getProject(pid(opts));
    const payload = copyTasksToOmniFocusPayload(project, taskIds);
    const r = await fetch(`${API}/bridge/omnifocus/copy-tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: project.id, taskIds }),
    }).catch(() => null);
    if (r) {
      console.log(JSON.stringify(await r.json(), null, 2));
      return;
    }
    console.log(JSON.stringify({ pending: true, argument: payload, tellFunction: "omnifocus" }, null, 2));
  });

program
  .command("from-omnifocus")
  .description("Ingest OmniFocus copy-to-omniplan payload (stdin JSON)")
  .option("-p, --project <id>")
  .action(async (opts) => {
    const chunks: Buffer[] = [];
    for await (const c of process.stdin) chunks.push(c as Buffer);
    const argument = JSON.parse(Buffer.concat(chunks).toString() || "[]") as OFToOPTaskPayload[];
    const project = getProject(pid(opts));
    const { project: next, links } = ingestOmniFocusTasks(project, argument);
    putProject(next);
    console.log(JSON.stringify(links, null, 2));
  });

program
  .command("tell")
  .description("URL.tellFunction analogue: omniplan tell omniplan|omnifocus --argument JSON")
  .argument("<app>")
  .option("--argument <json>", "{}")
  .option("--function <name>")
  .option("-p, --project <id>")
  .action(async (appName, opts) => {
    const r = await fetch(`${API}/automation/tell`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        app: appName,
        argument: JSON.parse(opts.argument || "{}"),
        functionName: opts.function,
        projectId: opts.project,
      }),
    });
    console.log(JSON.stringify(await r.json(), null, 2));
  });

program
  .command("prefs")
  .description("Get or set preferences (OmniPlan > Preferences)")
  .option("--set <json>")
  .action((opts) => {
    const state = loadState();
    if (opts.set) {
      state.preferences = { ...state.preferences, ...JSON.parse(opts.set) };
      saveState(state);
    }
    console.log(JSON.stringify(state.preferences, null, 2));
  });

program
  .command("seed")
  .description("Reset local data to the Atlas 4.0 sample")
  .action(() => {
    saveState(defaultState());
    console.log("seeded", loadState().projects[0]?.title);
  });

program.parseAsync().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
