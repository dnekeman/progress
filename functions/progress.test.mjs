import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './progress.mjs';

function fixture(result = { rows: [], rowCount: 1 }) {
    const calls = [];
    const app = createApp({
        query: async (...args) => {
            calls.push(args);
            return result;
        }
    });
    const request = (path, method, body) => app.request(path, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    return { app, calls, request };
}

test('reads ordered services with browser CORS and no caching', async () => {
    const { app, calls } = fixture({ rows: [{ service_key: 'service' }] });
    const response = await app.request('/services', { headers: { Origin: 'https://example.github.io' } });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), [{ service_key: 'service' }]);
    assert.match(calls[0][0], /ORDER BY sort_order/);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('updates each allowed flag with parameterized values and decoded service keys', async () => {
    for (const column of ['tests_created', 'test_successful', 'deployed_on_acc', 'deployed_on_prd', 'live_on_prd']) {
        const { calls, request } = fixture();
        const response = await request('/services/Service%3A%3A2', 'PATCH', { [column]: true });
        assert.equal(response.status, 200);
        assert.deepEqual(calls[0][1], [true, 'Service::2']);
        assert.match(calls[0][0], new RegExp(`SET ${column} = \\$1`));
    }
});

test('rejects unknown columns, invalid values and multiple fields before querying', async () => {
    for (const body of [null, [], {}, { sort_order: 2 }, { tests_created: 'true' },
        { tests_created: true, live_on_prd: false }, { 'tests_created = true; DROP TABLE service_progress; --': true }]) {
        const { calls, request } = fixture();
        assert.equal((await request('/services/service', 'PATCH', body)).status, 400);
        assert.equal(calls.length, 0);
    }
});

test('unknown services return 404', async () => {
    const { request } = fixture({ rowCount: 0 });
    assert.equal((await request('/services/missing', 'PATCH', { tests_created: true })).status, 404);
});

test('rejects malformed or duplicate orders before querying', async () => {
    for (const body of [null, {}, { service_keys: [] }, { service_keys: ['a', 'a'] },
        { service_keys: [null] }, { service_keys: ['a'], extra: true }]) {
        const { calls, request } = fixture();
        assert.equal((await request('/order', 'POST', body)).status, 400);
        assert.equal(calls.length, 0);
    }
});

test('reorders through one atomic database function', async () => {
    const { calls, request } = fixture();
    assert.equal((await request('/order', 'POST', { service_keys: ['b', 'a'] })).status, 200);
    assert.deepEqual(calls, [['SELECT public.reorder_service_progress($1::text[])', [['b', 'a']]]]);
});

test('handles browser preflight and malformed JSON', async () => {
    const { app, calls } = fixture();
    const preflight = await app.request('/services/service', {
        method: 'OPTIONS', headers: { Origin: 'https://example.github.io', 'Access-Control-Request-Method': 'PATCH' }
    });
    assert.equal(preflight.status, 204);
    assert.match(preflight.headers.get('Access-Control-Allow-Methods'), /PATCH/);
    const invalid = await app.request('/order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{'
    });
    assert.equal(invalid.status, 400);
    assert.equal(calls.length, 0);
});

test('database rejects incomplete orders without exposing internals', async () => {
    const app = createApp({ query: async () => { throw Object.assign(new Error('private database details'), { code: 'P0001' }); } });
    const response = await app.request('/order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ service_keys: ['missing'] })
    });
    assert.equal(response.status, 400);
    assert.doesNotMatch(await response.text(), /private database details/);
});