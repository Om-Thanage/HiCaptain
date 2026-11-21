"""Claude provider for HiCaptain workers, using the official Anthropic SDK.

Credentials are the organization's own API key (bring your own key), stored encrypted by
the backend and passed per run. The SDK never retries here: a repeated request could be
billed twice, and HiCaptain's policy is to fail an uncertain request instead of repeating it.
"""
from __future__ import annotations

import anthropic
from pydantic import BaseModel

# Models that accept server-side refusal fallbacks. A refusal on one of these is retried by
# the API itself on a fallback model chosen by refusal category, inside the same request.
FALLBACK_MODELS = frozenset({
    'claude-fable-5-2', 'claude-fable-5-1', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5'})
FALLBACK_BETA = 'server-side-fallback-2026-07-01'


def client_for(provider: dict) -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=provider['apiKey'], max_retries=0,
                               timeout=anthropic.Timeout(180.0, connect=15.0))


def invoke_claude(provider: dict, messages: list[dict], schema: type[BaseModel], maximum_output: int,
                  client=None) -> dict:
    """Return {'output', 'inputTokens', 'outputTokens'} or raise ValueError."""
    system = '\n\n'.join(m['content'] for m in messages if m['role'] == 'system')
    turns = [{'role': m['role'], 'content': m['content']} for m in messages if m['role'] != 'system']
    request = {
        'model': provider['model'],
        'max_tokens': maximum_output,
        # The system prompt is identical across runs, so it is marked for prompt caching.
        'system': [{'type': 'text', 'text': system, 'cache_control': {'type': 'ephemeral'}}],
        'messages': turns,
        'output_format': schema,
    }
    client = client or client_for(provider)
    try:
        if provider['model'] in FALLBACK_MODELS:
            response = client.beta.messages.parse(**request, betas=[FALLBACK_BETA], fallbacks='default')
        else:
            response = client.messages.parse(**request)
    except anthropic.APIStatusError as error:
        # Never surface the response body: it can echo request content.
        raise ValueError(f'Claude request failed with status {error.status_code}') from None
    except anthropic.APIConnectionError:
        raise ValueError('Claude request could not be completed') from None
    if response.stop_reason == 'refusal':
        raise ValueError('Claude declined the request')
    if response.stop_reason == 'max_tokens':
        raise ValueError('Incomplete output')
    if response.parsed_output is None:
        raise ValueError('Claude returned no structured output')
    usage = response.usage
    incoming = (usage.input_tokens or 0) + (usage.cache_creation_input_tokens or 0) + (usage.cache_read_input_tokens or 0)
    return {'output': response.parsed_output.model_dump(), 'inputTokens': incoming,
            'outputTokens': usage.output_tokens or 0}
