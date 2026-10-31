import json
import unittest
from unittest.mock import patch

import httpx
from langgraph.checkpoint.memory import InMemorySaver
import worker

OUTPUT = {'summary': 'Plan', 'tasks': [{'title': 'Review', 'description': 'Check work', 'acceptanceCriteria': 'Checks pass', 'priority': 'high'}], 'decisions': ['Require review'], 'questions': []}
PROVIDER = {'kind': 'openai', 'model': 'fixture', 'baseUrl': 'https://api.openai.com/v1', 'apiKey': 'secret-not-in-checkpoint'}
CONTEXT = {'assignment': 'Prepare release', 'originalAssignment': 'Prepare release', 'selectedTaskId': 'selected', 'project': {'name': 'Release'}, 'tasks': [{'id': 'selected', 'description': 'Important task'}], 'approvedMemory': [{'id': 'm1', 'content': 'Require tests'}]}

class WorkerTests(unittest.TestCase):
    def client(self, payload, inspect=lambda request: None):
        def handle(request):
            inspect(request)
            return httpx.Response(200, json=payload)
        return httpx.Client(transport=httpx.MockTransport(handle))

    def test_openai_and_ollama_use_structured_output_and_report_usage(self):
        def inspect(request):
            data = json.loads(request.content)
            self.assertEqual(data['max_completion_tokens'], 2000)
            self.assertEqual(request.headers['authorization'], 'Bearer ' + PROVIDER['apiKey'])
            self.assertEqual(data['response_format']['type'], 'json_object')
        cloud = {'choices': [{'finish_reason': 'stop', 'message': {'content': json.dumps(OUTPUT)}}], 'usage': {'prompt_tokens': 100, 'completion_tokens': 50}}
        result = worker.invoke_model(PROVIDER, [], 10000, 2000, self.client(cloud, inspect))
        self.assertEqual(result['output'], OUTPUT)
        self.assertEqual(result['inputTokens'], 100)
        local = {'done': True, 'message': {'content': json.dumps(OUTPUT)}, 'prompt_eval_count': 120, 'eval_count': 60}
        provider = {**PROVIDER, 'kind': 'ollama', 'baseUrl': 'http://localhost:11434', 'apiKey': ''}
        result = worker.invoke_model(provider, [], 10000, 2000, self.client(local))
        self.assertEqual(result['outputTokens'], 60)
        self.assertFalse(result['usageEstimated'])

    def test_invalid_or_truncated_model_output_is_not_applied(self):
        for choice in [{'finish_reason': 'length', 'message': {'content': json.dumps(OUTPUT)}}, {'finish_reason': 'stop', 'message': {'content': '{"summary":"bad"}'}}]:
            with self.assertRaises(ValueError):
                worker.invoke_model(PROVIDER, [], 10000, 2000, self.client({'choices': [choice]}))
        unknown_usage = {'choices': [{'finish_reason': 'stop', 'message': {'content': json.dumps(OUTPUT)}}]}
        result = worker.invoke_model(PROVIDER, [], 10000, 2000, self.client(unknown_usage))
        self.assertTrue(result['usageEstimated'])
        self.assertEqual(result['inputTokens'] + result['outputTokens'], 12000)

    def test_retrieval_is_bounded_and_preserves_selected_task_and_latest_goal(self):
        context = {**CONTEXT, 'assignment': 'Move release to Friday', 'tasks': CONTEXT['tasks'] + [{'id': str(i), 'description': 'x' * 2500} for i in range(200)]}
        messages = worker.messages_for(context, 10000)
        self.assertLessEqual(worker.size(messages), 10000)
        sources = json.loads(messages[1]['content'])
        self.assertEqual(sources['tasks'][0]['id'], 'selected')
        self.assertEqual(sources['assignment'], 'Move release to Friday')
        self.assertEqual(sources['originalAssignment'], 'Prepare release')
        self.assertGreater(sources['omittedRecords'], 0)
        with self.assertRaises(ValueError):
            worker.messages_for({**CONTEXT, 'assignment': 'x' * 20000}, 8192)

    def test_checkpoint_resume_publishes_saved_output_without_another_model_call(self):
        class Backend:
            publications = 0
            def request(self, method, path, token=None, body=None):
                if path.endswith('/context'):
                    return {'context': CONTEXT, 'contextHash': 'hash', 'provider': PROVIDER, 'maxInputTokens': 10000, 'maxOutputTokens': 2000}
                if path.endswith('/complete'):
                    self.publications += 1
                    if self.publications == 1:
                        raise KeyboardInterrupt('Simulated process death after generation checkpoint')
                return None
        backend = Backend()
        saver = InMemorySaver()
        job = {'runId': 'run-1', 'token': 'lease-not-in-checkpoint'}
        with patch.object(worker, 'invoke_model', return_value={'output': OUTPUT, 'inputTokens': 100, 'outputTokens': 50, 'usageEstimated': False}) as invoke:
            with self.assertRaises(KeyboardInterrupt):
                worker.run_job(backend, job, saver)
            worker.run_job(backend, job, saver)
            self.assertEqual(invoke.call_count, 1)
            self.assertEqual(backend.publications, 2)
        checkpoints = repr(list(saver.list({'configurable': {'thread_id': 'run-1'}})))
        self.assertNotIn(PROVIDER['apiKey'], checkpoints)
        self.assertNotIn(job['token'], checkpoints)
        self.assertIn('Prepare release', checkpoints)

if __name__ == '__main__':
    unittest.main()
