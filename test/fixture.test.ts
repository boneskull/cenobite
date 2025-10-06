/**
 * This test must be run w/o `test`/`it` from `node:test` because in Node.js v22
 * it will cause problems due to the nesting.
 */

import 'ses';
import { expect } from 'bupkis';

import { initializeSES, runTestFile } from '../src/cli.js';

initializeSES();

runTestFile('test/fixture/basic/test/index.test.js', {
  verbose: false,
}).then((result) => {
  expect(result, 'to be an object');
  expect(result, 'to satisfy', {
    namespace: expect.it('to be an object'),
  });
});
