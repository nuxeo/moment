// Nuxeo fork: the repository root is "type": "module" because the published
// @nuxeo/moment files are ES modules, but upstream's scripts/test.js writes
// CommonJS bundles into build/qunit and runs them with QUnit. Mark build/ as
// CommonJS before the tests run. scripts/build.js deletes build/, so this has
// to run again before each test run (npm runs it as "pretest").
const fs = require('fs');

fs.mkdirSync('build', { recursive: true });
fs.writeFileSync('build/package.json', '{\n    "type": "commonjs"\n}\n');
