# OmniPlan

An OmniPlan 4 clone: Gantt / outline / network / resource views, inspectors, preferences, a CPM scheduler, and the same OmniFocus cross-app contract Omni Automation uses.

This is not affiliated with The Omni Group. UI, menus, inspectors, and integration follow [OmniPlan 4.10.3](https://www.omnigroup.com/omniplan) and the published [Omni Automation app-to-app](https://omni-automation.com/omniplan/app-to-app.html) protocol so a future OmniFocus clone can plug in without a custom mapping layer.

## Run

```bash
npm install
npm run dev          # API :4455  ·  UI :5173 (proxied)
npm test
npx tsx src/cli/index.ts --help
```

Production-style: `npm run build && PORT=4455 npm start` (serves `web/dist` from the API).

## Desktop app (Electron)

Build native installers (bundles the API + UI; documents live in the OS user-data folder):

```bash
npm install
npm run build:electron:linux   # AppImage + .deb
npm run build:electron:mac     # .dmg + .zip (on macOS)
npm run build:electron:win     # NSIS .exe (on Windows)
```

Artifacts land in `release/`:

| Platform | Files |
|---|---|
| Linux | `OmniPlan-4.10.3.AppImage`, `omniplan_4.10.3_amd64.deb` |
| macOS | `OmniPlan-4.10.3.dmg` |
| Windows | `OmniPlan Setup 4.10.3.exe` |

Install examples:

```bash
# Linux AppImage (portable)
chmod +x release/OmniPlan-4.10.3.AppImage
./release/OmniPlan-4.10.3.AppImage

# Linux Debian/Ubuntu
sudo dpkg -i release/omniplan_4.10.3_amd64.deb
```

Run in development without packaging:

```bash
npm run dev:api    # terminal 1
npm run electron   # terminal 2 (after API is up)
```

User projects are stored at `~/.config/OmniPlan/data/` on Linux (Electron `userData`).


### Views (View menu / toolbar switcher)

| View | Shortcut | Notes |
|---|---|---|
| Outline | ⌥⌘1 | Hierarchical/flat numbering, indent/outdent, customizable columns |
| Gantt | ⌥⌘2 | Task outline + chart, dependency drag, slack, critical path, weekends, today line |
| Network | ⌥⌘3 | PERT-style nodes and dependency edges |
| Resource | ⌥⌘4 | Staff / equipment / material list + assignment timeline |

Also: overview strip, filter bar, violations, multi-project dashboard, New Project Assistant.

### Inspectors (Inspectors menu / ⌘⇧I)

Project (title, timeline direction, T-day dates, granularity, summary, formats, effort conversions, document type) · Milestones / critical paths · Task (info, schedule automatic/manual, constraints, ASAP/ALAP, dependencies FS/FF/SS/SF, assignments, allocation, estimated effort, scheduling influences) · Resource · Styles · Custom Data (notes, key/values, **OmniFocusID**).

### Preferences (OmniPlan → Preferences / ⌘,)

General (Tab indents vs next cell, Return creates row, indent into groups) · Display (first weekday, fiscal year, appearance, Gantt header tokens) · Templates (Standard, Standard Styled, Simple) · Reports · Update · **OmniFocus** (clone base URL).

### Scheduling (Project menu)

Automatic schedule from duration, dependencies, constraints, and assignments · resource leveling · catch up · reschedule incomplete work · baselines · hammock tasks · milestones · split chunks · Monte Carlo (PERT) · earned value (BAC/PV/EV/AC/CPI/SPI/EAC).

## CLI

The `omniplan` CLI talks to the same store/API as the UI:

```bash
npx tsx src/cli/index.ts projects
npx tsx src/cli/index.ts tasks
npx tsx src/cli/index.ts task "Write spec" --duration 2d
npx tsx src/cli/index.ts connect 12 13 --type FS
npx tsx src/cli/index.ts level
npx tsx src/cli/index.ts simulate -n 200
npx tsx src/cli/index.ts export --format csv
npx tsx src/cli/index.ts url 'omniplan:///task/14,22'
npx tsx src/cli/index.ts copy-to-omnifocus 12 13
npx tsx src/cli/index.ts tell omnifocus --function targetAppFunction --argument '[]'
```

## HTTP API

Base URL: `http://127.0.0.1:4455` (override with `PORT` / `OMNIPLAN_URL`).

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/projects` | List |
| GET/PUT/PATCH | `/api/projects/:id` | Document |
| POST | `/api/projects/:id/tasks` | Add task |
| POST | `/api/projects/:id/level` | Resource level |
| POST | `/api/projects/:id/simulate` | Monte Carlo |
| GET | `/api/projects/:id/export/{csv,ics,html,json}` | Export |
| GET | `/api/open?url=omniplan:///task/14` | Resolve URL scheme |
| POST | `/automation/tell` | `URL.tellFunction` analogue |
| POST | `/bridge/omnifocus/copy-tasks` | Official OP→OF copy |
| POST | `/bridge/omnifocus/receive-tasks` | Official OF→OP copy |
| POST | `/bridge/omnifocus/pull-status` | OmniPlanFocusSync pull |
| POST | `/bridge/omnifocus/push-updates` | OmniPlanFocusSync push |

## OmniFocus integration (same as both apps)

OmniPlan and OmniFocus do not sync natively. Integration is **Omni Automation**: `URL.tellFunction(app, fn, argument).call(success, error)` plus URL schemes. This clone implements that contract over HTTP so an OmniFocus clone can be a drop-in peer.

### URL schemes

```
omniplan:///task/{uniqueID}
omniplan:///task/{id,id}
omniplan:///task?title=Clean%20Up
omniplan:///resource/{uniqueID}
omnifocus:///task/{primaryKey}
```

`Edit → Copy Link to Task` copies `omniplan:///task/id`. Opening it selects the task (query `?url=` or `/omniplan/task/id`).

### Copy OmniPlan → OmniFocus

Plug-in id: `com.omni-automation.op.copy-tasks-to-omnifocus` v1.2

Payload (one object per selected task):

```json
{
  "OPprojectName": "Atlas 4.0 Release",
  "OPtaskTitle": "Launch checklist",
  "OPtaskNote": "…\nomniplan:///task/22",
  "OPtaskDueDate": "2026-10-01T17:00:00.000Z"
}
```

OmniFocus creates `new Task(title)`, sets `note`, `dueDate`, adds a tag named after the OmniPlan project, returns `omnifocus:///task/{id}` which OmniPlan appends to the originating note.

### Copy OmniFocus → OmniPlan

Plug-in id: `com.omni-automation.of.op.copy-tasks-to-omniplan` v1.2

```json
{
  "OFtaskTitle": "Call vendor",
  "OFtaskNote": "…\nomnifocus:///task/gRAODj8WNwd",
  "OFtaskDueDate": "2026-09-01T00:00:00.000Z"
}
```

OmniPlan: `actual.rootTask.addSubtask()`, set `title`, `note`, `endNoLaterThanDate`, return `omniplan:///task/{uniqueID}`.

### Linked sync (OmniPlanFocusSync)

Custom data key **`OmniFocusID`**. Pull completion/name; push title, due, defer, completion, planned date.

### What the OmniFocus clone must implement

Point OmniPlan Preferences → OmniFocus at the clone (`OMNIFOCUS_URL`, default `http://127.0.0.1:4456`):

1. `POST /automation/tell` — execute `targetAppFunction(argument)` and return `{ ok, result }`.
2. `POST /bridge/omniplan/receive-tasks` — body `{ argument: OPToOFTaskPayload[] }`, return `{ result: string[] }` of `omnifocus:///task/id`.
3. `POST /bridge/omniplan/status` — body `{ OmniFocusIDs }`, return `{ updates: [{ OmniFocusID, name, completed, dueDate }] }`.
4. `POST /bridge/omniplan/update-tasks` — body `{ updates: [{ OmniFocusID, name, dueDate, deferDate, completed, plannedDate }] }`.
5. Resolve `omnifocus:///task/{id}`.

Until that clone exists, Copy to OmniFocus still builds the official payload and records a pending handshake.

## Data

Documents live in `data/omniplan.json` (override with `OMNIPLAN_DATA`). Seed with `npx tsx src/cli/index.ts seed`.
