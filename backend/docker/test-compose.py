"""Resolve the real Compose file with disposable credentials and check isolation."""
import json
import os
import subprocess
from pathlib import Path

env = {**os.environ, 'MONGO_PASSWORD': 'test-root-password', 'MONGO_APP_PASSWORD': 'test-app-password', 'JWT_SECRET': 'test-signing-secret'}
compose = Path(__file__).resolve().parents[1] / 'docker-compose.yml'
result = subprocess.run(['docker', 'compose', '--env-file', '/dev/null', '-f', str(compose), '--profile', 'agents', 'config', '--format', 'json'], env=env, check=True, capture_output=True, text=True)
services = json.loads(result.stdout)['services']
assert not services['mongodb'].get('ports'), 'MongoDB must not expose a host port'
uri = services['backend']['environment']['SPRING_DATA_MONGODB_URI']
assert 'test-app-password' in uri and 'test-root-password' not in uri
assert 'authSource=admin' not in uri
print('PASS: private MongoDB and separate database-scoped application credentials')

worker = services['agent-worker']
assert worker['read_only']
assert not worker.get('ports')
assert worker['environment']['MONGODB_URI'] == uri
assert worker['environment']['AGENT_WORKER_SECRET'] == services['backend']['environment']['AGENT_WORKER_SECRET']
print('PASS: optional worker uses the same restricted database and shared authentication configuration')
