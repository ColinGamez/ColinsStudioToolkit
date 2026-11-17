import { mkdtemp, cp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const config = JSON.parse(await readFile(path.join(root, 'src/billing-config.json'), 'utf8'));
if (pkg.name !== 'colins-developer-toolkit' || pkg.extensionPack?.length || pkg.extensionDependencies?.length) throw new Error('Expected the self-contained toolkit.');
if (config.test !== false || !config.origin.startsWith('https://') || !config.publicKey.includes('PUBLIC KEY')) throw new Error('Expected public live billing configuration.');
const temp = await mkdtemp(path.join(tmpdir(), 'colins-toolkit-'));
const output = path.join(root, 'dist', `${pkg.name}-${pkg.version}.vsix`);
try {
  const excluded = new Set(['.git', '.github', 'node_modules', 'dist', 'artifacts', 'private', '.vercel', 'themes', 'fileicons']);
  await cp(root, temp, { recursive: true, filter: source => {
    if (source === root || source === root.replace(/[\\/]$/, '')) return true;
    const relative = path.relative(root, source);
    return !excluded.has(relative.split(path.sep)[0]) && !path.basename(source).startsWith('.env') && !source.endsWith('.vsix') && !path.basename(source).includes('.local.');
  } });
  delete pkg.contributes.themes;
  delete pkg.contributes.iconThemes;
  await writeFile(path.join(temp, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
  await mkdir(path.dirname(output), { recursive: true });
  const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['--yes', '@vscode/vsce@4.1.1', 'package', '--no-dependencies', '--out', process.platform === 'win32' ? `"${output}"` : output], { cwd: temp, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error || result.status !== 0) throw result.error || new Error(`Packaging failed (${result.status})`);
} finally {
  // mkdtemp creates this exact isolated directory; never remove the checkout.
  if (path.dirname(path.resolve(temp)) !== path.resolve(tmpdir()) || !path.basename(temp).startsWith('colins-toolkit-')) throw new Error('Unexpected temporary directory.');
  await rm(temp, { recursive: true, force: true });
}
