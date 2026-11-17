const vscode = require('vscode');
const { verify, createHash } = require('node:crypto');
const config = require('./billing-config.json');
const SECRET = 'colinsSuite.lifetimePurchase';
const SUITE = 'colins-marketplace-suite';
const PRODUCTS = ['colins-developer-toolkit', 'my-vsc-themes', 'colins-theme-switcher', 'bug-report-builder', 'colins-launch-pad', 'colins-readme-studio', 'project-command-center', 'snippet-forge'];
let manager;

function errorMessage(error) {
  return typeof error === 'string' ? error : typeof error?.message === 'string' ? error.message : 'An unexpected error occurred.';
}

function validateLicense(token, publicKey, product, testMode, now = Date.now()) {
  try {
    const [body, signature, extra] = String(token).split('.');
    if (!body || !signature || extra || !verify(null, Buffer.from(body), publicKey, Buffer.from(signature, 'base64url'))) return undefined;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    const seconds = Math.floor(now / 1000);
    if (payload.version !== 1 || payload.suite !== SUITE || payload.lifetime !== true || payload.test !== testMode || !payload.products?.includes(product) || !Number.isFinite(payload.expiresAt) || payload.expiresAt <= seconds || payload.issuedAt > seconds + 300) return undefined;
    return payload;
  } catch { return undefined; }
}

function initLicense(context) {
  const product = context.extension.packageJSON.name;
  let cached;
  let loading;
  let rejected = false;
  async function requestLicense(key) {
    const response = await fetch(`${config.origin}/api/license`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }), signal: AbortSignal.timeout(20000) });
    const data = await response.json();
    if (!response.ok) { const error = new Error(data.error || 'Activation failed.'); error.revoked = response.status === 403; throw error; }
    const payload = validateLicense(data.license, config.publicKey, product, config.test);
    if (!payload || payload.purchase !== createHash('sha256').update(key).digest('hex')) throw new Error('The license could not be verified.');
    return { token: data.license, payload };
  }
  async function stored() {
    if (cached) return cached;
    try { cached = JSON.parse(await context.secrets.get(SECRET) || 'null'); } catch { cached = undefined; }
    return cached;
  }
  async function refresh() {
    const saved = await stored();
    const payload = saved && validateLicense(saved.token, config.publicKey, product, config.test);
    if (!saved?.key) return false;
    if (payload && payload.purchase !== createHash('sha256').update(saved.key).digest('hex')) return false;
    if (payload && payload.refreshAfter > Date.now() / 1000) return true;
    try {
      const result = await requestLicense(saved.key);
      cached = { key: saved.key, token: result.token };
      await context.secrets.store(SECRET, JSON.stringify(cached));
      rejected = false;
      return true;
    } catch (error) {
      if (error.revoked) { rejected = true; cached = undefined; await context.secrets.delete(SECRET); return false; }
      return Boolean(payload && !rejected);
    }
  }
  async function entitled() {
    if (!loading) loading = refresh().finally(() => { loading = undefined; });
    return loading;
  }
  async function activate(options = {}) {
    const key = options.key || await vscode.window.showInputBox({ title: "Activate Colin's Lifetime Bundle", prompt: 'Paste the purchase key from your checkout confirmation. One purchase unlocks the complete Developer Toolkit.', password: true, ignoreFocusOut: true });
    if (!key?.trim()) return false;
    const result = await requestLicense(key.trim());
    cached = { key: key.trim(), token: result.token };
    rejected = false;
    await context.secrets.store(SECRET, JSON.stringify(cached));
    if (options.propagate !== false) {
      for (const extension of vscode.extensions.all) {
        if (extension.packageJSON?.publisher !== 'ColinGamez' || extension.id === context.extension.id) continue;
        const name = extension.packageJSON.name;
        if (!PRODUCTS.includes(name) || extension.id.toLowerCase() !== `colingamez.${name}`) continue;
        const command = extension.packageJSON?.contributes?.commands?.find(item => item.command === `${name}.license.activate`)?.command;
        if (command) await vscode.commands.executeCommand(command, { key: key.trim(), propagate: false });
      }
      await vscode.window.showInformationMessage(config.test ? 'Test lifetime bundle activated. No real money was charged.' : 'Lifetime bundle activated for your installed ColinGamez tools.');
    }
    return true;
  }
  async function installThemes() {
    if (!await entitled() && !await requireAccess()) return false;
    const saved = await stored();
    const response = await fetch(`${config.origin}/api/themes`, { method: 'POST', headers: { Authorization: `Bearer ${saved.key}` }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error('Could not download the licensed themes. Check your connection and purchase status.');
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 4000000 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('The theme download was not a valid extension package.');
    const payload = validateLicense(saved.token, config.publicKey, product, config.test);
    if (!payload?.themeSha256 || createHash('sha256').update(bytes).digest('hex') !== payload.themeSha256) throw new Error('Theme package verification failed. Activate your purchase again to refresh the download signature.');
    await vscode.workspace.fs.createDirectory(context.globalStorageUri);
    const file = vscode.Uri.joinPath(context.globalStorageUri, 'colins-licensed-themes.vsix');
    await vscode.workspace.fs.writeFile(file, bytes);
    try {
      await vscode.commands.executeCommand('workbench.extensions.installExtension', file);
    } catch (error) {
      const action = await vscode.window.showWarningMessage(`The theme download is verified, but VS Code could not install it: ${errorMessage(error)}. Use Extensions: Install from VSIX to install the saved package.`, 'Copy Download Path');
      if (action === 'Copy Download Path') await vscode.env.clipboard.writeText(file.fsPath);
      return false;
    }
    await vscode.window.showInformationMessage('Licensed themes installed. Choose a theme using Color Theme in VS Code.');
  }
  async function requireAccess(silent = false) {
    if (await entitled()) return true;
    if (silent) return false;
    const action = await vscode.window.showInformationMessage("Unlock the complete Developer Toolkit with one lifetime payment of CAD $14.99.", 'Buy Lifetime Bundle', 'Activate Purchase');
    if (action === 'Buy Lifetime Bundle') await vscode.env.openExternal(vscode.Uri.parse(config.origin));
    if (action === 'Activate Purchase') return activate();
    return false;
  }
  async function deactivate() {
    cached = undefined;
    rejected = true;
    await context.secrets.delete(SECRET);
    await vscode.window.showInformationMessage('Purchase key removed from this extension. Your lifetime purchase is unchanged.');
  }
  const handlers = {
    buy: () => vscode.env.openExternal(vscode.Uri.parse(config.origin)),
    activate,
    status: async () => vscode.window.showInformationMessage(await entitled() ? 'Lifetime bundle active. No subscription. Offline access refreshes online periodically.' : 'Lifetime bundle is not activated in this extension.'),
    deactivate,
    installThemes
  };
  for (const [action, handler] of Object.entries(handlers)) {
    context.subscriptions.push(vscode.commands.registerCommand(`${product}.license.${action}`, async (...args) => {
      try { return await handler(...args); }
      catch (error) { await vscode.window.showErrorMessage(errorMessage(error)); return false; }
    }));
  }
  manager = { requireAccess, entitled };
  return manager;
}

async function requireAccess(silent = false) {
  // Fail closed until the extension entry point initializes licensing.
  return manager ? manager.requireAccess(silent) : false;
}

module.exports = { initLicense, requireAccess, validateLicense };
