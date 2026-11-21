import unittest
from types import SimpleNamespace
from unittest.mock import patch

from langgraph.checkpoint.memory import InMemorySaver

import claude_provider
import worker

BRAIN = {'kind': 'anthropic', 'model': 'claude-opus-5-5', 'baseUrl': 'https://api.anthropic.com', 'apiKey': 'brain-key-not-in-checkpoint'}
CHEAP = {'kind': 'ollama', 'model': 'qwen3:8b', 'baseUrl': 'http://localhost:11434', 'apiKey': ''}
OUTPUT = {'summary': 'Plan', 'tasks': [{'title': 'Add retry', 'description': 'Retry payment call', 'acceptanceCriteria': 'Timeout handled', 'priority': 'high'}], 'decisions': [], 'questions': []}
PLAN = {'summary': 'Split by layer', 'subtasks': [
    {'specialty': 'backend', 'instruction': 'Fix the payment timeout', 'retrieval': [{'op': 'get_event', 'id': 'feedback-1', 'query': '', 'kind': '', 'status': '', 'after': '', 'before': '', 'k': 5}]},
    {'specialty': 'testing', 'instruction': 'Plan timeout tests', 'retrieval': [{'op': 'count', 'kind': 'task', 'status': 'pending', 'query': '', 'id': '', 'after': '', 'before': '', 'k': 5}]},
    {'specialty': 'frontend', 'instruction': 'Over the worker limit', 'retrieval': []}]}
CONTEXT = {'assignment': 'Fix checkout timeouts', 'originalAssignment': 'Fix checkout timeouts', 'selectedTaskId': '',
           'project': {'name': 'Shop'}, 'agent': {'name': 'Captain', 'specialty': 'orchestrator'}, 'tasks': [{'id': 't1', 'title': 'Checkout', 'description': 'Pay', 'status': 'pending'}],
           'approvedMemory': [], 'evidence': [{'id': 'feedback-1', 'kind': 'feedback', 'time': '2026-11-01', 'text': 'Payment times out'}]}


class FakeBackend:
    def __init__(self):
        self.completed, self.failed, self.begun = [], 0, 0

    def request(self, method, path, token=None, body=None):
        if path.endswith('/context'):
            return {'context': CONTEXT, 'contextHash': 'hash', 'provider': BRAIN, 'workerProvider': CHEAP,
                    'specialty': 'orchestrator', 'contextMethod': 'planned', 'maxWorkers': 2,
                    'maxInputTokens': 12000, 'maxOutputTokens': 2000}
        if path.endswith('/begin'):
            self.begun += 1
        if path.endswith('/complete'):
            self.completed.append(body)
        if path.endswith('/failed'):
            self.failed += 1
        return None


def fake_model(calls, crash_on=None):
    def invoke(provider, messages, maximum_input, maximum_output, client=None, schema=worker.Output):
        calls.append((provider['model'], schema.__name__, messages[1]['content']))
        if crash_on and crash_on(provider):
            raise KeyboardInterrupt('Simulated process death during specialist work')
        if schema is worker.Plan:
            return {'output': PLAN, 'inputTokens': 1000, 'outputTokens': 200, 'usageEstimated': False}
        cheap = provider is CHEAP
        return {'output': OUTPUT, 'inputTokens': 500 if cheap else 900, 'outputTokens': 100 if cheap else 300, 'usageEstimated': False}
    return invoke


