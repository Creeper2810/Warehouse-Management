const required = { major: 22, minor: 22, patch: 0 };
const current = process.versions.node.split('.').map(Number);

const ok =
  current[0] > required.major ||
  (current[0] === required.major && current[1] > required.minor) ||
  (current[0] === required.major && current[1] === required.minor && current[2] >= required.patch);

if (!ok) {
  console.error(`Node.js ${required.major}.${required.minor}.${required.patch} or newer is required for this project.`);
  console.error(`Current Node.js: ${process.versions.node}`);
  console.error('Node.js 22.21.0 has a Vite HTTPS/HMR crash: server.shouldUpgradeCallback is not a function.');
  process.exit(1);
}
