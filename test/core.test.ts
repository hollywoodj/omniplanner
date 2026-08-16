import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseDuration, formatDuration } from "../src/core/duration.js";
import { blankProject } from "../src/core/factory.js";
import { addWorkSeconds, workSecondsBetween } from "../src/core/calendar.js";
import { sampleAtlasRelease, simpleProject } from "../src/core/sample.js";
import { scheduleProject, outlineNumber } from "../src/core/scheduler.js";
import { levelResources } from "../src/core/leveling.js";
import { monteCarlo, autoEstimate } from "../src/core/montecarlo.js";
import { earnedValue } from "../src/core/eva.js";
import { appendLinkToNote, parseOmniUrl, taskUrl } from "../src/core/bridge.js";
import { copyTasksToOmniFocusPayload, ingestOmniFocusTasks, applyOmniFocusLinks } from "../src/core/automation.js";
import { blankTask, makeDependency } from "../src/core/factory.js";

const p = blankProject({ hoursPerDay: 8, hoursPerWeek: 40, durationUnits: ["d", "h"] });

describe("duration", () => {
  it("parses OmniPlan duration tokens", () => {
    assert.equal(parseDuration("2d", p).seconds, 2 * 8 * 3600);
    assert.equal(parseDuration("4h", p).seconds, 4 * 3600);
    assert.equal(parseDuration("48eh", p).elapsed, true);
    assert.match(formatDuration(8 * 3600, p), /1d/);
  });
});

describe("calendar", () => {
  it("skips weekends when adding work time", () => {
    const friday = new Date("2026-08-14T08:00:00");
    const end = addWorkSeconds(friday, 10 * 3600, p);
    assert.equal(end.getDay(), 1);
  });
});

describe("scheduler", () => {
  it("honors FS dependencies", () => {
    const a = blankTask({ uniqueID: "1", title: "A", duration: 8 * 3600, effort: 8 * 3600, order: 0 });
    const b = blankTask({ uniqueID: "2", title: "B", duration: 8 * 3600, effort: 8 * 3600, order: 1 });
    const proj = blankProject({
      startDate: new Date("2026-08-17T08:00:00").toISOString(),
      tasks: [a, b],
      dependencies: [makeDependency("1", "2", "FS")],
    });
    const { project } = scheduleProject(proj);
    const ta = project.tasks.find((t) => t.uniqueID === "1")!;
    const tb = project.tasks.find((t) => t.uniqueID === "2")!;
    assert.ok(new Date(tb.startDate) >= new Date(ta.endDate));
  });

  it("marks a lone task as critical", () => {
    const proj = simpleProject();
    assert.ok(proj.tasks.some((t) => t.critical || t.type === "milestone"));
    assert.equal(outlineNumber(proj, proj.tasks[0].uniqueID, "hierarchical"), "1");
  });

  it("schedules the Atlas sample without throwing", () => {
    const proj = sampleAtlasRelease();
    assert.ok(proj.tasks.length > 10);
    assert.ok(proj.tasks.every((t) => t.startDate && t.endDate));
    const { violations } = scheduleProject(structuredClone(proj));
    assert.ok(Array.isArray(violations));
  });
});

describe("leveling & analytics", () => {
  it("levels resources", () => {
    const proj = levelResources(sampleAtlasRelease());
    assert.ok(proj.tasks.length);
  });
  it("runs Monte Carlo", () => {
    const proj = autoEstimate(sampleAtlasRelease());
    const r = monteCarlo(proj, 20);
    assert.equal(r.iterations, 20);
    assert.ok(r.milestones.length >= 1);
  });
  it("computes EVA", () => {
    const ev = earnedValue(sampleAtlasRelease());
    assert.ok(ev.bac >= 0);
    assert.ok(ev.cpi > 0);
  });
});

describe("OmniFocus bridge (Omni Automation contract)", () => {
  it("parses omniplan:///task URLs", () => {
    const u = parseOmniUrl("omniplan:///task/14,22");
    assert.equal(u.app, "omniplan");
    assert.equal(u.kind, "task");
    assert.deepEqual(u.ids, ["14", "22"]);
    assert.equal(taskUrl("omnifocus", "gRAODj8WNwd"), "omnifocus:///task/gRAODj8WNwd");
  });

  it("builds Copy to OmniFocus payload keys", () => {
    const proj = sampleAtlasRelease();
    const id = proj.tasks.find((t) => t.type === "task")!.uniqueID;
    const payload = copyTasksToOmniFocusPayload(proj, [id]);
    assert.equal(payload[0].OPprojectName, proj.title);
    assert.ok(payload[0].OPtaskTitle);
    assert.match(payload[0].OPtaskNote, /omniplan:\/\/\/task\//);
    assert.ok(payload[0].OPtaskDueDate);
  });

  it("round-trips OmniFocus ingest + back-links", () => {
    const proj = simpleProject();
    const { project, links } = ingestOmniFocusTasks(proj, [
      { OFtaskTitle: "Call vendor", OFtaskNote: "omnifocus:///task/abc", OFtaskDueDate: new Date().toISOString(), OFtaskID: "abc" },
    ]);
    assert.match(links[0], /^omniplan:\/\/\/task\//);
    const linked = applyOmniFocusLinks(project, [project.tasks.at(-1)!.uniqueID], ["omnifocus:///task/abc"]);
    const note = linked.tasks.at(-1)!.note;
    assert.ok(note.includes("omnifocus:///task/abc"));
    assert.equal(linked.tasks.at(-1)!.customData.OmniFocusID, "abc");
    assert.equal(appendLinkToNote("hi", "omniplan:///task/1"), "hi\nomniplan:///task/1");
  });
});

describe("workSecondsBetween", () => {
  it("is zero when end equals start", () => {
    const d = new Date("2026-08-17T08:00:00");
    assert.equal(workSecondsBetween(d, d, p), 0);
  });
});
