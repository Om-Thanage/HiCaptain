"""Layered context engine for HiCaptain agents.

Port of the "Engineering Context for Reliable AI Agents" design:

  L1  append-only event log      -> every project record becomes an immutable Event
  L3  keyword + vector index     -> BM25 and a vector index side by side
  L4  hybrid retrieval           -> Reciprocal Rank Fusion, then 0.9 relevance + 0.1 importance
  L6  token-budgeted assembly    -> fixed budget split, edge ordering, question last

Design rule from the paper: store everything, index cheaply, choose context late,
assemble carefully. Three methods share one budget so they can be compared fairly:

  truncation  the latest records that fit (baseline)
  engine      hybrid retrieval with budget split and edge ordering
  planned     the orchestrator chooses fixed retrieval operations; the engine runs them

Sizes are measured in UTF-8 bytes. A byte count is never smaller than the token
count for the supported providers, so a prompt that fits in bytes fits in tokens.
"""
from __future__ import annotations

import hashlib
import json
import math
import re
from collections import Counter
from dataclasses import dataclass, field
from typing import Callable, Iterable, Sequence

# Budget split from the paper (system prompt, rules, facts, recent turns, retrieved).
SPLIT = {'system': 0.10, 'rules': 0.05, 'facts': 0.10, 'recent': 0.40, 'retrieved': 0.35}
RRF_K = 60
RELEVANCE_WEIGHT, IMPORTANCE_WEIGHT = 0.9, 0.1
MAX_TEXT = 1500
STRUCTURE = 256
OPERATIONS = ('search', 'keyword', 'filter_by_time', 'get_event', 'get_facts', 'count')
STOPWORDS = frozenset(
    'a an and are as at be by for from has have in is it its of on or that the this to was were will with '
    'we you our your can should would could not no do does did into than then there these those'.split())


@dataclass(frozen=True)
class Event:
    """One immutable record in the project event log."""
    id: str
    kind: str
    text: str
    time: str = ''
    importance: float = 0.5
    meta: dict = field(default_factory=dict, hash=False, compare=False)

    def view(self) -> dict:
        """What the model reads: a dated note rather than a raw record."""
        note = {'id': self.id, 'kind': self.kind, 'note': self.text}
        if self.time:
            note['date'] = self.time[:10]
        note.update({key: value for key, value in self.meta.items() if value not in ('', None, [])})
        return note


def size(value) -> int:
    return len(json.dumps(value, ensure_ascii=False).encode('utf-8'))


def tokenize(text: str) -> list[str]:
    return [word for word in re.findall(r'[a-z0-9]+', text.lower()) if len(word) > 1 and word not in STOPWORDS]


def _clip(text, limit=MAX_TEXT) -> str:
    text = ' '.join(str(text or '').split())
    return text if len(text) <= limit else text[:limit - 1] + '…'


# ---------------------------------------------------------------- L1: event log

PRIORITY = {'high': 1.0, 'medium': 0.6, 'low': 0.3}


def events_from_context(context: dict) -> tuple[list[Event], list[Event]]:
    """Return (facts, events). Facts are approved decisions; events are everything else."""
    dates = context.get('memoryDates') or {}
    facts = [Event(id=str(item['id']), kind='decision', text=_clip(item.get('content')),
                   time=str(dates.get(item['id'], '')), importance=0.9)
             for item in context.get('approvedMemory', [])]
    events = []
    for task in context.get('tasks', []):
        status, priority = str(task.get('status', '')), str(task.get('priority', '')).lower()
        events.append(Event(
            id=str(task['id']), kind='task',
            text=_clip(f"{task.get('title', '')}: {task.get('description', '')}"),
            importance=PRIORITY.get(priority, 0.5) * (0.5 if status.lower() in ('completed', 'done') else 1.0),
            meta={'status': status, 'priority': priority, 'deadline': str(task.get('deadline', ''))}))
    for item in context.get('evidence', []):
        events.append(Event(
            id=str(item['id']), kind=str(item.get('kind', 'activity')), text=_clip(item.get('text')),
            time=str(item.get('time', '')), importance=float(item.get('importance', 0.5)),
            meta={'outcome': item.get('outcome', '')}))
    return facts, events


