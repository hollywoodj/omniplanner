import express from "express";
import cors from "cors";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyOmniFocusLinks,
  applyOmniFocusStatus,
  automationContext,
  copyTasksToOmniFocusPayload,
  createProject,
  deleteProject,
  earnedValue,
  fromCsv,
  getProject,
  ingestOmniFocusTasks,
  levelResources,
  loadState,
  monteCarlo,
  autoEstimate,
  catchUp,
  rescheduleIncomplete,
  setBaseline,
  mutateProject,
  parseOmniUrl,
  putProject,
  resolveUrl,
  saveState,
  scheduleProject,
  toCsv,
  toIcs,
  toReportHtml,
  blankTask,
  blankResource,
  makeDependency,
  makeAssignment,
  parseDuration,
  type OFToOPTaskPayload,
  type Project,
} from "../core/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4577);

export function createApp() {
const app = express();
app.use(cors());
app.use(express.json({ limit: "8mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "omniplan", version: "4.10.3" });
});

app.get("/api/state", (_req, res) => {
  res.json(loadState());
});

app.get("/api/preferences", (_req, res) => {
  res.json(loadState().preferences);
});

app.patch("/api/preferences", (req, res) => {
  const state = loadState();
  state.preferences = { ...state.preferences, ...req.body };
  saveState(state);
  res.json(state.preferences);
});

app.get("/api/plugins", (_req, res) => {
  res.json(loadState().plugins);
});

app.get("/api/templates", (_req, res) => {
  res.json(loadState().templates);
});

app.get("/api/accounts", (_req, res) => {
  res.json(loadState().accounts);
});

app.post("/api/accounts", (req, res) => {
  const state = loadState();
  const account = {
    id: `acct-${Date.now()}`,
    kind: req.body.kind || "webdav",
    name: req.body.name || "Server",
    url: req.body.url || "",
    connected: false,
  };
  state.accounts.push(account);
  saveState(state);
  res.status(201).json(account);
});

app.get("/api/dashboards", (_req, res) => {
  res.json(loadState().dashboards);
});

app.post("/api/dashboards", (req, res) => {
  const state = loadState();
  const dash = { id: `dash-${Date.now()}`, name: req.body.name || "Dashboard", projectIds: req.body.projectIds || [] };
  state.dashboards.push(dash);
  saveState(state);
  res.status(201).json(dash);
});

app.get("/api/projects", (_req, res) => {
  res.json(loadState().projects.map(summary));
});

app.post("/api/projects", (req, res) => {
  const project = createProject(req.body.title || "Untitled", req.body.templateId);
  res.status(201).json(project);
});

app.get("/api/projects/:id", (req, res) => {
  res.json(withViolations(getProject(req.params.id)));
});

app.patch("/api/projects/:id", (req, res) => {
  const project = mutateProject(req.params.id, (p) => ({ ...p, ...req.body, tasks: p.tasks, resources: p.resources }));
  res.json(withViolations(project));
});

app.delete("/api/projects/:id", (req, res) => {
  deleteProject(req.params.id);
  res.status(204).end();
});

app.put("/api/projects/:id", (req, res) => {
  res.json(withViolations(putProject(req.body as Project)));
});

app.post("/api/projects/:id/schedule", (req, res) => {
  res.json(withViolations(putProject(getProject(req.params.id))));
});

app.post("/api/projects/:id/level", (req, res) => {
  const project = mutateProject(req.params.id, (p) => levelResources(p, req.body || {}));
  res.json(withViolations(project));
});

app.post("/api/projects/:id/catch-up", (req, res) => {
  const asOf = req.body.date ? new Date(req.body.date) : new Date();
  res.json(withViolations(mutateProject(req.params.id, (p) => catchUp(p, asOf))));
});

app.post("/api/projects/:id/reschedule", (req, res) => {
  const from = req.body.date ? new Date(req.body.date) : new Date();
  res.json(withViolations(mutateProject(req.params.id, (p) => rescheduleIncomplete(p, from))));
});

app.post("/api/projects/:id/baseline", (req, res) => {
  res.json(mutateProject(req.params.id, (p) => setBaseline(p, req.body.name || `Baseline ${p.baselines.length + 1}`)));
});

app.post("/api/projects/:id/simulate", (req, res) => {
  const project = getProject(req.params.id);
  if (req.body.autoEstimate) autoEstimate(project, req.body.taskIds);
  res.json(monteCarlo(project, req.body.iterations || 200));
});

app.get("/api/projects/:id/eva", (req, res) => {
  res.json(earnedValue(getProject(req.params.id)));
});

app.post("/api/projects/:id/tasks", (req, res) => {
  const project = mutateProject(req.params.id, (p) => {
    const dur = req.body.duration
      ? parseDuration(req.body.duration, p).seconds
      : p.hoursPerDay * 3600;
    const task = blankTask({
      title: req.body.title || "New Task",
      type: req.body.type || "task",
      parentId: req.body.parentId ?? null,
      duration: dur,
      effort: req.body.effort ? parseDuration(req.body.effort, p).seconds : dur,
      note: req.body.note || "",
      order: p.tasks.filter((t) => t.parentId === (req.body.parentId ?? null)).length,
    });
    if (req.body.parentId) {
      const parent = p.tasks.find((t) => t.uniqueID === req.body.parentId);
      if (parent && parent.type === "task") parent.type = "group";
    }
    p.tasks.push(task);
    return p;
  });
  res.status(201).json(project);
});

app.patch("/api/projects/:id/tasks/:taskId", (req, res) => {
  const project = mutateProject(req.params.id, (p) => {
    const t = p.tasks.find((x) => x.uniqueID === req.params.taskId);
    if (!t) throw Object.assign(new Error("Task not found"), { status: 404 });
    const body = { ...req.body };
    if (typeof body.duration === "string") body.duration = parseDuration(body.duration, p).seconds;
    if (typeof body.effort === "string") body.effort = parseDuration(body.effort, p).seconds;
    Object.assign(t, body);
    return p;
  });
  res.json(project);
});

app.delete("/api/projects/:id/tasks/:taskId", (req, res) => {
  res.json(
    mutateProject(req.params.id, (p) => {
      const ids = new Set(collect(p, req.params.taskId));
      p.tasks = p.tasks.filter((t) => !ids.has(t.uniqueID));
      p.dependencies = p.dependencies.filter((d) => !ids.has(d.prerequisiteTaskId) && !ids.has(d.dependentTaskId));
      p.assignments = p.assignments.filter((a) => !ids.has(a.taskId));
      return p;
    }),
  );
});

app.post("/api/projects/:id/dependencies", (req, res) => {
  res.status(201).json(
    mutateProject(req.params.id, (p) => {
      p.dependencies.push(makeDependency(req.body.from, req.body.to, req.body.type || "FS", req.body.leadSeconds || 0));
      return p;
    }),
  );
});

app.delete("/api/projects/:id/dependencies/:depId", (req, res) => {
  res.json(mutateProject(req.params.id, (p) => {
    p.dependencies = p.dependencies.filter((d) => d.id !== req.params.depId);
    return p;
  }));
});

app.post("/api/projects/:id/resources", (req, res) => {
  res.status(201).json(
    mutateProject(req.params.id, (p) => {
      p.resources.push(blankResource({ name: req.body.name || "New Resource", type: req.body.type || "staff", costPerHour: req.body.costPerHour || 0 }));
      return p;
    }),
  );
});

app.patch("/api/projects/:id/resources/:rid", (req, res) => {
  res.json(
    mutateProject(req.params.id, (p) => {
      const r = p.resources.find((x) => x.uniqueID === req.params.rid);
      if (r) Object.assign(r, req.body);
      return p;
    }),
  );
});

app.delete("/api/projects/:id/resources/:rid", (req, res) => {
  res.json(
    mutateProject(req.params.id, (p) => {
      p.resources = p.resources.filter((r) => r.uniqueID !== req.params.rid);
      p.assignments = p.assignments.filter((a) => a.resourceId !== req.params.rid);
      return p;
    }),
  );
});

app.post("/api/projects/:id/assignments", (req, res) => {
  res.status(201).json(
    mutateProject(req.params.id, (p) => {
      p.assignments.push(makeAssignment(req.body.taskId, req.body.resourceId, req.body.units ?? 1));
      return p;
    }),
  );
});

app.delete("/api/projects/:id/assignments/:aid", (req, res) => {
  res.json(mutateProject(req.params.id, (p) => {
    p.assignments = p.assignments.filter((a) => a.id !== req.params.aid);
    return p;
  }));
});

app.get("/api/projects/:id/export/:fmt", (req, res) => {
  const project = getProject(req.params.id);
  if (req.params.fmt === "csv") {
    res.type("text/csv").send(toCsv(project));
    return;
  }
  if (req.params.fmt === "ics") {
    res.type("text/calendar").send(toIcs(project));
    return;
  }
  if (req.params.fmt === "html" || req.params.fmt === "report") {
    res.type("html").send(toReportHtml(project));
    return;
  }
  if (req.params.fmt === "json" || req.params.fmt === "oplx") {
    res.json(project);
    return;
  }
  res.status(400).json({ error: "Unknown format. Use csv, ics, html, json." });
});

app.post("/api/projects/:id/import/csv", (req, res) => {
  const csv = String(req.body.csv || "");
  res.json(
    mutateProject(req.params.id, (p) => {
      for (const row of fromCsv(csv, p)) {
        const dur = parseDuration(row.durationHint, p).seconds || p.hoursPerDay * 3600;
        p.tasks.push(blankTask({ title: row.title, duration: dur, effort: dur, order: p.tasks.length }));
      }
      return p;
    }),
  );
});

/** Omni Automation URL scheme: omniplan:///task/id */
app.get("/api/open", (req, res) => {
  const url = String(req.query.url || "");
  const parsed = parseOmniUrl(url);
  const state = loadState();
  const project = state.projects[0];
  const resolved = project ? resolveUrl(project, url) : { tasks: [], resources: [] };
  res.json({ parsed, resolved, projectId: project?.id });
});

app.get(/^\/omniplan\/(.*)/, (req, res) => {
  const rest = req.path.replace(/^\/omniplan\/?/, "");
  const url = `omniplan:///${rest}${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`;
  const parsed = parseOmniUrl(url);
  res.redirect(`/?url=${encodeURIComponent(url)}&kind=${parsed.kind}&ids=${parsed.ids.join(",")}`);
});

/**
 * URL.tellFunction("omniplan" | "omnifocus", fn, argument)
 * HTTP analogue used by both clones.
 */
app.post("/automation/tell", async (req, res) => {
  const { app: target = "omniplan", argument, functionName, script, projectId, selection } = req.body || {};
  try {
    if (target === "omnifocus" || target === "omnioutliner") {
      const prefs = loadState().preferences;
      const base = target === "omnifocus" ? prefs.omnifocusUrl : process.env.OMNIOUTLINER_URL;
      if (!base) {
        res.status(502).json({
          ok: false,
          errorMessage: `${target} endpoint is not configured. Set OMNIFOCUS_URL (or Preferences) for the OmniFocus clone.`,
        });
        return;
      }
      const r = await fetch(`${base.replace(/\/$/, "")}/automation/tell`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ app: target, argument, functionName, script }),
      });
      res.status(r.status).json(await r.json());
      return;
    }

    const project = getProject(projectId || loadState().projects[0]?.id);
    const ctx = automationContext(project, selection || []);
    if (functionName === "copyFromOmniFocus" || functionName === "ingestOmniFocus") {
      const { project: next, links } = ingestOmniFocusTasks(project, argument as OFToOPTaskPayload[]);
      putProject(next);
      res.json({ ok: true, result: links });
      return;
    }
    if (functionName === "taskNamed") {
      const t = project.tasks.find((x) => x.title === argument);
      res.json({ ok: true, result: t || null });
      return;
    }
    if (script) {
      const fn = new Function("document", "actual", "selection", "argument", script);
      const result = fn(ctx.document, ctx.actual, ctx.selection, argument);
      putProject(project);
      res.json({ ok: true, result });
      return;
    }
    res.json({ ok: true, result: { document: ctx.document.name, tasks: project.tasks.length } });
  } catch (err) {
    res.status(400).json({ ok: false, errorMessage: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/bridge/omnifocus/copy-tasks", async (req, res) => {
  const { projectId, taskIds } = req.body as { projectId: string; taskIds: string[] };
  const project = getProject(projectId);
  const payload = copyTasksToOmniFocusPayload(project, taskIds);
  const prefs = loadState().preferences;
  try {
    const r = await fetch(`${prefs.omnifocusUrl.replace(/\/$/, "")}/bridge/omniplan/receive-tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ argument: payload }),
    });
    if (!r.ok) throw new Error(`OmniFocus clone returned ${r.status}`);
    const body = (await r.json()) as { result?: string[] };
    const links = body.result || [];
    const next = applyOmniFocusLinks(project, taskIds, links);
    putProject(next);
    res.json({ ok: true, payload, result: links, project: next });
  } catch (err) {
    res.status(200).json({
      ok: false,
      payload,
      pending: true,
      errorMessage:
        err instanceof Error
          ? err.message
          : "OmniFocus clone not reachable. Payload is ready for /automation/tell when the OmniFocus clone is online.",
      handshake: {
        from: "omniplan",
        to: "omnifocus",
        functionName: "targetAppFunction",
        argument: payload,
        expectedReturn: "omnifocus:///task/{id}[]",
      },
    });
  }
});

app.post("/bridge/omnifocus/receive-tasks", (req, res) => {
  const project = getProject(req.body.projectId || loadState().projects[0]?.id);
  const { project: next, links } = ingestOmniFocusTasks(project, req.body.argument || req.body.tasks || []);
  putProject(next);
  res.json({ ok: true, result: links });
});

app.post("/bridge/omnifocus/pull-status", async (req, res) => {
  const project = getProject(req.body.projectId);
  const ids = project.tasks.map((t) => t.customData.OmniFocusID).filter(Boolean);
  const prefs = loadState().preferences;
  try {
    const r = await fetch(`${prefs.omnifocusUrl.replace(/\/$/, "")}/bridge/omniplan/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ OmniFocusIDs: ids }),
    });
    const updates = (await r.json()) as { updates?: { OmniFocusID: string; name?: string; completed?: boolean }[] };
    const next = applyOmniFocusStatus(project, updates.updates || []);
    putProject(next);
    res.json({ ok: true, project: next });
  } catch (err) {
    res.json({ ok: false, errorMessage: err instanceof Error ? err.message : String(err), ids });
  }
});

