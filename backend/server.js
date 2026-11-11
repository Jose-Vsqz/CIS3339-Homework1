const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { connectDatabase } = require('./database');
const { createApp } = require('./app');

async function startServer({ uri = process.env.MONGODB_URI, port = process.env.PORT || 3000 } = {}) {
    if (!/^\d+$/.test(String(port)) || Number(port) > 65535) throw new Error('PORT must be between 0 and 65535.');
    const database = await connectDatabase(uri);
    try {
        const app = createApp(database.models);
        const server = await new Promise((resolve, reject) => {
            const listener = app.listen(Number(port), () => resolve(listener));
            listener.once('error', reject);
        });
        return { ...database, app, server, async close() {
            await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
            await database.connection.close();
        } };
    } catch (error) {
        await database.connection.close();
        throw error;
    }
}
if (require.main === module) {
    startServer().then((runtime) => {
        console.log(`Server is running on http://localhost:${runtime.server.address().port}`);
        const shutdown = () => runtime.close().then(() => process.exit(0)).catch(() => process.exit(1));
        process.once('SIGINT', shutdown);
        process.once('SIGTERM', shutdown);
    }).catch((error) => {
        console.error(`Startup failed (${error.name}). Check local MongoDB, .env, indexes, and PORT.`);
        process.exitCode = 1;
    });
}
module.exports = { startServer };
