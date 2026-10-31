// Runs only when initializing a new MongoDB volume.
const name = process.env.MONGO_INITDB_DATABASE;
const username = process.env.MONGO_APP_USERNAME;
const password = process.env.MONGO_APP_PASSWORD;
if (!name || !username || !password) throw new Error('Application database credentials are required');
db.getSiblingDB(name).createUser({ user: username, pwd: password, roles: [{ role: 'readWrite', db: name }] });
