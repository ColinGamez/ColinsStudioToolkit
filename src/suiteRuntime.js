const vscode = require('vscode');
const { requireAccess } = require('./suiteLicense');

function registerSafeCommand(id, handler) {
  return vscode.commands.registerCommand(id, async (...args) => {
    try {
      if (!id.endsWith('.quickActions') && !await requireAccess()) return undefined;
      return await handler(...args);
    } catch (error) {
      const message = typeof error?.message === 'string' ? error.message : String(error);
      console.error(`[${id}]`, error);
      await vscode.window.showErrorMessage(`Colin's tools: ${message}`);
      return undefined;
    }
  });
}

function registerQuickActions(context) {
  const pkg = context.extension.packageJSON;
  const id = `${pkg.name}.quickActions`;
  const key = `${pkg.name}.recentCommands`;
  context.subscriptions.push(registerSafeCommand(id, async () => {
    const recent = context.globalState.get(key, []);
    const commands = (pkg.contributes?.commands || []).filter(command => command.command !== id);
    commands.sort((a, b) => {
      const rank = command => recent.includes(command.command) ? recent.indexOf(command.command) : 999;
      return rank(a) - rank(b) || a.title.localeCompare(b.title);
    });
    const selected = await vscode.window.showQuickPick(commands.map(command => ({
      label: command.title,
      description: recent.includes(command.command) ? 'Recently used' : command.category,
      command: command.command
    })), { title: pkg.displayName, placeHolder: 'Search actions', matchOnDescription: true });
    if (!selected) return;
    await context.globalState.update(key, [selected.command, ...recent.filter(value => value !== selected.command)].slice(0, 5));
    return vscode.commands.executeCommand(selected.command);
  }));
}

module.exports = { registerSafeCommand, registerQuickActions };
