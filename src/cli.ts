#!/usr/bin/env node

import 'ses';

// SES lockdown is available globally after import
declare const lockdown: (options?: any) => void;

import { importLocation } from '@endo/compartment-mapper';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const { assign, freeze, keys } = Object;
const { Date: originalDate } = globalThis;

interface TestRunOptions {
  globals?: Record<string, unknown>;
  modules?: Record<string, unknown>;
  verbose?: boolean;
}

/**
 * Import hook for Node.js built-ins and external modules
 *
 * @function
 */
const importHook = async (specifier: string) => {
  const ns = (await import(specifier)) as unknown;
  return freeze({
    execute: (moduleExports: Record<string, unknown>) => {
      moduleExports.default = ns;
      assign(moduleExports, ns);
    },
    exports: !!ns && typeof ns === 'object' ? keys(ns) : [],
    imports: [],
  });
};

/**
 * Read function for compartment mapper
 *
 * @function
 */
const read = async (location: string) => {
  try {
    return await readFile(fileURLToPath(location));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read '${location}': ${message}`, {
      cause: error,
    });
  }
};

/**
 * Initialize SES with development-friendly options Exported for use by wrapper
 * scripts
 *
 * @function
 */
export const initializeSES = (): void => {
  lockdown({
    consoleTaming: 'unsafe',
    errorTaming: 'unsafe',
    stackFiltering: 'verbose',
  });
};

/**
 * Main CLI function Exported for use by the bin entry point
 *
 * @function
 */
export const main = async () => {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    args: process.argv.slice(2),
    options: {
      globals: {
        description: 'JSON string of additional globals to provide',
        type: 'string',
      },
      help: {
        description: 'Show help',
        short: 'h',
        type: 'boolean',
      },
      modules: {
        description: 'JSON string of additional modules to provide',
        type: 'string',
      },
      reporter: {
        description: 'Test reporter (spec, tap, dot, junit)',
        type: 'string',
      },
      verbose: {
        description: 'Enable verbose output',
        short: 'v',
        type: 'boolean',
      },
    },
  });

  if (values.help || positionals.length === 0) {
    console.log(`
Cenobite - SES Compartment Test Runner

Usage: cenobite [options] <test-file>

Options:
  -h, --help              Show this help message
  -v, --verbose           Enable verbose output
  --reporter <type>       Test reporter (spec, tap, dot, junit)
  --globals <json>        Additional globals to provide (JSON string)
  --modules <json>        Additional modules to provide (JSON string)

Examples:
  cenobite test.js
  cenobite --verbose test.js
  cenobite --reporter tap test.js
  cenobite --globals '{"customGlobal": "value"}' test.js
  cenobite --modules '{"custom-module": {...}}' test.js

Each test file runs in its own compartmentalized environment where:
- The test file and all its dependencies get their own compartments
- Built-in Node.js modules are available
- External modules are isolated per compartment
- No shared mutable state between test runs
`);
    process.exit(values.help ? 0 : 1);
  }

  // Use wrapper-based approach for Node.js test runner integration
  const { runTestsWithCenobiteWrappers } = await import(
    './wrapper-integration.js'
  );

  const options: {
    enableSourceMaps: boolean;
    files: string[];
    reporter?: string;
    verbose: boolean;
  } = {
    enableSourceMaps: true,
    files: positionals,
    verbose: values.verbose ?? false,
  };

  // Set default reporter to mimic node:test behavior
  if (values.reporter) {
    options.reporter = values.reporter;
  } else {
    // Default to 'spec' reporter, or 'tap' in CI environments (like node:test)
    options.reporter = process.env.CI ? 'tap' : 'spec';
  }

  const testStream = await runTestsWithCenobiteWrappers(options);

  // Wait for completion
  return new Promise<void>((resolve, reject) => {
    testStream.on('test:summary', (data) => {
      const failed =
        data.counts.tests -
        data.counts.passed -
        data.counts.skipped -
        data.counts.cancelled -
        data.counts.todo;
      if (failed > 0) {
        process.exit(1);
      } else {
        resolve();
      }
    });

    testStream.on('error', reject);
  });
};

/**
 * Run a single test file in a compartmentalized environment Exported for use by
 * wrapper scripts
 *
 * @function
 */
export const runTestFile = async (
  testFilePath: string,
  options: TestRunOptions = {},
): Promise<unknown> => {
  const { globals = {}, modules = {}, verbose = false } = options;

  // Resolve the test file path to absolute URL
  const absolutePath = resolve(testFilePath);
  const testFileUrl = pathToFileURL(absolutePath).href;

  if (verbose) {
    console.log(`Running test file: ${testFileUrl}`);
  }

  try {
    // Use importLocation to load and execute the test file with full compartmentalization
    const result = await importLocation(read, testFileUrl, {
      // Global objects available to all compartments
      globals: {
        console: harden(console),
        Date: harden(originalDate),
        globalThis,
        ...globals,
      },

      // Hook for handling external/built-in module imports
      importHook,

      modules,
    });

    if (verbose) {
      console.log('Test execution completed successfully');
      console.log(
        'Module exports:',
        keys((result as { namespace?: unknown }).namespace || {}),
      );
    }

    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Test execution failed: ${message}`);
    if (verbose && error instanceof Error && error.cause) {
      console.error('Caused by:', error.cause);
    }
    throw error;
  }
};

// CLI module - exports functions for use by bin.ts and wrappers
