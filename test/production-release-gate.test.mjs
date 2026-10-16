import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('release gate validates locked dependencies, syntax, domain and static bundle before deployment',()=>{
 const yaml=readFileSync(new URL('../.github/workflows/firebase-hosting-deploy.yml',import.meta.url),'utf8');
 const a=yaml.indexOf('npm ci --ignore-scripts --no-audit --no-fund');
 const b=yaml.indexOf('npm run check');
 const c=yaml.indexOf('      - name: Validate static bundle');
 const d=yaml.indexOf('      - name: Build and push API');
 const e=yaml.indexOf('      - name: Deploy API');
 const f=yaml.indexOf('      - name: Deploy NestLocal Hosting immediately');
 assert.ok(a>0&&a<b&&b<c&&c<d&&d<e&&e<f,'production release validation must precede deployment');
 assert.match(yaml,/node-version: '24'/);
 assert.match(yaml,/branches: \[production\]/);
 assert.match(yaml,/cancel-in-progress: false/);
});
