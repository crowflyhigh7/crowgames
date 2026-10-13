import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'dist');
if (dirname(output) !== root || output === root) {
  throw new Error('Build output must be inside the project directory.');
}

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

// Copy only public assets so local credentials and tooling cannot be deployed.
for (const name of ['index.html', 'styles.css', '_headers']) {
  cpSync(join(root, name), join(output, name));
}
cpSync(join(root, 'shared'), join(output, 'shared'), { recursive: true });

const excluded = new Set(['dist', 'node_modules', 'scripts', 'shared']);
let gameCount = 0;
for (const entry of readdirSync(root, { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.name.startsWith('.') || excluded.has(entry.name)) {
    continue;
  }
  const source = join(root, entry.name);
  if (existsSync(join(source, 'index.html'))) {
    cpSync(source, join(output, entry.name), { recursive: true });
    gameCount += 1;
  }
}

console.log(`Prepared site with ${gameCount} games in dist.`);
