const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/services/notification.ts'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
let user = { id: 'alice', organizationId: 'one' };
const storage = new Map([['cached_notifications', '[{"id":"legacy-private-data"}]']]);
const moduleObject = { exports: {} };
vm.runInNewContext(code, {
  module: moduleObject, exports: moduleObject.exports, console,
  require(name) {
    if (name === './auth') return { authService: { getUserFromToken: () => user } };
    if (name === '@/lib/api') return { __esModule: true, default: {} };
    throw new Error(`Unexpected dependency ${name}`);
  },
  localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
});
const service = moduleObject.exports.notificationService;
service.cacheNotifications([{ id: 'private', userId: 'alice' }]);
assert.equal(service.getCachedNotifications()[0].id, 'private');
user = { id: 'alice', organizationId: 'two' }; assert.equal(service.getCachedNotifications().length, 0);
user = { id: 'bob', organizationId: 'one' }; assert.equal(service.getCachedNotifications().length, 0);
user = null; assert.equal(service.getCachedNotifications().length, 0);
user = { id: 'alice', organizationId: 'one' }; service.clearCache(); assert.equal(service.getCachedNotifications().length, 0);
console.log('PASS: notification cache is isolated by organization and user; legacy cache is never read');