class OrchestratorTests(unittest.TestCase):
    def test_brain_plans_and_merges_while_capped_specialists_run_on_the_worker_model(self):
        backend, calls = FakeBackend(), []
        with patch.object(worker, 'invoke_model', side_effect=fake_model(calls)):
            worker.run_job(backend, {'runId': 'run-o', 'token': 't' * 40, 'specialty': 'orchestrator'}, InMemorySaver())
        self.assertEqual([(model, schema) for model, schema, _ in calls if model == 'claude-opus-5-5'],
                         [('claude-opus-5-5', 'Plan'), ('claude-opus-5-5', 'Output')])
        self.assertEqual(sum(model == 'qwen3:8b' for model, _, _ in calls), 2, 'Specialists are capped at maxWorkers')
        self.assertEqual(backend.begun, 1)
        body = backend.completed[0]
        self.assertEqual((body['workerInputTokens'], body['workerOutputTokens']), (1000, 200))
        self.assertEqual((body['inputTokens'], body['outputTokens']), (1000 + 900 + 1000, 200 + 300 + 200))
        self.assertEqual(body['trace']['method'], 'planned')
        self.assertEqual(body['trace']['workers'], ['backend', 'testing'])
        self.assertIn('feedback-1', body['trace']['selectedIds'])
        testing_prompt = next(content for model, _, content in calls if model == 'qwen3:8b' and 'timeout tests' in content)
        self.assertIn('"computed"', testing_prompt, 'Exact counts are computed for the specialist')
        self.assertIn('"testing specialist"', testing_prompt)
        self.assertNotIn('Captain', testing_prompt, 'Specialists do not see the orchestrator role')

    def test_interrupted_specialist_work_is_failed_not_repeated(self):
        backend, calls, saver = FakeBackend(), [], InMemorySaver()
        job = {'runId': 'run-c', 'token': 'lease-not-in-checkpoint' * 2, 'specialty': 'orchestrator'}
        with patch.object(worker, 'invoke_model', side_effect=fake_model(calls, crash_on=lambda p: p is CHEAP)):
            with self.assertRaises(KeyboardInterrupt):
                worker.run_job(backend, job, saver)
            before = len(calls)
            worker.run_job(backend, job, saver)
        self.assertEqual(len(calls), before, 'No model call after an uncertain interruption')
        self.assertEqual(backend.failed, 1)
        self.assertEqual(backend.completed, [])
        checkpoints = repr(list(saver.list({'configurable': {'thread_id': 'run-c'}})))
        self.assertNotIn(BRAIN['apiKey'], checkpoints)
        self.assertNotIn(job['token'], checkpoints)


class FakeClaude:
    def __init__(self, stop_reason='end_turn'):
        self.requests = []
        parsed = worker.Output.model_validate(OUTPUT)
        usage = SimpleNamespace(input_tokens=700, cache_creation_input_tokens=0, cache_read_input_tokens=300, output_tokens=150)
        response = SimpleNamespace(stop_reason=stop_reason, parsed_output=parsed, usage=usage)

        def parse(beta):
            def call(**request):
                self.requests.append((beta, request))
                return response
            return call
        self.messages = SimpleNamespace(parse=parse(False))
        self.beta = SimpleNamespace(messages=SimpleNamespace(parse=parse(True)))


class ClaudeProviderTests(unittest.TestCase):
    MESSAGES = [{'role': 'system', 'content': 'rules'}, {'role': 'user', 'content': '{"assignment":"x"}'}]

    def test_structured_output_usage_and_fallbacks(self):
        client = FakeClaude()
        result = worker.invoke_model(BRAIN, self.MESSAGES, 12000, 2000, client)
        beta, request = client.requests[0]
        self.assertTrue(beta)
        self.assertEqual(request['fallbacks'], 'default')
        self.assertEqual(request['output_format'], worker.Output)
        self.assertEqual(request['system'][0]['cache_control'], {'type': 'ephemeral'})
        self.assertEqual(request['messages'], [{'role': 'user', 'content': '{"assignment":"x"}'}])
        self.assertEqual((result['inputTokens'], result['outputTokens']), (1000, 150))
        self.assertFalse(result['usageEstimated'])

        haiku = FakeClaude()
        worker.invoke_model({**BRAIN, 'model': 'claude-haiku-5-5'}, self.MESSAGES, 12000, 2000, haiku)
        self.assertFalse(haiku.requests[0][0])
        self.assertNotIn('fallbacks', haiku.requests[0][1])

    def test_refusal_and_truncation_are_not_applied(self):
        for reason in ('refusal', 'max_tokens'):
            with self.assertRaises(ValueError):
                worker.invoke_model(BRAIN, self.MESSAGES, 12000, 2000, FakeClaude(reason))

    def test_sdk_never_retries_billed_requests(self):
        self.assertEqual(claude_provider.client_for(BRAIN).max_retries, 0)


if __name__ == '__main__':
    unittest.main()
