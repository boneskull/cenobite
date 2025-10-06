import { expect } from 'bupkis';
import { test } from 'node:test';

test('basic compartmentalized test', () => {
  expect(2 + 2, 'to equal', 4);
  globalThis.console.log('✅ Math works in compartment');
});

test('compartment has console', () => {
  expect(typeof globalThis.console.log, 'to equal', 'function');
  globalThis.console.log('✅ Console available in compartment');
});

test('compartment isolation', () => {
  // @ts-expect-error - testing dynamic property assignment
  globalThis.testValue = 'isolated';
  // @ts-expect-error - accessing dynamic property for test
  expect(globalThis.testValue, 'to equal', 'isolated');
  globalThis.console.log('✅ GlobalThis modifications work within compartment');
});

globalThis.console.log('🚀 Compartmentalized test file executed!');
