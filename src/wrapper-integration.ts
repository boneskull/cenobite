import { existsSync } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';
import { run } from 'node:test';
// Import built-in reporters
import { dot, junit, spec, tap } from 'node:test/reporters';

const { stringify } = JSON;

/**
 * Integrate cenobite with Node.js test runner using wrapper files
 *
 * @function
 */
export const runTestsWithCenobiteWrappers = async (options: {
  enableSourceMaps?: boolean;
  files?: string[];
  globPatterns?: string[];
  reporter?: string;
  reporterDestination?: string;
  silent?: boolean; // Don't print our own output when using reporters
  verbose?: boolean;
  wrapperDir?: string;
}) => {
  const wrapperDir = options.wrapperDir || resolve(process.cwd(), '.tmp');

  // Ensure wrapper directory exists
  if (!existsSync(wrapperDir)) {
    await mkdir(wrapperDir, { recursive: true });
  }

  // Enable source map support if requested
  if (options.enableSourceMaps !== false) {
    process.env.NODE_OPTIONS =
      `${process.env.NODE_OPTIONS || ''} --enable-source-maps`.trim();
  }

  const wrapperPaths: string[] = [];
  const originalFiles = options.files || [];
  try {
    // Create wrapper files for each test file
    for (const testFile of originalFiles) {
      const wrapperPath = await createTestWrapper(testFile, wrapperDir);
      wrapperPaths.push(wrapperPath);
    }

    // Run the wrapper files through Node.js test runner
    const testStream = run({
      files: wrapperPaths,
      isolation: 'process', // Use normal process isolation
    });

    // Use the specified reporter or default behavior
    if (options.reporter) {
      const reporterMap = {
        dot,
        junit,
        spec,
        tap,
      };

      const reporter =
        reporterMap[options.reporter as keyof typeof reporterMap];
      if (reporter) {
        // Pipe the test stream to the reporter
        testStream.compose(reporter).pipe(process.stdout);
      }
    }

    return testStream;
  } catch (error) {
    // Clean up on error
    await cleanupWrappers(wrapperPaths);
    throw error;
  }
};

/**
 * Clean up wrapper files and their source maps
 */
const cleanupWrappers = async (wrapperPaths: string[]): Promise<void> => {
  const allFiles = wrapperPaths.flatMap((path) => [path, `${path}.map`]);

  await Promise.all(
    allFiles.map(async (path) => {
      try {
        await unlink(path);
      } catch {
        // Ignore cleanup errors
      }
    }),
  );
};

/**
 * Create a wrapper test file that executes the original through cenobite
 */
const createTestWrapper = async (
  originalTestPath: string,
  wrapperDir: string,
): Promise<string> => {
  const originalAbsolute = resolve(originalTestPath);
  const wrapperName = `.cenobite-wrapper-${basename(originalTestPath)}`;
  const wrapperPath = join(wrapperDir, wrapperName);
  const sourceMapPath = `${wrapperPath}.map`;

  // Generate source map for better debugging
  const sourceMap = generateSourceMap(originalTestPath, wrapperPath);

  // Create wrapper content that imports and executes the original test in a compartment
  const wrapperContent = `
// Auto-generated wrapper for cenobite compartment isolation
//# sourceMappingURL=${basename(sourceMapPath)}
import { test } from 'node:test';
import { runTestFile, initializeSES } from '${resolve(process.cwd(), 'dist/esm/cli.js').replace(/\\/g, '/')}';

// Initialize SES for this wrapper
initializeSES();

test('Compartmentalized test: ${basename(originalTestPath)}', async () => {
  try {
    await runTestFile('${originalAbsolute.replace(/\\/g, '/')}', {
      verbose: false
    });
  } catch (error) {
    // Improve error reporting by preserving original stack traces
    if (error instanceof Error && error.stack) {
      // Replace wrapper file references with original file references in stack traces
      const originalStack = error.stack.replace(
        new RegExp('${wrapperPath.replace(/\\/g, '\\\\')}', 'g'),
        '${originalAbsolute}'
      );

      // Create a new error with the cleaned stack trace
      const cleanError = new Error(error.message);
      cleanError.stack = originalStack;
      cleanError.name = error.name;

      // Preserve other error properties
      Object.assign(cleanError, error);

      throw cleanError;
    }

    throw error; // Re-throw to fail the Node.js test
  }
});
`;

  // Write both the wrapper file and its source map
  await Promise.all([
    writeFile(wrapperPath, wrapperContent),
    writeFile(sourceMapPath, sourceMap),
  ]);

  return wrapperPath;
};

/**
 * Generate a source map for the wrapper file that maps back to the original
 * test file
 */
const generateSourceMap = (
  originalTestPath: string,
  wrapperPath: string,
): string => {
  const originalAbsolute = resolve(originalTestPath);
  const wrapperAbsolute = resolve(wrapperPath);
  const relativeOriginal = relative(wrapperAbsolute, originalAbsolute);

  // Basic source map that maps the test function call to the original file
  const sourceMap = {
    file: basename(wrapperPath),
    // Map the test function (line 10) to line 1 of the original file
    mappings: 'AAAA;;;;;;;;;SAAA', // Very basic mapping
    names: [],
    sourceRoot: '',
    sources: [relativeOriginal],
    version: 3,
  };

  return stringify(sourceMap);
};
