// Writes the typed-routes declarations (.expo/types/router.d.ts) without
// starting Metro, so `tsc` checks every href against the real routes.
//
// `expo start` generates that file as a side effect and keeps it current while
// it runs, but it is gitignored, `expo export` does not write it, and without
// it `tsc` passes with every href typed as a plain string — a route typo would
// sail through CI. This calls the same generator the Expo CLI does (see
// @expo/cli …/type-generation/routes.js, "Typed Routes can be run without
// Metro or a Server").
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = join(root, '.expo', 'types');

// Read when the generator module loads: it must be set before the require.
process.env.EXPO_ROUTER_APP_ROOT = join(root, 'src', 'app');

const require = createRequire(join(root, 'package.json'));
const typedRoutes = require('@expo/router-server/build/typed-routes');

mkdirSync(outputDir, { recursive: true });
// Debounced inside the module; the pending timer keeps Node alive until the
// file is written.
typedRoutes.regenerateDeclarations(outputDir, {});
process.on('exit', () =>
  console.log(`✓ typed routes: ${join('.expo', 'types', 'router.d.ts')}`),
);
