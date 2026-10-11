/*
 * Starts Expo with a deliberately explicit, process-scoped demo flag.
 * No .env file is written or changed by this helper.
 */
const { spawn } = require('child_process');
const path = require('path');

const expoBinary = process.platform === 'win32'
  ? path.join(__dirname, '..', 'node_modules', '.bin', 'expo.cmd')
  : path.join(__dirname, '..', 'node_modules', '.bin', 'expo');

const args = process.argv.slice(2);
const child = spawn(expoBinary, ['start', ...args], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  env: {
    ...process.env,
    EXPO_PUBLIC_DEMO_MODE: 'true',
  },
});

child.on('error', (error) => {
  console.error('Could not start Expo demo mode. Run npm ci first, then retry.', error.message);
  process.exitCode = 1;
});

child.on('exit', (code, signal) => {
  if (signal) process.exitCode = 1;
  else process.exitCode = code || 0;
});
