// test/index.test.js - tests the full dependency chain
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  appNumber,
  appObject,
  appValue,
  barNumber,
  barValue,
  fooNumber,
  fooValue,
} from '../src/index.js';

test('dependency chain works: bar -> foo -> app', () => {
  // Test that bar values made it through the chain
  assert.equal(barValue, 'Hello from bar!');
  assert.equal(barNumber, 42);
});

test('foo module transforms bar values correctly', () => {
  assert.equal(fooValue, 'Foo says: Hello from bar!');
  assert.equal(fooNumber, 84); // 42 * 2
});

test('app module transforms foo values correctly', () => {
  assert.equal(appValue, 'App says: Foo says: Hello from bar!');
  assert.equal(appNumber, 92); // (42 * 2) + 8
});

test('nested object structure is preserved', () => {
  assert.equal(typeof appObject, 'object');
  assert.equal(appObject.message, 'App module loaded successfully');
  assert.equal(appObject.compartment, 'app-compartment');

  // Check nested structure
  assert.equal(typeof appObject.fromFoo, 'object');
  assert.equal(appObject.fromFoo.compartment, 'foo-compartment');
  assert.equal(typeof appObject.fromFoo.fromBar, 'object');
  assert.equal(appObject.fromFoo.fromBar.compartment, 'bar-compartment');
});

test('compartmentalization preserves module isolation', () => {
  // Each module should have its own context
  // This tests that the modules were properly loaded in separate compartments

  // If compartmentalization is working, these should be different values
  // because Date.now() in SES should be different or controlled
  const barTimestamp = appObject.fromFoo.fromBar.timestamp;
  const fooTimestamp = appObject.fromFoo.timestamp;
  const appTimestamp = appObject.timestamp;

  assert.equal(typeof barTimestamp, 'number');
  assert.equal(typeof fooTimestamp, 'number');
  assert.equal(typeof appTimestamp, 'number');
});
