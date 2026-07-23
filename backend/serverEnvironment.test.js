const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { spawnSync } = require('child_process');

test('server exits immediately when required environment variables are empty', () => {
  const result = spawnSync(process.execPath, [path.join(__dirname, 'server.js')], {
    cwd: __dirname,
    env: {
      ...process.env,
      JWT_SECRET: '',
      MONGO_URI: '',
      GOOGLE_CLIENT_ID: '',
    },
    encoding: 'utf8',
    timeout: 10_000,
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /\[FATAL\].*JWT_SECRET.*MONGO_URI.*GOOGLE_CLIENT_ID/i);
});
