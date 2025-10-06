/** @type {import('wallabyjs').IWallaby} */
export default {
  // @ts-expect-error missing type
  autoDetect: ['node:test'],
  env: {
    params: {
      env: 'DEBUG=cenobite*;WALLABY=1',
    },
    runner: 'node',
    type: 'node',
  },
  files: [
    'src/**/*.ts',
    'test/**/*.ts',
    '!test/**/*.test.ts',
    'package.json',
    '!.tshy-build/**',
    { instrument: false, pattern: 'test/fixture/**' },
    '!src/node_modules/cenobite/**',
    { instrument: false, pattern: 'test/**/*.test.ts.snapshot' },
  ],
  filesWithNoCoverageCalculated: ['.tmp/**/*.test.ts', 'test/**/*.ts'],
  preloadModules: ['tsx/esm'],
  runMode: 'onsave',
  tests: [
    '.tmp/**/*.test.ts',
    'test/**/*.test.ts',
    '!.tshy-build/**',
    '!node_modules/**',
    '!dist/**',
    // tshy-ism
    '!src/node_modules/cenobite/**',
  ],
};
