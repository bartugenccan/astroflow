// Metro config for the AstroFlow Expo app inside an npm-workspaces monorepo.
// Watches the repo root so hoisted packages resolve, and lets Metro look in
// both the app's and the root's node_modules.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = false;

/**
 * Watching the workspace root means Metro also crawls the API's build output.
 * `nest start --watch` and `prisma generate` delete and recreate those trees,
 * so a directory can vanish between Metro listing it and attaching a watcher —
 * which crashes the bundler outright:
 *
 *   Error: ENOENT: no such file or directory, watch
 *   '...\apps\api\dist\generated\prisma\models'
 *
 * Running the API and the app side by side is the documented workflow, so
 * these have to be excluded. None of them are reachable from the app bundle.
 */
config.resolver.blockList = [
  /[/\\]apps[/\\]api[/\\]dist[/\\].*/,
  /[/\\]apps[/\\]api[/\\]generated[/\\].*/,
  /[/\\]apps[/\\]api[/\\]node_modules[/\\].*/,
];

module.exports = config;
