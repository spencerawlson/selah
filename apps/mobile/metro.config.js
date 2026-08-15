/**
 * Metro config for the monorepo.
 *
 * Two changes over the default, both required because `@selah/shared` lives
 * outside this folder and npm hoists dependencies to the workspace root:
 *
 *   watchFolders     — let Metro read (and hot-reload) files above apps/mobile
 *   nodeModulesPaths — resolve packages from the root node_modules too
 *
 * Without these you get "Unable to resolve module @selah/shared" the first time
 * you import a shared type.
 */

const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// Prefer the app's own copy of a package when both exist, so React never doubles up.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
