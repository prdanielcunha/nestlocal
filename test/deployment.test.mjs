import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

test('NestLocal uses the shared project and an isolated hosting target', () => {
  assert.equal(read('../.firebaserc').projects.default, 'millionsnest');
  const config = read('../firebase.json');
  assert.equal(config.hosting.target, 'nestlocal');
  assert.equal(config.hosting.public, 'dist');
  // Shared rules/functions are owned by the ecosystem, not deployed by this app.
  for (const key of ['firestore', 'storage', 'functions', 'database']) {
    assert.equal(config[key], undefined);
  }
  assert.ok(config.hosting.rewrites.every(rule => !rule.run && !rule.function));
});
