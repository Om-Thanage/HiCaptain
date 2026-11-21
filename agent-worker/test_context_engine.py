import json
import unittest

import context_engine as engine

SYSTEM = 'system prompt'


def project(evidence=(), tasks=(), memory=()):
    return {'project': {'name': 'Shop'}, 'agent': {'name': 'Planner'}, 'assignment': 'Fix the checkout payment timeout',
            'originalAssignment': 'Fix the checkout payment timeout', 'selectedTaskId': '',
            'tasks': list(tasks), 'approvedMemory': list(memory), 'evidence': list(evidence)}


def filler(count, start=0):
    return [{'id': f'noise-{i}', 'kind': 'commit', 'time': f'2026-11-{(i % 28) + 1:02d}T10:00:00',
             'text': f'Update footer colours and marketing copy variant {i}'} for i in range(start, start + count)]


class ContextEngineTests(unittest.TestCase):
    def test_edge_ordering_puts_strongest_items_at_the_edges(self):
        self.assertEqual(engine.edge_order([1, 2, 3, 4, 5, 6]), [2, 4, 6, 5, 3, 1])
        self.assertEqual(engine.edge_order([1]), [1])

    def test_rrf_rewards_items_ranked_by_both_lists(self):
        fused = engine.rrf([[0, 1, 2], [2, 0, 1]])
        self.assertEqual(max(fused, key=fused.get), 0)

    def test_hybrid_search_finds_old_relevant_evidence_that_truncation_misses(self):
        relevant = {'id': 'feedback-1', 'kind': 'feedback', 'time': '2026-01-05T09:00:00',
                    'text': 'Client reports the checkout payment request times out after 30 seconds', 'importance': 0.8}
        context = project(evidence=[relevant] + filler(300))
        _, truncated = engine.assemble(context, SYSTEM, 12000, 'truncation')
        _, hybrid = engine.assemble(context, SYSTEM, 12000, 'engine')
        self.assertNotIn('feedback-1', truncated['selectedIds'])
        self.assertIn('feedback-1', hybrid['selectedIds'])
        self.assertLess(hybrid['selected'], hybrid['candidates'])

    def test_every_method_respects_the_budget_and_keeps_the_question_last(self):
        context = project(evidence=filler(400), tasks=[{'id': 't1', 'title': 'Checkout', 'description': 'x' * 2000}],
                          memory=[{'id': 'm1', 'content': 'Payments go through the provider SDK only'}])
        for method in ('truncation', 'engine', 'planned'):
            messages, stats = engine.assemble(context, SYSTEM, 9000, method, operations=[{'op': 'search', 'query': 'checkout'}])
            self.assertLessEqual(engine.size(messages) + 512, 9000)
            body = json.loads(messages[1]['content'])
            self.assertEqual(list(body)[-2:], ['assignment', 'omittedRecords'])
            self.assertEqual(stats['method'], method)

    def test_approved_decisions_are_shown_as_dated_notes(self):
        context = project(memory=[{'id': 'm1', 'content': 'Checkout payment timeout is 45 seconds'}])
        context['memoryDates'] = {'m1': '2026-10-02T08:00:00Z'}
        messages, _ = engine.assemble(context, SYSTEM, 9000, 'engine')
        fact = json.loads(messages[1]['content'])['facts'][0]
        self.assertEqual(fact, {'id': 'm1', 'kind': 'decision', 'note': 'Checkout payment timeout is 45 seconds', 'date': '2026-10-02'})

    def test_planned_operations_fetch_records_and_compute_exact_counts(self):
        tasks = [{'id': f't{i}', 'title': f'Task {i}', 'description': 'work', 'status': 'completed' if i < 3 else 'pending'}
                 for i in range(5)]
        context = project(evidence=filler(20), tasks=tasks)
        operations = [{'op': 'get_event', 'id': 'noise-7'}, {'op': 'count', 'kind': 'task', 'status': 'completed'}]
        messages, stats = engine.assemble(context, SYSTEM, 9000, 'planned', operations=operations)
        body = json.loads(messages[1]['content'])
        self.assertEqual(stats['selectedIds'], ['noise-7'])
        self.assertEqual(body['computed'][0]['result'], 3)

    def test_planned_method_without_operations_falls_back_to_hybrid_search(self):
        relevant = {'id': 'feedback-1', 'kind': 'feedback', 'time': '2026-01-05',
                    'text': 'Checkout payment request times out'}
        _, stats = engine.assemble(project(evidence=[relevant] + filler(50)), SYSTEM, 9000, 'planned')
        self.assertIn('feedback-1', stats['selectedIds'])

    def test_selected_task_and_previous_output_are_always_pinned(self):
        context = project(tasks=[{'id': 'chosen', 'title': 'Chosen', 'description': 'details'}])
        context.update(selectedTaskId='chosen', previousOutput={'summary': 'earlier'})
        messages, stats = engine.assemble(context, SYSTEM, 9000, 'truncation')
        body = json.loads(messages[1]['content'])
        self.assertEqual(body['selectedTask']['id'], 'chosen')
        self.assertEqual(body['previousOutput'], {'summary': 'earlier'})
        self.assertNotIn('chosen', stats['selectedIds'])

    def test_oversized_pinned_content_is_rejected(self):
        with self.assertRaises(ValueError):
            engine.assemble({**project(), 'assignment': 'x' * 20000}, SYSTEM, 8192)


if __name__ == '__main__':
    unittest.main()
