#!/usr/bin/env node
/*
 * Converts moment's UMD build files into the ES module form shipped as @nuxeo/moment.
 *
 *   node nuxeo-esm-wrap.cjs <file> [<file>...]
 *
 * Replaces the UMD header with 'use strict'; and the trailing `return hooks; })));` with
 * `export default moment;`. Each file must contain exactly one UMD header and one footer of the
 * expected shape, and no other UMD/CommonJS export afterwards; otherwise the script exits non-zero
 * without writing anything, so a change in upstream's build output is caught instead of half-applied.
 */
'use strict';

const fs = require('fs');

const HEADER =
    /\n*;\(function \(global, factory\) \{\n {4}typeof exports === 'object' && typeof module !== 'undefined' \? module\.exports = factory\(\) :\n {4}typeof define === 'function' && define\.amd \? define\(factory\) :\n {4}global\.moment = factory\(\)\n\}\(this, \(function \(\) \{ 'use strict';\n/g;
const FOOTER = /\n*( {4}return hooks;\n*\}\)\)\);\n*)$/;
const ESM_FOOTER =
    "\n\n    const moment = hooks; // 'hooks' is the internal function Moment uses to create dates\n    export default moment;\n";

function fail(file, msg) {
    console.error(`nuxeo-esm-wrap: ${file}: ${msg}`);
    process.exit(1);
}

const files = process.argv.slice(2);
if (!files.length) fail('-', 'no input files');

const outputs = files.map((file) => {
    const src = fs.readFileSync(file, 'utf8');
    if (/export default moment;/.test(src)) fail(file, 'already converted');

    const headers = src.match(HEADER) || [];
    if (headers.length !== 1)
        fail(file, `expected 1 UMD header, found ${headers.length}`);
    if (!FOOTER.test(src))
        fail(file, 'UMD footer `return hooks; })));` not found at end of file');

    let out = src.replace(HEADER, (m, offset) =>
        offset === 0 ? "'use strict';\n" : "\n'use strict';\n"
    );
    out = out.replace(FOOTER, ESM_FOOTER);

    // Only the wrapper's own lines count: moment's loadLocale legitimately references `module.exports`.
    if (
        /module\.exports = factory|define\(factory\)|global\.moment = factory|\}\)\)\);\s*$/.test(
            out
        )
    ) {
        fail(file, 'UMD remnants left after conversion');
    }
    if ((out.match(/export default/g) || []).length !== 1)
        fail(file, 'expected exactly one `export default`');
    return [file, out];
});

outputs.forEach(([file, out]) => {
    fs.writeFileSync(file, out);
    console.log(`nuxeo-esm-wrap: converted ${file}`);
});