app.post("/bridge/omnifocus/push-updates", async (req, res) => {
  const project = getProject(req.body.projectId);
  const updates = project.tasks
    .filter((t) => t.customData.OmniFocusID)
    .map((t) => ({
      OmniFocusID: t.customData.OmniFocusID,
      name: t.title,
      dueDate: t.endDate,
      deferDate: t.startDate,
      completed: t.completion >= 100,
      plannedDate: t.startDate,
    }));
  const prefs = loadState().preferences;
  try {
    const r = await fetch(`${prefs.omnifocusUrl.replace(/\/$/, "")}/bridge/omniplan/update-tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ updates }),
    });
    res.json({ ok: r.ok, updates, status: r.status });
  } catch (err) {
    res.json({ ok: false, updates, errorMessage: err instanceof Error ? err.message : String(err) });
  }
});

function summary(p: Project) {
  const { tasks, resources, dependencies, assignments, ...rest } = p;
  return {
    ...rest,
    taskCount: tasks.length,
    resourceCount: resources.length,
    completion: tasks.filter((t) => !t.parentId).reduce((s, t) => s + t.completion, 0) / Math.max(1, tasks.filter((t) => !t.parentId).length),
  };
}

function withViolations(project: Project) {
  const { violations } = scheduleProject(structuredClone(project));
  return { ...project, violations };
}

function collect(project: Project, id: string): string[] {
  const kids = project.tasks.filter((t) => t.parentId === id).flatMap((t) => collect(project, t.uniqueID));
  return [id, ...kids];
}

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = typeof err === "object" && err && "status" in err ? Number((err as { status: number }).status) : 500;
  res.status(status || 500).json({ error: err instanceof Error ? err.message : String(err) });
});

const webDist = join(__dirname, "../../web/dist");
const webRoot = join(__dirname, "../../web");
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get(/^(?!\/api\/|\/automation\/|\/bridge\/|\/omniplan\/).*/, (_req, res) => {
    res.sendFile(join(webDist, "index.html"));
  });
} else if (existsSync(join(webRoot, "index.html"))) {
  app.use(express.static(webRoot));
}

return app;
}

export function startServer(port = PORT, host = "127.0.0.1"): Promise<{ port: number; close: () => Promise<void> }> {
  const app = createApp();
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => {
      console.log(`OmniPlan ${loadState().version} API on http://${host}:${port}`);
      resolve({
        port,
        close: () =>
          new Promise((res, rej) => {
            server.close((err) => (err ? rej(err) : res()));
          }),
      });
    });
    server.on("error", reject);
  });
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  startServer(PORT, "0.0.0.0").catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
