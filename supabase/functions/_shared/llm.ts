// The model behind the WhatsApp agent: Anthropic directly, Groq, or any model on OpenRouter. The agent
// always speaks Anthropic's message format; for Groq and OpenRouter it is translated to the OpenAI
// format and back here, so switching is only a secret. No Deno APIs beyond secrets, so tests run it in Node.
//
// Secrets: AGENT_PROVIDER (anthropic, groq or openrouter; when unset, whichever key is set, in that order).
// - anthropic: ANTHROPIC_API_KEY, optionally ANTHROPIC_MODEL.
// - groq: GROQ_API_KEY, optionally GROQ_MODEL (default openai/gpt-oss-120b) and GROQ_PRICE_IN /
//   GROQ_PRICE_OUT in USD per million tokens for the daily cap (0 on the free plan).
// - openrouter: OPENROUTER_API_KEY and OPENROUTER_MODEL (a model with tools; OpenRouter reports the cost).

declare const Deno: { env: { get(key: string): string | undefined } } | undefined
const env = (key: string) => (typeof Deno !== 'undefined' ? Deno.env.get(key) : (globalThis as any).process?.env?.[key]) || ''

type Provider = 'anthropic' | 'groq' | 'openrouter'

export const provider = (): Provider | null => {
    const want = env('AGENT_PROVIDER').toLowerCase()
    if (want === 'groq') return env('GROQ_API_KEY') ? 'groq' : null
    if (want === 'openrouter') return env('OPENROUTER_API_KEY') && env('OPENROUTER_MODEL') ? 'openrouter' : null
    if (want === 'anthropic') return env('ANTHROPIC_API_KEY') ? 'anthropic' : null
    if (env('ANTHROPIC_API_KEY')) return 'anthropic'
    if (env('GROQ_API_KEY')) return 'groq'
    if (env('OPENROUTER_API_KEY') && env('OPENROUTER_MODEL')) return 'openrouter'
    return null
}

const text = (system: unknown) => (Array.isArray(system) ? system.map((s: any) => String(s?.text || '')).join('\n\n') : String(system || ''))

// Anthropic request -> OpenAI chat request.
export const toOpenAI = (body: any, to: 'groq' | 'openrouter' = 'openrouter') => {
    const messages: any[] = [{ role: 'system', content: text(body.system) }]
    for (const m of body.messages || []) {
        if (typeof m.content === 'string') { messages.push({ role: m.role, content: m.content }); continue }
        const blocks: any[] = m.content || []
        if (m.role === 'assistant') {
            const said = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n')
            const calls = blocks.filter((b) => b.type === 'tool_use').map((b) => ({ id: b.id, type: 'function', function: { name: b.name, arguments: JSON.stringify(b.input || {}) } }))
            messages.push({ role: 'assistant', content: said || null, ...(calls.length ? { tool_calls: calls } : {}) })
        } else {
            for (const b of blocks) {
                if (b.type === 'tool_result') messages.push({ role: 'tool', tool_call_id: b.tool_use_id, content: `${b.is_error ? 'ERROR: ' : ''}${typeof b.content === 'string' ? b.content : JSON.stringify(b.content)}` })
                else if (b.type === 'text') messages.push({ role: 'user', content: b.text })
            }
        }
    }
    return {
        model: to === 'groq' ? env('GROQ_MODEL') || 'openai/gpt-oss-120b' : env('OPENROUTER_MODEL'),
        max_tokens: body.max_tokens,
        messages,
        tools: (body.tools || []).map((t: any) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } })),
        tool_choice: 'auto',
        // OpenRouter adds the cost to its answer when asked; Groq takes no extra fields.
        ...(to === 'openrouter' ? { usage: { include: true } } : {}),
    }
}

// OpenAI chat response -> Anthropic response.
export const fromOpenAI = (res: any) => {
    const msg = res?.choices?.[0]?.message || {}
    const content: any[] = []
    if (msg.content) content.push({ type: 'text', text: String(msg.content) })
    for (const c of msg.tool_calls || []) {
        let input = {}
        try { input = JSON.parse(c.function?.arguments || '{}') } catch { input = {} }
        content.push({ type: 'tool_use', id: c.id || `call_${content.length}`, name: c.function?.name, input })
    }
    const u = res?.usage || {}
    return {
        content,
        stop_reason: (msg.tool_calls || []).length ? 'tool_use' : 'end_turn',
        usage: { input_tokens: u.prompt_tokens || 0, output_tokens: u.completion_tokens || 0, ...(typeof u.cost === 'number' ? { cost_usd: u.cost } : {}) },
    }
}

export const callModel = async (body: Record<string, unknown>) => {
    const which = provider()
    if (which === 'anthropic') {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'x-api-key': env('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
            body: JSON.stringify(body),
        })
        const json: any = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(`Anthropic ${res.status}: ${String(json?.error?.message || '').slice(0, 300)}`)
        return json
    }
    if (which === 'groq') {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${env('GROQ_API_KEY')}`, 'content-type': 'application/json' },
            body: JSON.stringify(toOpenAI(body, 'groq')),
        })
        const json: any = await res.json().catch(() => ({}))
        if (!res.ok || json?.error) throw new Error(`Groq ${res.status}: ${String(json?.error?.message || '').slice(0, 300)}`)
        const out = fromOpenAI(json)
        // Groq does not say what a call cost: from its prices per million tokens, 0 on the free plan.
        out.usage = { ...out.usage, cost_usd: (out.usage.input_tokens * (Number(env('GROQ_PRICE_IN')) || 0) + out.usage.output_tokens * (Number(env('GROQ_PRICE_OUT')) || 0)) / 1e6 }
        return out
    }
    if (which === 'openrouter') {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${env('OPENROUTER_API_KEY')}`, 'content-type': 'application/json', 'HTTP-Referer': 'https://locappoint.com', 'X-Title': 'Locappoint' },
            body: JSON.stringify(toOpenAI(body, 'openrouter')),
        })
        const json: any = await res.json().catch(() => ({}))
        if (!res.ok || json?.error) throw new Error(`OpenRouter ${res.status}: ${String(json?.error?.message || '').slice(0, 300)}`)
        return fromOpenAI(json)
    }
    throw new Error('No model set: ANTHROPIC_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY with OPENROUTER_MODEL')
}
