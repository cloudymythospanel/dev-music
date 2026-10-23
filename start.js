const { spawn } = require('child_process');

console.log('Starting DEV MUSIC Streaming Engine & Expo Server...');

const server = spawn('node', ['server.js'], { stdio: 'inherit', shell: true });
const expo = spawn('npx', ['expo', 'start', '-c'], { stdio: 'inherit', shell: true });

process.on('SIGINT', () => {
  server.kill();
  expo.kill();
  process.exit();
});
