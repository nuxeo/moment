// Checks the published @nuxeo/moment package.
//
// Upstream's scripts/check-package.js verifies Moment's CommonJS and browser
// global (UMD) entry points. This fork deliberately turns moment.js and
// min/moment-with-locales.js into ES modules (`export default moment`), which
// is what Nuxeo Elements and Web UI import, so that script cannot pass here.
// This one checks the fork's own contract and repeats upstream's checks for
// the files the fork leaves untouched.
//
//   node scripts/nuxeo-check-package.js [packageDir]
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { pathToFileURL } = require('url');

const packageDir = path.resolve(process.argv[2] || '.');

function read(file) {
    return fs.readFileSync(path.join(packageDir, file), 'utf8');
}

function fail(message) {
    throw new Error(message);
}

async function importDefault(file) {
    const url = pathToFileURL(path.join(packageDir, file)).href;
    return (await import(url)).default;
}

function runBrowserFile(file, context) {
    vm.runInNewContext(read(file), context, { filename: file });
}

async function main() {
    const pkg = JSON.parse(read('package.json'));
    const upstreamVersion = (pkg.version.match(/^(\d+\.\d+\.\d+)-nx\.\d+$/) ||
        [])[1];
    if (pkg.name !== '@nuxeo/moment') {
        fail('package name must be @nuxeo/moment');
    }
    if (pkg.type !== 'module') {
        fail('package.json must declare "type": "module"');
    }
    if (!upstreamVersion) {
        fail('version must look like <upstream>-nx.<n>, got ' + pkg.version);
    }

    // The two ES module entry points Nuxeo imports.
    const metadata = read('src/moment.js').split('\n\n')[0];
    for (const file of ['moment.js', 'min/moment-with-locales.js']) {
        const source = read(file);
        if (
            (source.match(/^\s*export default moment;\s*$/gm) || []).length !==
            1
        ) {
            fail(file + ' must contain a single `export default moment;`');
        }
        if (/(module\.exports|global\.moment) = factory/.test(source)) {
            fail(file + ' still contains the UMD wrapper');
        }
        if (!source.startsWith(metadata + '\n')) {
            fail(file + ' is missing the Moment metadata header');
        }
        const moment = await importDefault(file);
        if (
            typeof moment !== 'function' ||
            moment.version !== upstreamVersion
        ) {
            fail(file + ' must export moment ' + upstreamVersion);
        }
    }
    const withLocales = await importDefault('min/moment-with-locales.js');
    withLocales.locale('fr');
    const month = withLocales('2024-03-01T10:00:00Z').utc().format('MMMM');
    withLocales.locale('en');
    if (month !== 'mars') {
        fail('min/moment-with-locales.js does not provide the French locale');
    }

    // Files the fork leaves untouched: the same checks as upstream.
    const minified = {};
    runBrowserFile('min/moment.min.js', minified);
    runBrowserFile('min/locales.min.js', minified);
    if (!minified.moment || !minified.moment.locales().includes('fr')) {
        fail('Minified core or locales bundle failed');
    }
    const minifiedWithLocales = {};
    runBrowserFile('min/moment-with-locales.min.js', minifiedWithLocales);
    if (
        !minifiedWithLocales.moment ||
        !minifiedWithLocales.moment.locales().includes('fr')
    ) {
        fail('Minified all-locales bundle failed');
    }
    for (const file of [
        'dist/moment.js',
        'dojo.profile.js',
        'ender.js',
        'moment.d.ts',
        'src/moment.js',
        'ts3.1-typings/moment.d.ts',
    ]) {
        if (!fs.existsSync(path.join(packageDir, file))) {
            fail('Published package is missing ' + file);
        }
    }

    console.log(packageDir + ': @nuxeo/moment ' + pkg.version + ' OK');
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
