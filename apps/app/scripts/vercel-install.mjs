import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function findWorkspaceRoot(startDir) {
  let currentDir = startDir;
  const { root } = path.parse(currentDir);

  while (true) {
    const hasWorkspace = existsSync(path.join(currentDir, 'pnpm-workspace.yaml'));
    const hasPackageJson = existsSync(path.join(currentDir, 'package.json'));

    if (hasWorkspace && hasPackageJson) {
      return currentDir;
    }

    if (currentDir === root) {
      throw new Error(`Unable to locate monorepo root from ${startDir}`);
    }

    currentDir = path.dirname(currentDir);
  }
}

const workspaceRoot = findWorkspaceRoot(process.cwd());

const result = spawnSync(
  'npx',
  ['-y', 'pnpm@10.27.0', 'install', '--no-frozen-lockfile'],
  {
    cwd: workspaceRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  }
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
