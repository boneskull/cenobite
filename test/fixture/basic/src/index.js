// src/index.js - re-exports from foo
import { barNumber, barValue, fooNumber, fooObject, fooValue } from 'foo';

export const appValue = `App says: ${fooValue}`;
export const appNumber = fooNumber + 8; // 42 * 2 + 8 = 92
export const appObject = {
  ...fooObject,
  compartment: 'app-compartment',
  fromFoo: fooObject,
  message: 'App module loaded successfully',
};

// Re-export selected items from foo/bar
export { barNumber, barValue, fooNumber, fooValue };

export default {
  appNumber,
  appObject,
  appValue,
  barNumber,
  barValue,
  fooNumber,
  fooValue,
};
