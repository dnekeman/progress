import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { Script } from 'node:vm';
import { build } from 'esbuild';

try {
    process.loadEnvFile('.env.local');
} catch (error) {
    if (error.code !== 'ENOENT') throw error;
}
if (process.env.NEON_FUNCTION_PROGRESS_BASE_URL) {
    const url = new URL(process.env.NEON_FUNCTION_PROGRESS_BASE_URL);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('A public HTTPS API URL is required.');
    url.pathname = `${url.pathname.replace(/\/$/, '')}/`;
    await writeFile('api-config.js', `window.PROGRESS_API_URL = ${JSON.stringify(url.href)};\n`);
}
const config = await readFile('api-config.js', 'utf8');
new Script(config, { filename: 'api-config.js' });
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    new Script(match[1], { filename: 'index.html' });
}
await mkdir('dist', { recursive: true });
await build({
    entryPoints: ['functions/progress.mjs'],
    write: false,
    bundle: true,
    platform: 'node',
    target: 'node24',
    format: 'esm',
    packages: 'external'
});
await copyFile('index.html', 'dist/index.html');
await copyFile('api-config.js', 'dist/api-config.js');
console.log('Build passed: browser JavaScript validated, API bundled, static page copied to dist/index.html.');