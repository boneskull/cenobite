import { expect } from 'bupkis';
import { test } from 'node:test';

import { runTestsWithCenobiteWrappers } from '../src/wrapper-integration.js';

test('wrapper integration should create test stream', async () => {
  const testStream = await runTestsWithCenobiteWrappers({
    enableSourceMaps: true,
    files: ['test/fixture/basic/test/index.test.js'],
    reporter: 'tap',
    verbose: false,
  });

  expect(testStream, 'to be an object');
  expect(testStream.on, 'to be a function');
  expect(testStream.emit, 'to be a function');
});

test('wrapper integration should support spec reporter', async () => {
  const testStream = await runTestsWithCenobiteWrappers({
    enableSourceMaps: true,
    files: ['test/fixture/basic/test/index.test.js'],
    reporter: 'spec',
    verbose: false,
  });

  expect(testStream, 'to be an object');
  expect(testStream.on, 'to be a function');
});

test('wrapper integration should support dot reporter', async () => {
  const testStream = await runTestsWithCenobiteWrappers({
    enableSourceMaps: true,
    files: ['test/fixture/basic/test/index.test.js'],
    reporter: 'dot',
    verbose: false,
  });

  expect(testStream, 'to be an object');
  expect(testStream.on, 'to be a function');
});

test('wrapper integration should support junit reporter', async () => {
  const testStream = await runTestsWithCenobiteWrappers({
    enableSourceMaps: true,
    files: ['test/fixture/basic/test/index.test.js'],
    reporter: 'junit',
    verbose: false,
  });

  expect(testStream, 'to be an object');
  expect(testStream.on, 'to be a function');
});
