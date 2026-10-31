# Google credential rotation required

The previously tracked `backend/src/main/resources/credentials.json` contained a Google OAuth client secret. Removal prevents inclusion in new clean builds; it does not revoke copies in Git history or existing artifacts.

The Google project owner must open Google Cloud Console → Google Auth Platform → Clients, select the affected OAuth web client, rotate its client secret, and replace `GOOGLE_CLIENT_SECRET` in every deployment's environment/secret store. Verify the registered public callback URLs before restarting the backend. Disable the previous secret after deploying and testing its replacement. Rebuild artifacts with `mvn clean package` (or the wrapper) to remove stale copied resources.

Review repository access, old images, downloaded artifacts, and logs. Never post either secret in issues or commits. Repository remediation cannot establish whether the old secret was used; review provider audit logs separately. History rewriting is not a substitute for rotation and is not performed by this change.
