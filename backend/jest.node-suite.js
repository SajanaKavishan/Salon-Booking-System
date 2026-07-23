const { spawn } = require('node:child_process');

jest.setTimeout(120000);

test('backend node:test suite passes', async () => {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--test'], {
      cwd: __dirname,
      env: process.env,
      stdio: 'inherit',
    });

    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(
        signal
          ? `Backend test process terminated by signal ${signal}.`
          : `Backend test process exited with code ${code}.`
      ));
    });
  });
});
