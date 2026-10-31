# Database credentials for Docker

Set `MONGO_PASSWORD`, `MONGO_APP_PASSWORD`, and `JWT_SECRET` in the deployment environment before starting Compose. Generate separate random passwords (hex strings are convenient because MongoDB connection URI passwords must be URL-encoded otherwise). Root credentials are used only to administer MongoDB; the backend uses a separate database-scoped read/write account. MongoDB has no published host port. Use `docker compose exec mongodb mongosh` through the private service for administration.

For an **existing volume**, the initialization script does not run again. Back up the database, authenticate in `mongosh` with its existing administrator, and create the application account in the selected database using the same username/password configured for the backend:

```javascript
db.getSiblingDB(process.env.MONGO_INITDB_DATABASE).createUser({
  user: process.env.MONGO_APP_USERNAME,
  pwd: process.env.MONGO_APP_PASSWORD,
  roles: [{ role: 'readWrite', db: process.env.MONGO_INITDB_DATABASE }]
});
```

Restart the backend only after verifying that the application account connects. Changing environment variables does not rotate users in an existing MongoDB volume; rotate an existing administrator password through MongoDB administration. Never delete a production volume to apply these changes.
