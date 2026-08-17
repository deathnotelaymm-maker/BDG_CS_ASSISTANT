import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(here, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(backendRoot, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(backendRoot, 'package-lock.json'), 'utf8'));

const checks = [];
const test = (name, condition) => {
  if (!condition) {
    console.error(`FAIL ${name}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS ${name}`);
  }
  checks.push(name);
};

const parse = (value) => String(value || '').split('.').map((v) => Number.parseInt(v, 10) || 0);
const gte = (a, b) => {
  const av = parse(a), bv = parse(b);
  for (let i = 0; i < 3; i += 1) {
    if (av[i] > bv[i]) return true;
    if (av[i] < bv[i]) return false;
  }
  return true;
};

const nano = lock.packages?.['node_modules/nanoid'];
const postcss = lock.packages?.['node_modules/postcss'];
const override = packageJson.overrides?.nanoid;

test('backend runtime version is current v1.18.0', packageJson.version === '1.18.0');
test('Nano ID override is pinned to the patched 3.x release', override === '3.3.18');
test('lockfile resolves Nano ID at or above 3.3.18', nano && gte(nano.version, '3.3.18'));
test('lockfile does not retain vulnerable Nano ID below 3.3.18', nano && gte(nano.version, '3.3.18'));
test('lockfile points to the official npm registry tarball', nano?.resolved === 'https://registry.npmjs.org/nanoid/-/nanoid-3.3.18.tgz');
test('lockfile preserves SHA-512 integrity for Nano ID 3.3.18', nano?.integrity === 'sha512-DTg4MJbGMWkfi6VZFdNt2/caMbQy4Ou+Op/hJQvGEWcnVfoA1QA+xzRKAzw9jD6+GVOOeYr/mIcuDSdug6F6+w==');
test('PostCSS dependency range remains compatible with Nano ID 3.3.18', /^\^3\.3\.16$/.test(postcss?.dependencies?.nanoid || '') || /^\^3\.3\./.test(postcss?.dependencies?.nanoid || ''));
test('existing UUID security override remains preserved', packageJson.overrides?.uuid === '^11.1.1');

if (!process.exitCode) console.log(`\n${checks.length}/${checks.length} v1.17.1-r2 dependency audit security checks passed.`);