# ---------------------------------------------------------------- L3: indexes

class BM25:
    def __init__(self, documents: Sequence[str], k1=1.5, b=0.75):
        self.k1, self.b = k1, b
        self.docs = [Counter(tokenize(doc)) for doc in documents]
        self.lengths = [sum(doc.values()) for doc in self.docs]
        self.average = (sum(self.lengths) / len(self.docs)) if self.docs else 0
        frequency = Counter(term for doc in self.docs for term in doc)
        count = len(self.docs)
        self.idf = {term: math.log(1 + (count - n + 0.5) / (n + 0.5)) for term, n in frequency.items()}

    def scores(self, query: str) -> list[float]:
        terms = tokenize(query)
        results = []
        for doc, length in zip(self.docs, self.lengths):
            score = 0.0
            for term in terms:
                tf = doc.get(term, 0)
                if tf:
                    norm = tf + self.k1 * (1 - self.b + self.b * length / (self.average or 1))
                    score += self.idf[term] * tf * (self.k1 + 1) / norm
            results.append(score)
        return results


def hashed_embedding(texts: Iterable[str], dimensions=512) -> list[list[float]]:
    """Dependency-free vector index: hashed word, word-bigram and character-trigram features.

    This stands in for a dense embedding model so the worker has no extra model download.
    Pass `embed=` to Engine to use a real embedding model instead.
    """
    vectors = []
    for text in texts:
        words = tokenize(text)
        features = words + [a + '_' + b for a, b in zip(words, words[1:])]
        for word in words:
            padded = f'#{word}#'
            features += [padded[i:i + 3] for i in range(len(padded) - 2)]
        vector = [0.0] * dimensions
        for feature in features:
            digest = hashlib.blake2b(feature.encode(), digest_size=8).digest()
            index = int.from_bytes(digest[:4], 'little') % dimensions
            vector[index] += 1.0 if digest[4] & 1 else -1.0
        norm = math.sqrt(sum(value * value for value in vector)) or 1.0
        vectors.append([value / norm for value in vector])
    return vectors


def _cosine(a, b) -> float:
    return sum(x * y for x, y in zip(a, b))


# ---------------------------------------------------------------- L4: retrieval

def rrf(rankings: Sequence[Sequence[int]], k=RRF_K) -> dict[int, float]:
    fused: dict[int, float] = {}
    for ranking in rankings:
        for rank, index in enumerate(ranking):
            fused[index] = fused.get(index, 0.0) + 1.0 / (k + rank + 1)
    return fused


def edge_order(ranked: Sequence) -> list:
    """Strongest items at the edges, weakest in the middle (Lost in the Middle).

    Rank 1 ends the block (right before the question), rank 2 opens it:
    ranks 1..6 are laid out as 2 4 6 5 3 1.
    """
    left, right = [], []
    for position, item in enumerate(ranked):
        (right.insert(0, item) if position % 2 == 0 else left.append(item))
    return left + right


