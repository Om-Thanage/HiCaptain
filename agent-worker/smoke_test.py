"""Opt-in local integration check against a separately running test backend.
Uses a local Ollama-compatible fixture, never a paid API or external model.
"""
import json
import os
import threading
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

import httpx
from langgraph.checkpoint.mongodb import MongoDBSaver
from pymongo import MongoClient
import worker

OUTPUT = {'summary': 'Reviewable release plan', 'tasks': [{'title': 'Verify the release', 'description': 'Run release checks', 'acceptanceCriteria': 'All required checks pass', 'priority': 'high'}], 'decisions': ['Require human review before release'], 'questions': []}

class OllamaFixture(BaseHTTPRequestHandler):
    calls = 0
    def do_POST(self):
        assert self.path == '/api/chat'
        data = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        assert data['format']['type'] == 'object' and not data['stream']
        type(self).calls += 1
        payload = json.dumps({'done': True, 'done_reason': 'stop', 'message': {'content': json.dumps(OUTPUT)}, 'prompt_eval_count': 100, 'eval_count': 50}).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)
    def log_message(self, *_args):
        pass


def main():
    api_url = os.environ.get('HICAPTAIN_API_URL', 'http://localhost:8082')
    database = os.environ.get('MONGODB_DATABASE', '')
    if os.environ.get('HICAPTAIN_SMOKE_TEST') != '1' or not database.endswith('_tests') or urlparse(api_url).hostname not in ('localhost', '127.0.0.1'):
        raise SystemExit('Use HICAPTAIN_SMOKE_TEST=1, a local API, and a dedicated MONGODB_DATABASE ending in _tests')
    server = ThreadingHTTPServer(('127.0.0.1', 11434), OllamaFixture)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    client = httpx.Client(base_url=api_url, timeout=30)
    mongo = MongoClient(os.environ['MONGODB_URI'])
    token = client.post('/auth/register', json={'email': f'smoke-{uuid.uuid4()}@example.com', 'password': 'synthetic-test-password', 'organizationName': 'Agent smoke test'}).raise_for_status().json()['token']
    client.headers['Authorization'] = 'Bearer ' + token
    def post(path, body):
        return client.post(path, json=body).raise_for_status().json()
    project = post('/projects', {'name': 'Release smoke check', 'description': 'Dedicated local fixture project', 'status': 'in-progress', 'startDate': '2026-10-31', 'endDate': '2026-11-14', 'developerIds': []})['id']
    base = '/api/agents/projects/' + project
    provider = post('/api/agents/providers', {'name': 'Local fixture', 'kind': 'ollama', 'model': 'fixture', 'baseUrl': 'http://localhost:11434', 'enabled': True, 'remainingTokens': 50000, 'inputPrice': 0, 'outputPrice': 0})['id']
    agent = post(base, {'name': 'Release planner', 'specialty': 'planner', 'instructions': 'Create an actionable plan', 'providerId': provider, 'allowedRoles': ['Admin'], 'enabled': True, 'maxInputTokens': 10000, 'maxOutputTokens': 2000})['id']
    backend = worker.Backend(api_url, os.environ['AGENT_WORKER_SECRET'])
    try:
        with MongoDBSaver.from_conn_string(os.environ['MONGODB_URI'], db_name=database, checkpoint_collection_name='agent_checkpoints', writes_collection_name='agent_checkpoint_writes', ttl=2592000) as saver:
            run = post(base + '/runs', {'agentId': agent, 'instruction': 'Prepare the original release plan'})
            job = backend.request('POST', 'claim')
            assert job['runId'] == run['id'], 'Use an isolated test backend with an empty queue'
            worker.run_job(backend, job, saver)
            ready = client.get(base + '/runs').raise_for_status().json()[0]
            assert ready['status'] == 'READY', ready['status']
            approved = post(base + '/runs/' + run['id'] + '/review', {'accept': True})
            assert approved['status'] == 'APPROVED' and len(approved['createdTaskIds']) == 1
            post(base + '/runs/' + run['id'] + '/review', {'accept': True})
            assert mongo[database].tasks.count_documents({'projectId': project}) == 1
            assert len(client.get(base + '/memory').raise_for_status().json()) == 1
            next_run = post(base + '/runs', {'agentId': agent, 'instruction': 'Change the target date to Friday', 'parentId': run['id']})
            next_job = backend.request('POST', 'claim')
            context = backend.request('GET', next_job['runId'] + '/context', next_job['token'])['context']
            assert context['originalAssignment'] == 'Prepare the original release plan'
            assert context['assignment'] == 'Change the target date to Friday'
            assert len(context['approvedMemory']) == 1 and context['previousOutput']['summary'] == OUTPUT['summary']
            worker.run_job(backend, next_job, saver)
            assert OllamaFixture.calls == 2
            assert saver.get_tuple({'configurable': {'thread_id': next_run['id']}}) is not None
        print('PASS: real HTTP API → LangGraph → local model fixture → Mongo checkpoints → approval → Kanban task + project memory → follow-up')
    finally:
        server.shutdown()
        backend.client.close()
        client.close()
        mongo.close()

if __name__ == '__main__':
    main()
