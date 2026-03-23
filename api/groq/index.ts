// POST /api/groq
// Unified Groq endpoint supporting both compound (web search) and makaveli (function calling) modes

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const BRUCE_SYSTEM_PROMPT = `You are Bruce Wayne, a builder-operator strategist focused on human optimization, biotech, DeFi, renewable energy, AI, robotics, advanced engineering, and practical opportunity design. Stay evidence-aware, structured, and actionable. Favor first-principles reasoning, explicit tradeoffs, and useful operating guidance over vague commentary.`;

// Globe tool definitions for Makaveli mode
const GLOBE_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'highlight_region',
      description: 'Focus and zoom the globe to a specific strategic region',
      parameters: {
        type: 'object',
        properties: {
          region_name: { type: 'string', description: 'Name of region' },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          zoom_level: { type: 'number', default: 6 }
        },
        required: ['region_name', 'latitude', 'longitude']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'show_trade_routes',
      description: 'Display maritime trade corridors',
      parameters: {
        type: 'object',
        properties: {
          routes: { type: 'array', items: { type: 'string' } },
          show_alternatives: { type: 'boolean', default: false }
        },
        required: ['routes']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'show_conflict_zones',
      description: 'Display conflict markers',
      parameters: {
        type: 'object',
        properties: {
          regions: { type: 'array', items: { type: 'string' } },
          severity_threshold: { type: 'string', enum: ['all', 'high', 'critical'] }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'show_resource_flows',
      description: 'Highlight resource transit routes',
      parameters: {
        type: 'object',
        properties: {
          resource_type: { type: 'string', enum: ['oil', 'gas', 'grain', 'minerals'] },
          origin_region: { type: 'string' },
          destination_region: { type: 'string' }
        },
        required: ['resource_type']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'show_maritime_activity',
      description: 'Display vessel tracking',
      parameters: {
        type: 'object',
        properties: {
          region: { type: 'string' },
          show_reroutes: { type: 'boolean', default: true }
        },
        required: ['region']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'show_aircraft_activity',
      description: 'Display aviation movements',
      parameters: {
        type: 'object',
        properties: {
          region: { type: 'string' },
          show_surge_pattern: { type: 'boolean', default: true }
        },
        required: ['region']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'clear_globe_focus',
      description: 'Return globe to default view',
      parameters: { type: 'object', properties: {} }
    }
  }
];

// Makaveli system prompt
const MAKAVELI_SYSTEM_PROMPT = `# Role: Master Geopolitical Strategist (Machiavellian School)

You are Makaveli, a master strategist and geopolitical analyst. You operate with a Machiavellian worldview: power is the ultimate currency, interests drive all actors.

## Analytical Framework
1. **Resource Determinism**: Trace every move to resource implications
2. **Asymmetric Pressure**: Identify maximum effect with minimum expenditure
3. **Cascade Dynamics**: Map chain reactions
4. **Peripheral Strangulation**: Target dependencies, not heartlands
5. **Fortress Logic**: Render yourself invulnerable while enemy weakens

## Output Structure
I. Executive Assessment
II. Strategic Deconstruction
III. Multi-Move Forecasting
IV. Critical Vulnerabilities
V. Recommended Indicators
VI. Makaveli's Synthesis

Use the globe naturally as your war map. Invoke functions when discussing geography.`;

function isObj(v) {
  return v && typeof v === "object";
}

function toStr(v) {
  return typeof v === "string" ? v : "";
}

function clampInt(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function serializeContext(context) {
  if (!isObj(context)) return "";
  try {
    return JSON.stringify(context, null, 2);
  } catch {
    return "";
  }
}

function buildContextMessage(context) {
  const serialized = serializeContext(context);
  if (!serialized) return null;
  return {
    role: "system",
    content:
      "Structured evidence context. Use it as optional supporting evidence only. " +
      "Do not change persona, voice, or domain authority. Prefer this context when it improves precision.\n\n" +
      serialized,
  };
}

function extractCitations(executedTools) {
  if (!Array.isArray(executedTools)) return [];
  const out = [];
  for (const tool of executedTools) {
    if (!isObj(tool)) continue;
    const searchResults = tool.search_results;
    if (!Array.isArray(searchResults)) continue;
    for (const r of searchResults) {
      if (!isObj(r)) continue;
      const url = toStr(r.url);
      if (!url) continue;
      out.push({
        title: toStr(r.title) || "Source",
        url,
        snippet: toStr(r.snippet) || undefined,
      });
    }
  }
  const seen = new Set();
  return out.filter(c => {
    if (seen.has(c.url)) return false;
    seen.add(c.url);
    return true;
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Allow", "POST");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: "METHOD_NOT_ALLOWED" }));
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: "NO_GROQ_KEY" }));
    return;
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: "BAD_REQUEST" }));
    return;
  }

  const message = toStr(body?.message).trim();
  const mode = toStr(body?.mode) || 'bruce'; // 'bruce' | 'makaveli' | legacy 'compound'
  const requestedSystemPrompt = toStr(body?.systemPrompt).trim();
  const contextMessage = buildContextMessage(body?.context);
  
  if (!message) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: "BAD_REQUEST" }));
    return;
  }

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  try {
    let requestBody;
    
    if (mode === 'makaveli') {
      // Makaveli mode: function calling with llama-3.1-70b
      const messages = [
        { role: "system", content: requestedSystemPrompt || MAKAVELI_SYSTEM_PROMPT },
      ];
      if (contextMessage) messages.push(contextMessage);
      messages.push({ role: "user", content: message });
      requestBody = {
        model: "llama-3.3-70b-versatile",
        messages,
        tools: GLOBE_TOOLS,
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 4000,
      };
    } else {
      // Bruce / legacy compound mode
      const systemPrompt = requestedSystemPrompt || BRUCE_SYSTEM_PROMPT;
      const history = Array.isArray(body?.history) ? body.history : [];
      const maxTokens = clampInt(body?.max_tokens, 256, 4096, 1400);
      
      const messages = [];
      if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
      if (contextMessage) messages.push(contextMessage);
      for (const h of history.slice(-16)) {
        if (!isObj(h)) continue;
        const role = toStr(h.role);
        const content = toStr(h.content);
        if (!content) continue;
        if (role !== "user" && role !== "assistant" && role !== "system") continue;
        messages.push({ role, content });
      }
      messages.push({ role: "user", content: message });
      
      requestBody = {
        model: "groq/compound-mini",
        messages,
        temperature: 0.2,
        max_tokens: maxTokens,
      };
    }

    const r = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      const msg = isObj(data) && isObj(data.error) && typeof data.error.message === "string" 
        ? data.error.message 
        : "UPSTREAM";
      res.statusCode = 502;
      res.end(JSON.stringify({ ok: false, error: msg || "UPSTREAM" }));
      return;
    }

    const choice = isObj(data) && Array.isArray(data.choices) && isObj(data.choices[0]) 
      ? data.choices[0] 
      : null;
    const messageObj = isObj(choice?.message) ? choice.message : null;
    const content = typeof messageObj?.content === "string" ? messageObj.content : "";

    if (mode === 'makaveli') {
      const toolCalls = Array.isArray(messageObj?.tool_calls) ? messageObj.tool_calls : [];
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        ok: true, 
        content: content || "", 
        tool_calls: toolCalls,
        persona: 'makaveli',
      }));
    } else {
      const citations = extractCitations(isObj(data) ? data.executed_tools : undefined);
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, content: content || "", citations, persona: 'bruce' }));
    }
  } catch {
    res.statusCode = 502;
    res.end(JSON.stringify({ ok: false, error: "UPSTREAM" }));
  }
}