class Engine:
    def __init__(self, events: Sequence[Event], facts: Sequence[Event] = (),
                 embed: Callable[[Iterable[str]], list[list[float]]] = hashed_embedding):
        self.events, self.facts = list(events), list(facts)
        self.by_id = {event.id: event for event in [*self.facts, *self.events]}
        texts = [f'{event.kind} {event.text} {" ".join(map(str, event.meta.values()))}' for event in self.events]
        self.bm25 = BM25(texts)
        self.embed = embed
        self.vectors = embed(texts) if texts else []

    def keyword(self, query: str, k: int) -> list[Event]:
        scores = self.bm25.scores(query)
        order = sorted((i for i, score in enumerate(scores) if score > 0), key=lambda i: -scores[i])
        return [self.events[i] for i in order[:k]]

    def search(self, query: str, k: int) -> list[Event]:
        """Hybrid search: BM25 and vector lists fused by RRF, then reranked with importance."""
        if not self.events or not query.strip():
            return []
        keyword = self.bm25.scores(query)
        query_vector = self.embed([query])[0]
        semantic = [_cosine(query_vector, vector) for vector in self.vectors]
        keyword_rank = sorted((i for i, s in enumerate(keyword) if s > 0), key=lambda i: -keyword[i])
        semantic_rank = sorted((i for i, s in enumerate(semantic) if s > 0), key=lambda i: -semantic[i])
        fused = rrf([keyword_rank, semantic_rank])
        if not fused:
            return []
        best = max(fused.values())
        scored = {i: RELEVANCE_WEIGHT * value / best + IMPORTANCE_WEIGHT * self.events[i].importance
                  for i, value in fused.items()}
        order = sorted(scored, key=lambda i: (-scored[i], self.events[i].id))
        return [self.events[i] for i in order[:k]]

    def recent(self) -> list[Event]:
        timed = [event for event in self.events if event.time]
        return sorted(timed, key=lambda event: (event.time, event.id), reverse=True)

    def filter_by_time(self, after='', before='', kind='') -> list[Event]:
        return [event for event in self.recent()
                if (not after or event.time[:10] >= after[:10])
                and (not before or event.time[:10] <= before[:10])
                and (not kind or event.kind == kind)]

    def count(self, kind='', status='') -> dict:
        matches = [event for event in self.events
                   if (not kind or event.kind == kind)
                   and (not status or str(event.meta.get('status', '')).lower() == status.lower())]
        return {'operation': 'count', 'kind': kind or 'any', 'status': status or 'any', 'result': len(matches)}

    def run(self, operations: Sequence[dict]) -> tuple[list[Event], list[dict]]:
        """Execute planned operations. Returns (events, computed answers)."""
        found: list[Event] = []
        computed: list[dict] = []
        for op in operations:
            name, k = op.get('op'), max(1, min(int(op.get('k') or 5), 8))
            if name == 'search':
                found += self.search(op.get('query', ''), k)
            elif name == 'keyword':
                found += self.keyword(op.get('query', ''), k)
            elif name == 'filter_by_time':
                found += self.filter_by_time(op.get('after', ''), op.get('before', ''), op.get('kind', ''))[:k]
            elif name == 'get_event':
                event = self.by_id.get(op.get('id', ''))
                found += [event] if event else []
            elif name == 'get_facts':
                found += self.facts[:k]
            elif name == 'count':
                computed.append(self.count(op.get('kind', ''), op.get('status', '')))
        unique, seen = [], set()
        for event in found:
            if event.id not in seen:
                seen.add(event.id)
                unique.append(event)
        return unique, computed


# ---------------------------------------------------------------- L6: assembly

def _fill(items: Sequence[Event], allowance: int) -> tuple[list[dict], int]:
    taken, used = [], 0
    for event in items:
        # The user message is JSON inside a JSON string, so measure the escaped form.
        cost = size(json.dumps(event.view(), ensure_ascii=False)) + 2
        if used + cost > allowance:
            continue
        taken.append(event.view())
        used += cost
    return taken, used


