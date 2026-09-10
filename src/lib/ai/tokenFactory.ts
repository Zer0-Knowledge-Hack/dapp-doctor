/**
 * Nebius Token Factory client.
 *
 * The API is OpenAI-compatible, so this is a plain REST call rather than an
 * SDK dependency. Note that the base URL comes from our own environment, not
 * from a caller, so the SSRF guard in `diagnostics/ssrfGuard.ts` does not
 * apply here — that guard exists for URLs an untrusted user supplies.
 */

const DEFAULT_BASE_URL = 'https://api.tokenfactory.nebius.com/v1';

/**
 * Reasoning models (DeepSeek-R1 and friends) put their answer in
 * `reasoning_content` and leave `content` empty, which silently yields an
 * empty string if you only read `content`. We read both, so either kind of
 * model works and swapping the model never becomes a silent outage.
 */
const DEFAULT_MODEL = 'deepseek-ai/DeepSeek-V3-0324';

const DEFAULT_TIMEOUT_MS = 20_000;

export type TokenFactoryOutcome =
  | {
      ok: true;
      text: string;
      model: string;
      latencyMs: number;
      usage: { promptTokens: number; completionTokens: number };
    }
  | { ok: false; reason: string; latencyMs: number };

export interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

/** True when a key is configured. Everything AI-shaped checks this first. */
export function isConfigured(): boolean {
  return Boolean(process.env.NEBIUS_API_KEY);
}

export function configuredModel(): string {
  return process.env.NEBIUS_MODEL || DEFAULT_MODEL;
}

export async function chatCompletion(
  messages: ChatMessage[],
  options: { temperature?: number; maxTokens?: number; timeoutMs?: number } = {},
): Promise<TokenFactoryOutcome> {
  const startedAt = Date.now();
  const elapsed = () => Date.now() - startedAt;

  const apiKey = process.env.NEBIUS_API_KEY;
  if (!apiKey) {
    return { ok: false, reason: 'NEBIUS_API_KEY is not set', latencyMs: 0 };
  }

  const baseUrl = (process.env.NEBIUS_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const model = configuredModel();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 700,
      }),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      // The body can carry the provider's own error text; keep it short and
      // never let it reach the user verbatim.
      return {
        ok: false,
        reason: `Token Factory answered HTTP ${response.status}`,
        latencyMs: elapsed(),
      };
    }

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null; reasoning_content?: string | null } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const message = body.choices?.[0]?.message;
    const text = (message?.content || message?.reasoning_content || '').trim();

    if (!text) {
      return { ok: false, reason: 'Token Factory returned an empty answer', latencyMs: elapsed() };
    }

    return {
      ok: true,
      text,
      model,
      latencyMs: elapsed(),
      usage: {
        promptTokens: body.usage?.prompt_tokens ?? 0,
        completionTokens: body.usage?.completion_tokens ?? 0,
      },
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    return {
      ok: false,
      reason: aborted ? 'Token Factory did not answer in time' : 'Token Factory is unreachable',
      latencyMs: elapsed(),
    };
  } finally {
    clearTimeout(timer);
  }
}
