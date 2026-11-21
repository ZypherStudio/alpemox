import { spawn } from 'node:child_process';

const procs = [
  spawn('npm', ['--workspace=@opencraft/server', 'run', 'dev'], { stdio: 'inherit' }),
  spawn('npm', ['--workspace=@opencraft/studio', 'run', 'dev'], { stdio: 'inherit' }),
];

const shutdown = () => {
  for (const p of procs) {
    p.kill('SIGTERM');
  }
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
