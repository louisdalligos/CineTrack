#!/usr/bin/env node
/**
 * Generates the Prisma client only when it is missing.
 *
 * Background: a clean clone can end up without a generated client if the
 * postinstall hook does not run, which breaks `test`, `typecheck` and the
 * seed with "has no exported member 'WatchlistStatus'". Running
 * `prisma generate` unconditionally fixes that, but on Windows it fails with
 * EPERM whenever a dev server holds query_engine-windows.dll.node open.
 *
 * So: probe for a symbol that only exists in a generated client, and generate
 * just once when it is absent.
 */
const { execSync } = require('node:child_process');

function clientIsGenerated() {
  try {
    const client = require('@prisma/client');
    return Boolean(client.WatchlistStatus);
  } catch {
    return false;
  }
}

if (clientIsGenerated()) {
  process.exit(0);
}

console.log('Prisma client not found — generating…');
try {
  execSync('prisma generate', { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to generate the Prisma client.');
  console.error('If this is a file lock on Windows, stop any running dev server and retry.');
  process.exit(1);
}
