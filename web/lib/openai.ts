import OpenAI from "openai";
import { SYSTEM_PROMPT } from "./prompts";

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) _client = new OpenAI();
  return _client;
}

export type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

/** Send messages to the LLM (with SYSTEM_PROMPT prepended). Returns assistant text. */
export async function chat(messages: ChatMessage[]): Promise<string> {
  const model = process.env.OPENAI_MODEL || "gpt-4o";
  const full: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages,
  ];
  const resp = await client().chat.completions.create({
    model,
    messages: full,
    temperature: 0.3,
  });
  return resp.choices[0]?.message?.content ?? "";
}

/**
 * Find and parse the first balanced { ... } JSON object in the response.
 * Mirrors agent/decomposer.py:extract_project_json.
 */
export function extractProjectJson(text: string): unknown | null {
  let t = text.trim();

  const fence = t.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (fence) t = fence[1];

  const start = t.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < t.length; i++) {
    const c = t[i];
    if (inString) {
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        const candidate = t.slice(start, i + 1);
        try {
          return JSON.parse(candidate);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}
