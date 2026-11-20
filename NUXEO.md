# @nuxeo/moment

`@nuxeo/moment` is Nuxeo's fork of [Moment.js](https://github.com/moment/moment),
published to `https://packages.nuxeo.com/repository/npm-public/` and used by
Nuxeo Elements and Nuxeo Web UI. The `webui` branch holds it.

It exists for one reason: Polymer elements import Moment natively in the
browser (`import moment from '@nuxeo/moment'`), without a bundler, so the two
files they import must be ES modules. Everything else is upstream Moment.

Versions follow upstream: `<upstream version>-nx.<n>`, for example
`2.31.0-nx.0` is upstream `2.31.0` with the Nuxeo changes below.

## Nuxeo changes

These are the only differences from upstream. Keep upstream files untouched
otherwise, so that an upgrade stays a copy of the new upstream tag plus this
list.

Published files:

1. `package.json`:
   - `"name": "@nuxeo/moment"` and `"version": "<upstream>-nx.<n>"`;
   - `"type": "module"`;
   - scripts `"nuxeo:check-package"`, `"pretest"` and the
     `nuxeo-commonjs-build-dir.js` step at the start of `"test:watch"`.
2. `moment.js` and `min/moment-with-locales.js`: the UMD wrapper is replaced
   by `export default moment;`. Apply it with
   `node scripts/nuxeo-esm-wrap.js moment.js min/moment-with-locales.js`;
   never edit these files by hand.

Repository only (not published):

1. `scripts/nuxeo-esm-wrap.js`: applies the ES module wrapper and fails if
   upstream's wrapper changes shape.
2. `scripts/package.json` (`"type": "commonjs"`): upstream's scripts are
   CommonJS, the repository root is an ES module package.
3. `scripts/nuxeo-commonjs-build-dir.js`: marks `build/` as CommonJS before
   the tests, which write CommonJS bundles there.
4. `eslint.config.js` renamed to `eslint.config.cjs`, for the same reason,
   and `cjs` added to the 4-space `[*.{js,cjs,json}]` rule in `.editorconfig`.
5. `scripts/nuxeo-check-package.js`: package check for the fork. Upstream's
   `scripts/check-package.js` checks the CommonJS and UMD entry points this
   fork replaces, so it is expected to fail here.
6. `.npmrc`: maps the `@nuxeo` scope to `packages.nuxeo.com`.
7. `NUXEO.md`: this file.
8. Upstream's `.github/workflows/` is not copied: it publishes to npmjs.org.

## Upgrading to a new upstream version

1. Branch from `webui` and fetch the upstream tag:

   ```sh
   git remote add upstream https://github.com/moment/moment.git
   git fetch --no-tags upstream refs/tags/<tag>:refs/tags/<tag>
   ```

2. Replace everything with the upstream tag, then commit:

   ```sh
   git rm -r -q -f .
   git checkout <tag> -- .
   git rm -r -q -f .github/workflows
   ```

3. Reapply the Nuxeo changes, then commit:

   ```sh
   git checkout origin/webui -- NUXEO.md .npmrc scripts/package.json \
     scripts/nuxeo-esm-wrap.js scripts/nuxeo-commonjs-build-dir.js \
     scripts/nuxeo-check-package.js
   git mv eslint.config.js eslint.config.cjs
   node scripts/nuxeo-esm-wrap.js moment.js min/moment-with-locales.js
   ```

   Then edit `package.json` and `.editorconfig` as listed in "Nuxeo
   changes". If upstream's tooling changed, check that the repository-only
   items still apply.

## Validating

Use the Node version required by upstream's `devEngines` (Node 24 works):

```sh
npx pnpm@<packageManager version> install --frozen-lockfile --ignore-scripts
npm test
npm run build
npm run nuxeo:check-package
npm pack
```

Compare the packed tarball with the official upstream package
(`npm pack moment@<tag>`): only `package.json`, `moment.js` and
`min/moment-with-locales.js` may differ. Then test the tarball in Nuxeo
Elements and Web UI before publishing.

## Publishing

Publish the tarball that was tested, then check the registry has the same file:

```sh
npm publish nuxeo-moment-<version>.tgz \
  --registry https://packages.nuxeo.com/repository/npm-public/
npm view @nuxeo/moment@<version> dist.shasum \
  --registry https://packages.nuxeo.com/repository/npm-public/
shasum nuxeo-moment-<version>.tgz
```

Then tag `v<version>` and merge the pull request into `webui`.
