import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(fileURLToPath(import.meta.url));
test('standalone manifest and local page resources', () => {
  const manifest = JSON.parse(readFileSync(resolve(root,'plugin.json'),'utf8'));
  const pkg = JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
  assert.equal(manifest.version,pkg.version);
  assert.equal(pkg.name,'@mytools-all/'+manifest.name);
  assert.ok(existsSync(resolve(root,manifest.main)));
  assert.ok(manifest.features.length > 0);
  for (const match of readFileSync(resolve(root,manifest.main),'utf8').matchAll(/(?:src|href)=["']\.\/([^"'#?]+)["']/g)) {
    assert.ok(existsSync(resolve(root,match[1])), 'Missing resource '+match[1]);
  }
});
