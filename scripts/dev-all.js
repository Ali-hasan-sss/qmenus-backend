const { spawn } = require('child_process');

const services = [
  { name: 'api-service', cwd: './api-service' },
  { name: 'socket-service', cwd: './socket-service' },
  { name: 'jobs-service', cwd: './jobs-service' },
];

const procs = [];

function startService({ name, cwd }) {
  const cmd = 'npm run dev';
  const child = spawn(cmd, {
    cwd,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' },
  });
  child.on('exit', (code, signal) => {
    console.log(`[${name}] exited with code ${code} signal ${signal}`);
  });
  procs.push(child);
}

function shutdown() {
  console.log('\nShutting down services...');
  procs.forEach((p) => {
    if (p && !p.killed) {
      try { p.kill('SIGINT'); } catch (_) {}
    }
  });
  // Give children a moment to exit
  setTimeout(() => process.exit(0), 500);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

services.forEach(startService);
