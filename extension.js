const { initLicense } = require("./src/suiteLicense");
const { registerQuickActions } = require("./src/suiteRuntime");
const { registerBugReportBuilder } = require("./src/bugReportBuilder");
const { registerCommandCenter } = require("./src/commandCenter");
const { registerLaunchPad } = require("./src/launchPad");
const { registerReadmeStudio } = require("./src/readmeStudio");
const { registerSnippetForge } = require("./src/snippetForge");
const { registerThemeReactor } = require("./src/themeReactor");

function activate(context) {
  initLicense(context);
  registerQuickActions(context);
  registerBugReportBuilder(context);
  registerCommandCenter(context);
  registerLaunchPad(context);
  registerReadmeStudio(context);
  registerSnippetForge(context);
  registerThemeReactor(context);
}

function deactivate() {}

module.exports = { activate, deactivate };
