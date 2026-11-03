import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { Pool } from 'pg';
import { attachDatabasePool } from '@neon/functions';

const columns = [
    'tests_created', 'test_successful', 'deployed_on_acc', 'deployed_on_prd', 'live_on_prd'
];

export function createApp(database) {
    const app = new Hono();
    app.use('*', cors({
        origin: '*',
        allowMethods: ['GET', 'PATCH', 'POST', 'OPTIONS'],
        allowHeaders: ['Content-Type'],
        maxAge: 86400
    }));
    app.use('*', bodyLimit({ maxSize: 16384 }));
    app.use('*', async (context, next) => {
        context.header('Cache-Control', 'no-store');
        await next();
    });
    app.onError((error, context) => {
        if (error instanceof SyntaxError) return context.json({ error: 'Invalid JSON.' }, 400);
        if (error.code === 'P0001') return context.json({ error: 'The order must include every service exactly once.' }, 400);
        console.error('Progress API request failed:', error.code ?? error.name);
        return context.json({ error: 'Database request failed. Please try again.' }, 503);
    });
    app.get('/services', async context => {
        const { rows } = await database.query(`
            SELECT service_key, wso2_service, java_service_name, version, sort_order,
                   tests_created, test_successful, deployed_on_acc, deployed_on_prd, live_on_prd
            FROM public.service_progress ORDER BY sort_order
        `);
        return context.json(rows);
    });
    app.patch('/services/:key', async context => {
        const body = await context.req.json();
        const entries = body && typeof body === 'object' && !Array.isArray(body)
            ? Object.entries(body) : [];
        if (entries.length !== 1 || !columns.includes(entries[0][0]) || typeof entries[0][1] !== 'boolean') {
            return context.json({ error: 'Provide exactly one boolean progress field.' }, 400);
        }
        const [column, value] = entries[0];
        const { rowCount } = await database.query(
            `UPDATE public.service_progress SET ${column} = $1 WHERE service_key = $2`,
            [value, context.req.param('key')]
        );
        if (!rowCount) return context.json({ error: 'Service not found.' }, 404);
        return context.json({ ok: true });
    });
    app.post('/order', async context => {
        const body = await context.req.json();
        const keys = body?.service_keys;
        if (!Array.isArray(keys) || keys.length === 0 || keys.length > 1000
            || keys.some(key => typeof key !== 'string' || !key || key.length > 1000)
            || new Set(keys).size !== keys.length
            || Object.keys(body).length !== 1) {
            return context.json({ error: 'Provide every service key exactly once.' }, 400);
        }
        await database.query('SELECT public.reorder_service_progress($1::text[])', [keys]);
        return context.json({ ok: true });
    });
    app.notFound(context => context.json({ error: 'Not found.' }, 404));
    return app;
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 10000,
    statement_timeout: 10000
});
attachDatabasePool(pool);

export default createApp(pool);