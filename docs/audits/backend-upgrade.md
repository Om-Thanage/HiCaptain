# Backend dependency and OAuth index upgrade

The backend now uses Spring Boot 3.5.16 and Springdoc 2.8.17 on Java 17. The complete backend suite passes against isolated MongoDB. An external Java advisory scan was attempted through OSV, but the environment rejected the OSV connection; this change does not claim a zero-CVE Java advisory result.

Spring Data versions differ in how they create a zero-second TTL index. To avoid startup failure on existing non-TTL `expiresAt` indexes, new transient OAuth records store their expiry under `purgeAt` with explicitly named TTL indexes. Pending sign-in/connection flows from before this update must be restarted; existing user accounts, memberships, and connected provider credentials are unaffected.

After backing up the database, an administrator may convert the legacy expiry indexes to TTL so old transient records are purged:

```javascript
db.runCommand({ collMod: 'oauth_flows', index: { name: 'expiresAt', expireAfterSeconds: 0 } });
db.runCommand({ collMod: 'social_login_tickets', index: { name: 'expiresAt', expireAfterSeconds: 0 } });
```

Run these only for collections/indexes that exist, using an administrator authorized to modify indexes. Do not drop user collections or remove database volumes. New `purgeAt` TTL indexes are created automatically by the application.
