const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/services/auth.ts'), 'utf8');
const cookies = {}; const options = {}; const storage = {};
Object.defineProperties(storage, {
  getItem: { value: key => storage[key] || null }, setItem: { value: (key, value) => storage[key] = value }, removeItem: { value: key => delete storage[key] },
});
const mod = { exports: {} };
const context = { module: mod, exports: mod.exports, localStorage: storage, window: { location: { protocol: 'https:' } },
  atob: text => Buffer.from(text, 'base64').toString('binary'),
  require(name) {
    if (name === 'js-cookie') return { __esModule: true, default: {
      get: key => cookies[key], set: (key, value, opts) => { cookies[key] = value; options[key] = opts; }, remove: key => delete cookies[key],
    } };
    if (name === '@/lib/api') return { __esModule: true, default: {} };
    throw new Error(name);
  },
};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
const auth = mod.exports.authService;
const expires = Math.floor(Date.now()/1000) + 60;
const token = exp => 'header.' + Buffer.from(JSON.stringify({ exp, userId: 'user', organizationId: 'org', sub: 'Name' })).toString('base64url') + '.signature';
auth.setToken(token(expires)); assert.equal(auth.getToken(), token(expires));
assert.equal(options.token.secure, true); assert.equal(options.token.sameSite, 'lax'); assert.equal(options.token.expires.getTime(), expires*1000);
storage.cached_notifications = 'private'; storage['cached_notifications:org:user'] = 'private';
cookies.token = token(expires-120); storage.token = cookies.token;
assert.equal(auth.getToken(), null); assert.equal(storage.token, undefined); assert.equal(storage.cached_notifications, undefined);
cookies.token = 'malformed'; assert.equal(auth.getToken(), null);
context.window = undefined; assert.equal(auth.getToken(), null);
console.log('PASS: HTTPS cookie policy, expiry, malformed tokens, sign-out cache cleanup and server rendering');
