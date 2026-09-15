import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

test('NestLocal uses the shared project and an isolated hosting target', () => {
  assert.equal(read('../.firebaserc').projects.default, 'millionsnest');
  const config = read('../firebase.json');
  assert.equal(Array.isArray(config.hosting), true);
  assert.deepEqual(config.hosting.map(site => site.target), ['nestlocal', 'nestlocal-alias']);
  // Shared rules/functions are owned by the ecosystem, not deployed by this app.
  for (const key of ['firestore', 'storage', 'functions', 'database']) {
    assert.equal(config[key], undefined);
  }
  for (const site of config.hosting) {
    assert.equal(site.public, 'web');
    const api = site.rewrites.find(rule => rule.source === '/api/**');
    assert.equal(api.run.serviceId, 'nestlocal-api');
    assert.equal(api.run.region, 'us-central1');
    assert.equal(site.rewrites.at(-1).destination, '/index.html');
  }
});
