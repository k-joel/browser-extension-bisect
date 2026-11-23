import { spawn } from 'node:child_process';
import { realpathSync } from 'node:fs';
import path from 'node:path';

const normalizedCwd = realpathSync.native(process.cwd());
const vitestBin = path.join(normalizedCwd, 'node_modules', 'vitest', 'vitest.mjs');

const child = spawn(process.execPath, [vitestBin, 'run', ...process.argv.slice(2)], {
  cwd: normalizedCwd,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal !== null) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
