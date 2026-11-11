const mongoose = require('mongoose');
const { createModels } = require('./models');

async function connectDatabase(uri) {
    if (!uri) throw new Error('MONGODB_URI is required; configure the project .env file.');
    const connection = mongoose.createConnection(uri, {
        serverSelectionTimeoutMS: 5000, autoCreate: true, autoIndex: true
    });
    connection.on('error', () => console.error('MongoDB connection error. Check the local MongoDB service.'));
    try {
        await connection.asPromise();
        const models = createModels(connection);
        // Wait for unique indexes before accepting requests.
        await Promise.all(Object.values(models).map((model) => model.init()));
        return { connection, models };
    } catch (error) {
        await connection.close();
        throw error;
    }
}
module.exports = { connectDatabase };