def assemble(context: dict, system: str, maximum: int, method: str = 'engine',
             query: str | None = None, operations: Sequence[dict] = (),
             embed: Callable = hashed_embedding) -> tuple[list[dict], dict]:
    """Build [system, user] messages within `maximum` bytes and report what was selected.

    The assignment, original goal, selected task and previous output are pinned:
    every method includes them, so only the choice of supporting context differs.
    """
    if method not in ('truncation', 'engine', 'planned'):
        raise ValueError('Unknown context method')
    facts, events = events_from_context(context)
    engine = Engine(events, facts, embed)
    selected_task = next((task for task in context.get('tasks', [])
                          if task.get('id') and task.get('id') == context.get('selectedTaskId')), None)
    pinned = {
        'project': context.get('project', {}),
        'agent': context.get('agent', {}),
        'selectedTask': selected_task,
        'previousAssignment': context.get('previousAssignment'),
        'previousOutput': context.get('previousOutput'),
        'originalAssignment': context.get('originalAssignment', ''),
        'assignment': context.get('assignment', ''),
    }
    pinned = {key: value for key, value in pinned.items() if value not in (None, '', {})}
    base = [{'role': 'system', 'content': system}, {'role': 'user', 'content': json.dumps(pinned, ensure_ascii=False)}]
    # 512 bytes of provider framing plus room for section keys and the omitted-record count.
    fixed = size(base) + 512 + STRUCTURE
    if fixed > maximum:
        raise ValueError('Assignment and prior output exceed the context allowance')
    available = maximum - fixed
    candidate_ids = {event.id for event in [*facts, *events]} - ({selected_task['id']} if selected_task else set())

    sections: dict[str, list] = {}
    computed: list[dict] = []
    if method == 'truncation':
        ordered = engine.recent() + [event for event in events if not event.time] + facts
        sections['recent'], _ = _fill([e for e in ordered if e.id in candidate_ids], available)
    else:
        share = SPLIT['facts'] + SPLIT['recent'] + SPLIT['retrieved']
        fact_allowance = int(available * SPLIT['facts'] / share)
        recent_allowance = int(available * SPLIT['recent'] / share)
        question = query or context.get('assignment', '')
        if method == 'planned':
            # No plan for this specialist: fall back to hybrid search, as the paper's probe did.
            planned, computed = engine.run(operations or [{'op': 'search', 'query': question, 'k': 8}])
            ranked_facts = [event for event in planned if event.kind == 'decision']
            ranked = [event for event in planned if event.kind != 'decision']
            recent_pool = []
        else:
            fact_engine = Engine(facts, embed=embed)
            ranked_facts = fact_engine.search(question, len(facts)) + facts
            ranked = engine.search(question, len(events))
            recent_pool = engine.recent()
        sections['facts'], used_facts = _fill(_unique(ranked_facts, candidate_ids), fact_allowance)
        chosen = {item['id'] for item in sections['facts']}
        sections['recent'], used_recent = _fill(
            [event for event in recent_pool if event.id in candidate_ids and event.id not in chosen], recent_allowance)
        chosen |= {item['id'] for item in sections['recent']}
        if computed:
            sections['computed'] = computed
        computed_size = size(computed) if computed else 0
        retrieved, _ = _fill([event for event in ranked if event.id in candidate_ids and event.id not in chosen],
                             available - used_facts - used_recent - computed_size)
        sections['retrieved'] = edge_order(retrieved)

    # Stable content first, the question last: facts, recent, retrieved, then the assignment.
    body = {key: pinned[key] for key in ('project', 'agent') if key in pinned}
    for key in ('facts', 'computed', 'recent', 'retrieved'):
        if sections.get(key):
            body[key] = sections[key]
    for key in ('selectedTask', 'previousAssignment', 'previousOutput', 'originalAssignment', 'assignment'):
        if key in pinned:
            body[key] = pinned[key]
    selected_ids = [item['id'] for key in ('facts', 'recent', 'retrieved') for item in sections.get(key, [])]
    body['omittedRecords'] = len(candidate_ids) - len(selected_ids)
    messages = [{'role': 'system', 'content': system}, {'role': 'user', 'content': json.dumps(body, ensure_ascii=False)}]
    if size(messages) + 512 > maximum:
        raise ValueError('Context allowance exceeded')
    stats = {'method': method, 'candidates': len(candidate_ids), 'selected': len(selected_ids),
             'promptBytes': size(messages), 'selectedIds': selected_ids[:200]}
    return messages, stats


def _unique(events: Iterable[Event], allowed: set[str]) -> list[Event]:
    seen, result = set(), []
    for event in events:
        if event.id in allowed and event.id not in seen:
            seen.add(event.id)
            result.append(event)
    return result
