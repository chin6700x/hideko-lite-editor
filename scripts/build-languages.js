import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { transformSync } from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIST = path.resolve(__dirname, '../dist');
const SRC_DIR = path.resolve(__dirname, '../src/languages-flat');
const DIST_DIR = path.resolve(__dirname, '../dist/languages');

if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
}

console.log('==> Building standalone languages into dist/languages/...');

const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.js') && f !== 'common.js');
const languageNames = [];

for (const file of files) {
    if (file === 'language-aliases.js') {
        const rawContent = fs.readFileSync(path.join(SRC_DIR, file), 'utf-8');
        const minified = transformSync(rawContent, { minify: true, target: 'es2020' }).code;
        fs.writeFileSync(path.join(DIST_DIR, file), minified, 'utf-8');
        continue;
    }

    const langName = path.basename(file, '.js');
    languageNames.push(langName);

    let content = fs.readFileSync(path.join(SRC_DIR, file), 'utf-8');

    // Ensure default export and self-registering logic
    const selfRegisterCode = `
// Auto-registration in browser environment
const _hideko = (typeof window !== 'undefined') ? (window.Hideko || (window.HidekoV8 && window.HidekoV8.Hideko)) : null;
if (_hideko && typeof _hideko.registerLanguage === 'function') {
    _hideko.registerLanguage('${langName}', language, typeof conf !== 'undefined' ? conf : {});
}

export default { language, conf: typeof conf !== 'undefined' ? conf : {} };
`;

    // Strip any existing default export to avoid duplicates
    content = content.replace(/export\s+default\s+[^;]+;?\s*$/m, '');
    content = content.trimEnd() + '\n' + selfRegisterCode;

    // Minify with esbuild
    const minified = transformSync(content, { minify: true, target: 'es2020' }).code;
    fs.writeFileSync(path.join(DIST_DIR, file), minified, 'utf-8');
}

console.log(`✓ Processed & minified ${languageNames.length} language files.`);

// Generate dist/languages/index.js
const imports = languageNames.map(name => `import ${name.replace(/-/g, '_')} from './${name}.js';`).join('\n');
const exportsList = languageNames.map(name => `    ${name.replace(/-/g, '_')}`).join(',\n');
const reexports = languageNames.map(name => `export { default as ${name.replace(/-/g, '_')} } from './${name}.js';`).join('\n');

const indexContent = `/**
 * HidekoV8 Modular Languages Index & Extension Map
 */

${imports}

export { languageAliases, languageAliases as extensionMap, detectLanguage } from './language-aliases.js';

${reexports}

export const allLanguages = {
${exportsList}
};

export default allLanguages;
`;

const minifiedIndex = transformSync(indexContent, { minify: true, target: 'es2020' }).code;
fs.writeFileSync(path.join(DIST_DIR, 'index.js'), minifiedIndex, 'utf-8');
console.log('✓ Generated & minified dist/languages/index.js');

// Minify any root dist JS files (e.g. dist/lib-hidekov8.js, dist/lib-hidekov8.umd.js)
console.log('==> Minifying root dist/ JavaScript files...');
const rootFiles = fs.readdirSync(ROOT_DIST).filter(f => f.endsWith('.js'));
for (const rf of rootFiles) {
    const fullPath = path.join(ROOT_DIST, rf);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const min = transformSync(content, { minify: true, target: 'es2020' }).code;
    fs.writeFileSync(fullPath, min, 'utf-8');
    console.log(`✓ Minified ${rf}`);
}

console.log('==> Build and minification completed successfully!');
