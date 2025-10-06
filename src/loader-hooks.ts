/**
 * Cenobite loader hooks implementation
 *
 * This module provides Node.js loader hooks that transform test files to run
 * inside SES compartments for isolation.
 */

import {
  type LoadHookSync,
  registerHooks,
  type ResolveHookSync,
} from 'node:module';
import { fileURLToPath } from 'node:url';

const { stringify } = JSON;

/**
 * Options for configuring the loader hooks
 */
export interface LoaderHooksOptions {
  /** Debug logging */
  debug?: boolean;
  /** SES lockdown options */
  lockdownOptions?: {
    domainTaming?: 'safe' | 'unsafe';
    errorTaming?: 'safe' | 'unsafe';
    evalTaming?: 'safe' | 'unsafe';
    overrideTaming?: 'min' | 'moderate' | 'severe';
    stackFiltering?: 'concise' | 'verbose';
  };
  /**
   * Pattern to match test files (default: files containing '.test.' or in
   * '/test/' directories)
   */
  testFilePattern?: RegExp;
  /** Whether to use compartment-mapper for full isolation */
  useCompartmentMapper?: boolean;
}

const defaultOptions: Required<LoaderHooksOptions> = {
  debug: false,
  lockdownOptions: {
    errorTaming: 'unsafe',
    evalTaming: 'unsafe',
    overrideTaming: 'severe',
    stackFiltering: 'verbose',
  },
  testFilePattern: /\.(test|spec)\.|[/\\]test[/\\]/,
  useCompartmentMapper: false,
};

let options: Required<LoaderHooksOptions> = defaultOptions;

/**
 * Configure the loader hooks
 */
const configureLoaderHooks = (userOptions: LoaderHooksOptions = {}): void => {
  options = { ...defaultOptions, ...userOptions };
};

/**
 * Check if a URL represents a test file
 */
const isTestFile = (url: string): boolean => {
  const filePath = url.startsWith('file://') ? fileURLToPath(url) : url;
  return (
    options.testFilePattern.test(filePath) &&
    (filePath.endsWith('.js') ||
      filePath.endsWith('.mjs') ||
      filePath.endsWith('.ts'))
  );
};

/**
 * Transform test file source to run in SES compartment
 */
const transformTestSource = (
  source: ArrayBuffer | ArrayBufferView | Buffer | string,
  url: string,
): string => {
  const debug = options.debug;
  const lockdownOptionsStr = stringify(options.lockdownOptions, null, 2);

  // Convert source to string regardless of input type
  let sourceStr: string;
  if (typeof source === 'string') {
    sourceStr = source;
  } else if (source instanceof Buffer) {
    sourceStr = source.toString('utf8');
  } else if (source instanceof ArrayBuffer) {
    sourceStr = new TextDecoder('utf8').decode(source);
  } else {
    // Handle TypedArray (Uint8Array, etc.) and other ArrayBufferView types
    sourceStr = new TextDecoder('utf8').decode(source);
  }

  if (debug) {
    console.log(
      `[cenobite] useCompartmentMapper: ${options.useCompartmentMapper}`,
    );
  }

  if (options.useCompartmentMapper) {
    if (debug) {
      console.log('[cenobite] Using compartment mapper path');
    }
    return `
// === CENOBITE COMPARTMENT MAPPER WRAPPER ===
import 'ses';
import { importLocation } from '@endo/compartment-mapper';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

${debug ? `console.log('[cenobite] Initializing SES with compartment-mapper for: ${url}');` : ''}

// Initialize SES
lockdown(${lockdownOptionsStr});

// Read function for compartment mapper
const read = async (location) => {
  try {
    return await readFile(fileURLToPath(location));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(\`Failed to read '\${location}': \${message}\`, { cause: error });
  }
};

// Import hook for Node.js built-ins and external modules
const importHook = async (specifier) => {
  const ns = await import(specifier);
  return Object.freeze({
    execute: (moduleExports) => {
      moduleExports.default = ns;
      Object.assign(moduleExports, ns);
    },
    exports: !!ns && typeof ns === 'object' ? Object.keys(ns) : [],
    imports: [],
  });
};

// Get module path for compartment-mapper
const moduleUrl = new URL('${url}');

${debug ? `console.log('[cenobite] Creating compartment for module:', moduleUrl.href);` : ''}

// Create compartment and execute test
try {
  // Use importLocation to load and execute the test in a compartment
  const result = await importLocation(read, moduleUrl, {
    globals: {
      console: Object.freeze(console),
      globalThis,
    },
    importHook,
  });

  ${debug ? `console.log('[cenobite] Test execution complete');` : ''}
} catch (error) {
  console.error('[cenobite] Compartment execution failed:', error);
  throw error;
}
`;
  } else {
    if (debug) {
      console.log('[cenobite] Using simple SES path');
    }
    return `
// === CENOBITE SES WRAPPER ===
import 'ses';

${debug ? `console.log('[cenobite] Initializing SES lockdown for: ${url}');` : ''}

// Initialize SES with configuration
lockdown(${lockdownOptionsStr});

${debug ? `console.log('[cenobite] SES lockdown complete, running test...');` : ''}

// Original test code (runs with SES protections):
${sourceStr}

${debug ? `console.log('[cenobite] Test execution complete');` : ''}
`;
  }
};

/**
 * Load hook that transforms test files to run in SES compartments
 */
const load: LoadHookSync = (url, context, nextLoad) => {
  if (isTestFile(url)) {
    if (options.debug) {
      console.log(`[cenobite] Transforming test file: ${url}`);
    }

    const result = nextLoad(url, context);

    // Ensure we have source content to transform
    if (!result.source) {
      throw new Error(`No source content found for test file: ${url}`);
    }

    return {
      ...result,
      source: transformTestSource(result.source, url),
    };
  }

  // Let other files load normally
  return nextLoad(url, context);
};

/**
 * Resolve hook (currently just passes through)
 */
const resolve: ResolveHookSync = (specifier, context, nextResolve) =>
  nextResolve(specifier, context);

/**
 * Register the loader hooks
 */
export const registerCenobiteHooks = (
  userOptions: LoaderHooksOptions = {},
): void => {
  configureLoaderHooks(userOptions);
  registerHooks({ load, resolve });
};

// Auto-register hooks when imported (always register when used as loader)
registerCenobiteHooks({
  debug: process.env.CENOBITE_DEBUG === '1',
  useCompartmentMapper: process.env.CENOBITE_USE_COMPARTMENT_MAPPER === '1',
});
