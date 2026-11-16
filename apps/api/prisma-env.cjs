const path = require('node:path');
const { spawnSync } = require('node:child_process');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const [tool, ...args] = process.argv.slice(2);
const entrypoints = {
  prisma: require.resolve('prisma'),
  'ts-node': require.resolve('ts-node/dist/bin.js'),
};

if (!entrypoints[tool]) {
  console.error(`Unsupported API tool: ${tool || '(missing)'}`);
  process.exit(1);
}

const result = spawnSync(process.execPath, [entrypoints[tool], ...args], {
  cwd: __dirname,
  env: process.env,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
