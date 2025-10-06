import { test } from 'node:test';

import { isolateTest } from '../src/isolate.js';

// Debug test to see what's happening
test('debug globals', () => {
  const testFn = () => {
    console.log('globalThis keys:', Object.keys(globalThis));
    console.log('console available:', typeof console);
    console.log('testValue available:', typeof (globalThis as any).testValue);
    return 'debug complete';
  };

  const isolatedFn = isolateTest(testFn, {
    globals: {
      testValue: 'debug value'
    },
    name: 'debug-test'
  });

  const result = isolatedFn();
  console.log('Debug result:', result);
});
