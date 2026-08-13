#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';

const exactVersionPattern = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function parsePackageSpec(spec) {
  const separator = spec.lastIndexOf('@');
  if (separator <= 0) {
    fail(`dependency specifications must use an exact version: ${spec}`);
  }

  const name = spec.slice(0, separator);
  const version = spec.slice(separator + 1);
  if (!name || !exactVersionPattern.test(version)) {
    fail(`dependency specifications must use an exact semantic version: ${spec}`);
  }
  return { name, version };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function setVersions(specs) {
  if (specs.length === 0) {
    fail('provide at least one dependency as <package>@<exact-version>');
  }

  const manifest = await readJson('package.json');
  const seen = new Set();

  for (const spec of specs) {
    const { name, version } = parsePackageSpec(spec);
    if (seen.has(name)) {
      fail(`dependency was specified more than once: ${name}`);
    }
    seen.add(name);

    const section = Object.hasOwn(manifest.dependencies ?? {}, name)
      ? 'dependencies'
      : Object.hasOwn(manifest.devDependencies ?? {}, name)
        ? 'devDependencies'
        : null;
    if (!section) {
      fail(`dependency is not a direct dependency: ${name}`);
    }

    const previous = manifest[section][name];
    manifest[section][name] = version;
    console.log(`${name}: ${previous} -> ${version}`);
  }

  await writeFile('package.json', `${JSON.stringify(manifest, null, 2)}\n`);
}

function verifyExactDirectDependencies(manifest) {
  for (const section of ['dependencies', 'devDependencies']) {
    for (const [name, version] of Object.entries(manifest[section] ?? {})) {
      if (!exactVersionPattern.test(version)) {
        fail(`${section}.${name} is not pinned to an exact version: ${version}`);
      }
    }
  }
}

function verifyRootSection(manifest, root, section) {
  const expected = manifest[section] ?? {};
  const locked = root[section] ?? {};
  if (Object.keys(expected).length !== Object.keys(locked).length) {
    fail(`package-lock.json does not match package.json ${section}`);
  }
  for (const [name, version] of Object.entries(expected)) {
    if (locked[name] !== version) {
      fail(`package-lock.json does not pin ${section}.${name} to ${version}`);
    }
  }
}

function verifyPackageLock(manifest, lockfile) {
  if (lockfile.lockfileVersion !== 3) {
    fail(`unsupported npm package lock version: ${lockfile.lockfileVersion}`);
  }

  const root = lockfile.packages?.[''];
  if (!root) {
    fail('package-lock.json has no root package entry');
  }

  for (const section of ['dependencies', 'devDependencies']) {
    verifyRootSection(manifest, root, section);
    for (const [name, version] of Object.entries(manifest[section] ?? {})) {
      const entry = lockfile.packages[`node_modules/${name}`];
      if (!entry || entry.version !== version) {
        fail(`package-lock.json does not install ${name} at ${version}`);
      }
    }
  }

  for (const [path, entry] of Object.entries(lockfile.packages)) {
    if (path === '' || entry.link) {
      continue;
    }
    if (!entry.version) {
      fail(`package lock entry has no exact version: ${path}`);
    }
    if (!entry.resolved?.startsWith('https://registry.npmjs.org/')) {
      fail(`package lock entry does not use the public npm registry: ${path}`);
    }
    if (!entry.integrity) {
      fail(`package lock entry has no integrity hash: ${path}`);
    }
  }
}

async function verify() {
  const manifest = await readJson('package.json');
  const lockfile = await readJson('package-lock.json');
  verifyExactDirectDependencies(manifest);
  verifyPackageLock(manifest, lockfile);
  console.log(`Verified ${Object.keys(lockfile.packages).length - 1} npm package-lock entries.`);
}

async function verifyPack(path) {
  const report = await readJson(path);
  const entries = Array.isArray(report) ? report : Object.values(report);
  const entry = entries.length === 1 ? entries[0] : undefined;
  const files = entry?.files;
  if (!Array.isArray(files)) {
    fail('npm pack did not produce a valid file report');
  }
  const paths = new Set(files.map((file) => file.path));
  for (const required of ['dist/index.js', 'package.json']) {
    if (!paths.has(required)) {
      fail(`packed artifact is missing ${required}`);
    }
  }

  const bundled = new Set(entry.bundled ?? []);
  const manifest = await readJson('package.json');
  for (const name of Object.keys(manifest.dependencies ?? {})) {
    if (!bundled.has(name)) {
      fail(`packed artifact does not bundle runtime dependency ${name}`);
    }
  }
  console.log(`Verified packed artifact contents (${files.length} files).`);
}

const [command, ...args] = process.argv.slice(2);
if (command === 'set') {
  await setVersions(args);
} else if (command === 'verify') {
  await verify();
} else if (command === 'verify-pack') {
  if (args.length !== 1) {
    fail('verify-pack expects the npm pack JSON report path');
  }
  await verifyPack(args[0]);
} else {
  fail('expected the set, verify, or verify-pack command');
}
