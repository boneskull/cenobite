# Cenobite - Copilot Instructions

## Repository Summary

**Cenobite** is an experimental test runner built on Node.js's `node:test` that leverages SES (Secure EcmaScript) and Compartments to provide isolated, secure test execution. This is a **proof-of-concept** demonstrating how SES compartments can be applied to test runners, allowing tests to run in a single process with strong isolation instead of separate processes.

**Key Technologies**: TypeScript (ESM-only), SES, @endo/compartment-mapper, Node.js loader hooks, tshy build system  
**Target Runtime**: Node.js ^20.19.0 || ^22.12.0 || >=23  
**Project Size**: Small (~4 core source files, ~150 lines main CLI file)

## Critical Build & Validation Process

**ALWAYS follow this exact sequence** - deviating will cause failures:

### Initial Setup

```bash
npm install  # Automatically runs husky setup and build via prepare script
```

### Build Process

```bash
npm run build  # Uses tshy for dual CJS/ESM build to dist/
```

### Development Mode

```bash
npm run dev  # tshy --watch mode for development
```

### Testing

```bash
npm test  # Runs Node.js test runner with tsx import
# OR for specific files:
npm run test:base -- "test/specific.test.ts"
```

### Linting & Validation

```bash
# Full lint suite (REQUIRED before commits):
npm run lint  # Runs all: eslint, types, knip, markdown, spelling

# Individual linting:
npm run lint:fix      # Auto-fix ESLint issues (run this first for lint errors)
npm run lint:types    # TypeScript type checking
npm run lint:eslint   # ESLint only
npm run lint:spelling # cspell spell checking
npm run lint:markdown # markdownlint-cli2
```

**Critical Lint Issue**: There are currently known ESLint errors in test files related to `@typescript-eslint/no-unsafe-call`. These are test-file specific and `npm run lint:fix` cannot auto-resolve them. They do not block builds but will fail CI if not addressed.

### Manual Testing

```bash
# Test the built CLI:
./dist/esm/bin.js --help
./dist/esm/bin.js test-file.js
./dist/esm/bin.js --isolate test-file.js  # compartment mode
./dist/esm/bin.js --test-reporter tap test-file.js
```

## Project Architecture

### Core Source Structure (`src/`)

- **`bin.ts`** - CLI entry point binary
- **`cli.ts`** - Main CLI logic, argument parsing, test execution orchestration (~230 lines)
- **`loader-hooks.ts`** - Node.js loader hooks implementation for SES/compartment injection
- **`loader-hooks-integration.ts`** - Integration layer spawning Node.js processes with loader hooks

### Configuration Files (`.config/`)

- **`tsconfig.eslint.json`** - TypeScript config for linting (excludes test fixtures)
- **`eslint-rules/`** - Custom ESLint rules

### Key Configuration Files

- **`tsconfig.json`** - Strict TypeScript config with ESNext target
- **`eslint.config.js`** - Complex ESLint setup with TypeScript, stylistic, perfectionist plugins
- **`cspell.json`** - Spell checking with project-specific terms (cenobite, endo, hardenedjs)
- **`.husky/`** - Git hooks for pre-commit linting and commit message validation

### Test Structure (`test/`)

- **`cli.test.ts`** - CLI functionality tests
- **`fixture/`** - Test fixtures (excluded from TypeScript checking)

### Build Outputs

- **`dist/esm/`** - ESM build output via tshy
- **`dist/commonjs/`** - CommonJS build output via tshy

## GitHub Actions / CI Pipeline

**Critical CI Jobs**:

1. **Node CI** (`.github/workflows/nodejs.yml`) - Tests on Node 22.12 & 24.0
2. **Lint** (`.github/workflows/lint.yml`) - Runs full lint suite
3. **Commitlint** - Validates conventional commit format
4. **PR Assignment** - Auto-assigns PRs to author

**Shared Setup**: `.github/actions/prepare/action.yml` handles Node setup and `npm ci --foreground-scripts`

**CI Requirements**:

- Must pass `npm test`
- Must pass `npm run lint` (currently failing due to test file ESLint errors)
- Requires Node.js 22+

## Key Dependencies & Integration Points

### Runtime Dependencies

- **`ses@1.14.0`** - Core SES security framework
- **`@endo/compartment-mapper@1.6.3`** - Compartment isolation system

### Build/Dev Dependencies

- **`tshy@3.0.2`** - Dual CJS/ESM TypeScript build system (CRITICAL - do not change)
- **`tsx@4.20.6`** - TypeScript execution for tests and dev
- **`typescript-eslint@8.45.0`** - TypeScript ESLint integration

### Validation Tools

- **`commitlint`** - Conventional commit message validation
- **`knip@5.64.1`** - Unused dependency detection
- **`cspell@9.2.1`** - Spelling with project dictionary
- **`markdownlint-cli2`** - Markdown linting

## CLI Interface & Usage

**Main Binary**: `./dist/esm/bin.js` (built from `src/bin.ts`)

**Key Flags**:

- `--isolate` - Enable compartment isolation (replaces old `--compartment-mapper`)
- `--reporter` / `--test-reporter` - Test reporter (spec, tap, dot, junit)
- `--verbose` - Enable debug output
- No `--globals` or `--modules` CLI flags (removed - programmatic only)

**Environment Variables**:

- `CENOBITE_DEBUG=1` - Detailed debug logging
- `CENOBITE_USE_COMPARTMENT_MAPPER=1` - Internal flag (set by `--isolate`)

## Development Workflow & Gotchas

### Making Changes

1. **Always** run `npm run build` after source changes
2. **Always** run `npm run lint:fix` first when encountering ESLint errors
3. TypeScript is VERY strict (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`)
4. All code must be ESM-only (no CommonJS)

### Known Issues to Work Around

- **Test file ESLint errors**: Current test files have `@typescript-eslint/no-unsafe-call` errors that need manual fixing
- **Knip warnings**: Reports unused files/dependencies - these are mostly false positives in development
- **Case sensitivity**: Repository uses `Cenobite` (capital C) in docs, `cenobite` (lowercase) for package name

### Debugging Setup

- Use `DEBUG=cenobite*` for detailed logging
- Test files can be run individually with tsx: `npm run test:base -- test/specific.test.ts`
- Development mode with `npm run dev` watches and rebuilds automatically

## File Change Impact Guide

**High Impact** (require full rebuild + testing):

- `src/cli.ts` - Main CLI logic
- `src/loader-hooks.ts` - Core transformation logic
- `tsconfig.json`, `eslint.config.js` - Configuration

**Medium Impact** (require lint + build):

- `package.json` scripts or dependencies
- Test files - may affect CI

**Low Impact** (documentation only):

- `README.md`, `CONTRIBUTING.md`
- Comments in code files

**Trust These Instructions**: Only search for additional information if these instructions are incomplete or found to be incorrect. This prevents unnecessary exploration and failed command attempts.
