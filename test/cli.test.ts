import { expect, expectAsync } from 'bupkis';
import { test } from 'node:test';

import { initializeSES, runTestFile } from '../src/cli.js';

// Initialize SES once for all tests
let sesInitialized = false;
const ensureSESInitialized = () => {
  if (!sesInitialized) {
    initializeSES();
    sesInitialized = true;
  }
};

test('initializeSES should configure SES', () => {
  expect(initializeSES, 'to be a function');

  // Should not throw when called for the first time
  expect(() => ensureSESInitialized(), 'not to throw');
});

test('runTestFile should be a function', () => {
  expect(runTestFile, 'to be a function');
});

test('runTestFile should execute a test file successfully', async () => {
  ensureSESInitialized();

  const result = await runTestFile('test/fixture/basic/test/index.test.js', {
    verbose: false,
  });

  expect(result, 'to be an object');
  expect(result, 'to satisfy', {
    namespace: expect.it('to be an object'),
  });
});

test('runTestFile should handle invalid file paths', async () => {
  ensureSESInitialized();

  await expectAsync(
    async () => runTestFile('nonexistent/file.js'),
    'to reject with error satisfying',
    /Failed to load module/,
  );
});
