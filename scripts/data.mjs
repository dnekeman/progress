import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { Client } from 'pg';

const fields = [
    'service_key', 'wso2_service', 'java_service_name', 'version', 'sort_order',
    'tests_created', 'test_successful', 'live_on_prd', 'deployed_on_acc', 'deployed_on_prd'
];
const [command, filename = 'backups/progress.json'] = process.argv.slice(2);

function normalized(rows) {
    assert.ok(Array.isArray(rows) && rows.length > 0, 'Snapshot must contain rows.');
    assert.equal(new Set(rows.map(row => row.service_key)).size, rows.length, 'Duplicate service keys.');
    assert.equal(new Set(rows.map(row => row.sort_order)).size, rows.length, 'Duplicate sort orders.');
    for (const row of rows) {
        for (const field of fields.slice(0, 4)) assert.equal(typeof row[field], 'string', `Invalid ${field}.`);
        assert.ok(Number.isInteger(row.sort_order) && row.sort_order > 0, 'Invalid sort order.');
        for (const field of fields.slice(5)) assert.equal(typeof row[field], 'boolean', `Invalid ${field}.`);
        assert.deepEqual(Object.keys(row).sort(), [...fields].sort(), 'Unexpected or missing columns.');
    }
    return [...rows].sort((first, second) => first.sort_order - second.sort_order)
        .map(row => Object.fromEntries(fields.map(field => [field, row[field]])));
}

function digest(rows) {
    return createHash('sha256').update(JSON.stringify(normalized(rows))).digest('hex');
}

async function sourceRows() {
    assert.ok(process.env.SOURCE_URL && process.env.SOURCE_API_KEY, 'Set SOURCE_URL and SOURCE_API_KEY locally.');
    const rows = [];
    let total;
    do {
        const url = new URL(process.env.SOURCE_URL);
        url.searchParams.set('select', '*');
        url.searchParams.set('order', 'sort_order');
        const response = await fetch(url, { headers: {
            apikey: process.env.SOURCE_API_KEY,
            Prefer: 'count=exact',
            Range: `${rows.length}-${rows.length + 999}`
        } });
        assert.ok(response.ok, `Source read failed: HTTP ${response.status}.`);
        const count = response.headers.get('content-range')?.split('/')[1];
        assert.match(count ?? '', /^\d+$/, 'Source must provide an exact row count.');
        total = Number(count);
        const page = await response.json();
        assert.ok(Array.isArray(page) && page.length > 0, 'Source returned an empty page.');
        rows.push(...page);
    } while (rows.length < total);
    assert.equal(rows.length, total, 'Incomplete source snapshot.');
    return normalized(rows);
}

if (command === 'capture') {
    const rows = await sourceRows();
    await mkdir(dirname(filename), { recursive: true });
    await writeFile(filename, JSON.stringify({ capturedAt: new Date().toISOString(), sha256: digest(rows), rows }, null, 2), { flag: 'wx' });
    console.log(`Captured ${rows.length} live rows, all 10 columns and saved ordering. SHA-256: ${digest(rows)}`);
} else if (['import', 'verify', 'verify-source'].includes(command)) {
    const snapshot = JSON.parse(await readFile(filename, 'utf8'));
    const rows = normalized(snapshot.rows);
    assert.equal(digest(rows), snapshot.sha256, 'Snapshot checksum mismatch.');
    if (command === 'verify-source') {
        assert.deepEqual(await sourceRows(), rows, 'Source changed after the snapshot. Do not cut over.');
        console.log(`Source unchanged: ${rows.length} rows still match the snapshot exactly.`);
    } else {
        assert.ok(process.env.DATABASE_URL_UNPOOLED, 'DATABASE_URL_UNPOOLED is required.');
        const client = new Client({ connectionString: process.env.DATABASE_URL_UNPOOLED });
        await client.connect();
        try {
            await client.query('BEGIN');
            if (command === 'import') {
                await client.query(await readFile(new URL('../schema.sql', import.meta.url), 'utf8'));
                await client.query('LOCK TABLE public.service_progress IN EXCLUSIVE MODE');
                const count = await client.query('SELECT count(*)::integer AS count FROM public.service_progress');
                assert.equal(count.rows[0].count, 0, 'Target is not empty; refusing to overwrite data.');
                await client.query(`
                    INSERT INTO public.service_progress (${fields.join(', ')})
                    SELECT ${fields.join(', ')} FROM jsonb_to_recordset($1::jsonb) AS imported (
                        service_key text, wso2_service text, java_service_name text, version text,
                        sort_order integer, tests_created boolean, test_successful boolean,
                        live_on_prd boolean, deployed_on_acc boolean, deployed_on_prd boolean
                    )`, [JSON.stringify(rows)]);
            }
            const result = await client.query('SELECT * FROM public.service_progress ORDER BY sort_order');
            assert.deepEqual(normalized(result.rows), rows, 'Target differs from snapshot.');
            await client.query('COMMIT');
            console.log(`${command === 'import' ? 'Imported and verified' : 'Verified'} ${rows.length} Neon rows, all 10 columns and saved ordering. SHA-256: ${digest(rows)}`);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            await client.end();
        }
    }
} else {
    throw new Error('Usage: npm run data -- capture|import|verify|verify-source [snapshot.json]');
}