/**
 * Loader hooks integration for cenobite
 *
 * This module replaces the wrapper-based approach with Node.js loader hooks for
 * cleaner integration with the Node.js test runner.
 */

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { type TestsStream } from 'node:test';
import { fileURLToPath } from 'node:url';

interface LoaderHooksTestOptions {
  /** Enable source maps */
  enableSourceMaps: boolean;
  /** Test files to run */
  files: string[];
  /** Test reporter */
  reporter?: string;
  /** Enable compartment-mapper for full isolation */
  useCompartmentMapper?: boolean;
  /** Enable verbose output */
  verbose: boolean;
}

/**
 * Run tests using Node.js loader hooks instead of wrapper files
 */
export const runTestsWithLoaderHooks = async (
  options: LoaderHooksTestOptions,
): Promise<TestsStream> => {
  const {
    enableSourceMaps = true,
    files,
    reporter = 'spec',
    useCompartmentMapper = false,
    verbose,
  } = options;

  // Get the path to our loader hooks module (resolve relative to this file)
  const currentDir = fileURLToPath(new URL('.', import.meta.url));
  const loaderHooksPath = resolve(currentDir, 'loader-hooks.js');

  // Build the node command with loader hooks
  const nodeArgs: string[] = [
    // Import our loader hooks
    '--import',
    `file://${loaderHooksPath}`,
  ];

  // Add source map support if enabled
  if (enableSourceMaps) {
    nodeArgs.push('--enable-source-maps');
  }

  // Add test runner with reporter
  nodeArgs.push('--test', `--test-reporter=${reporter}`);

  // Add test files
  nodeArgs.push(...files);

  // Set environment variables for loader configuration
  const env = {
    ...process.env,
    CENOBITE_DEBUG: verbose ? '1' : '0',
    CENOBITE_USE_COMPARTMENT_MAPPER: useCompartmentMapper ? '1' : '0',
  };

  if (verbose) {
    console.log('[cenobite] Running tests with loader hooks');
    console.log('[cenobite] Loader hooks path:', loaderHooksPath);
    console.log('[cenobite] Node args:', nodeArgs.join(' '));
    console.log('[cenobite] Files:', files);
  }

  // Spawn the Node.js process with our loader hooks
  const childProcess = spawn('node', nodeArgs, {
    env,
    stdio: ['inherit', 'inherit', 'inherit'],
  });

  // Return a simple readable stream that completes when the process exits
  const { Readable } = await import('node:stream');
  const stream = new Readable({
    read() {
      // No data to read, this is just for event emission
    },
  });

  childProcess.on('exit', (code) => {
    if (code !== 0) {
      stream.emit('error', new Error(`Test process exited with code ${code}`));
    } else {
      // Emit a fake test summary event to match the expected interface
      stream.emit('test:summary', {
        counts: {
          cancelled: 0,
          passed: 1, // Assume passed if no error
          skipped: 0,
          tests: 1,
          todo: 0,
        },
      });
    }
    stream.push(null); // End the stream
  });

  childProcess.on('error', (error) => {
    stream.emit('error', error);
  });

  return stream;
};
