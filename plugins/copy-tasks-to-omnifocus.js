/*{
  "type": "action",
  "targets": ["omniplan"],
  "author": "Otto Automator",
  "identifier": "com.omni-automation.op.copy-tasks-to-omnifocus",
  "version": "1.2",
  "description": "This action will create copies of the selected OmniPlan tasks in OmniFocus.",
  "label": "Copy Selected Tasks to OmniFocus",
  "shortLabel": "Copy to OmniFocus",
  "paletteLabel": "Copy to OmniFocus",
  "image": "doc.on.doc.fill"
}*/
/**
 * Official Omni Automation plug-in (omni-automation.com/omniplan/app-to-app.html).
 * This clone executes the same payload over POST /bridge/omnifocus/copy-tasks
 * and POST /automation/tell { app: "omnifocus", argument }.
 *
 * The OmniFocus clone must implement targetAppFunction(arg) exactly as below.
 */
export function targetAppFunction(arg) {
  const OFTaskLinks = [];
  arg.forEach((taskDataObj) => {
    // OmniFocus: new Task(title); note; dueDate; tagNamed(project) || new Tag(project)
    OFTaskLinks.push("omnifocus:///task/" + (taskDataObj.OFtaskID || taskDataObj.OPtaskTitle));
  });
  return OFTaskLinks;
}

export function omniPlanArgument(projectName, tasks) {
  return tasks.map((t) => ({
    OPprojectName: projectName,
    OPtaskTitle: t.title,
    OPtaskNote: (t.note ? t.note + "\n" : "") + "omniplan:///task/" + t.uniqueID,
    OPtaskDueDate: t.endDate,
  }));
}
