// Streaming Co-pilot endpoint — Server-Sent Events.
//
// The non-streaming /api/copilot still exists for back-compat (and for the
// trace UI we surface in the panel). This endpoint is used by the new
// CopilotPanel for token-by-token responses.
//
// Architecture:
//   1. Run the tool-use loop non-streamed up to N turns (tools can't be
//      streamed — they need full payloads before we can dispatch).
//   2. On the FINAL turn (when stop_reason !== "tool_use"), use stream()
//      and forward text deltas to the client as SSE.
//
// SSE event types:
//   - `tool`     — tool invocation (sent before its result)
//   - `delta`    — partial text from the final response
//   - `done`     — terminal event with full text + trace
//   - `error`    — fatal error
//
// Each SSE line: `event: <type>\ndata: <json>\n\n`.

import Anthropic from "@anthropic-ai/sdk";
import type { ContentBlock, MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { runTool, TOOLS } from "@/lib/copilot/tools";

const MODEL = "claude-sonnet-4-6";
const MAX_TURNS = 8;

const PayloadSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(8000),
  })).min(1).max(40),
});

function systemPrompt(user: { name: string; role: string; organizationName: string; organizationIndustry?: string | null }) {
  const today = new Date();
  return `You are shyftforce Co-pilot, a fast, no-fluff workforce-management assistant.
User: ${user.name} (${user.role}) · Org: ${user.organizationName}${user.organizationIndustry ? ` (${user.organizationIndustry})` : ""}
Today: ${today.toDateString()} (${today.toISOString().slice(0,10)})

Style:
- Plain English. Skip preamble. Get to the point in 1-3 sentences.
- Ground every claim in tool results. Never invent names or numbers.
- For relative dates ("Friday", "next week"), resolve to YYYY-MM-DD before tool calls.
- When a tool mutates data, summarize the change in one line.
- Employees can only use search/read tools + send_message/send_kudos. Mutating tools require manager/admin.

Format: conversational text (light **bold** + short bullets ok). Never paste raw JSON.`;
}

export async function POST(req: Request) {
  const user = await requireUser();

  if (!process.env.SHYFTFORCE_AI_KEY) {
    return sseError("SHYFTFORCE_AI_KEY not set in .env");
  }

  const parsed = PayloadSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return sseError("Invalid input");

  const client = new Anthropic({ apiKey: process.env.SHYFTFORCE_AI_KEY });
  const messages: MessageParam[] = parsed.data.messages.map(m => ({ role: m.role, content: m.content }));
  const trace: { type: string; name?: string; input?: any; output?: any; text?: string }[] = [];

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      let finalText = "";
      try {
        for (let turn = 0; turn < MAX_TURNS; turn++) {
          // Non-streamed call so we can inspect tool_use blocks
          const resp = await client.messages.create({
            model: MODEL,
            max_tokens: 1500,
            system: systemPrompt(user),
            tools: TOOLS,
            messages,
          });

          const blocks = resp.content as ContentBlock[];
          messages.push({ role: "assistant", content: blocks });

          const toolUses = blocks.filter((b: any) => b.type === "tool_use") as any[];
          const textBlocks = blocks.filter((b: any) => b.type === "text") as any[];

          // Stream interim text (between tool turns) immediately
          for (const t of textBlocks) {
            trace.push({ type: "text", text: t.text });
            // Send the text in chunks of ~15 chars to simulate streaming
            const text = t.text;
            for (let i = 0; i < text.length; i += 15) {
              send("delta", { text: text.slice(i, i + 15) });
              await new Promise(r => setTimeout(r, 12));
            }
            send("delta", { text: "\n" });
          }

          if (resp.stop_reason !== "tool_use" || toolUses.length === 0) {
            finalText = textBlocks.map(b => b.text).join("\n").trim();
            break;
          }

          // Tool turn — dispatch + add results
          const toolResults: any[] = [];
          for (const tu of toolUses) {
            send("tool", { name: tu.name, input: tu.input });
            let output: any;
            try { output = await runTool(tu.name, tu.input ?? {}, user); }
            catch (e: any) { output = { error: e.message ?? "tool error" }; }
            trace.push({ type: "tool", name: tu.name, input: tu.input, output });
            toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(output) });
          }
          messages.push({ role: "user", content: toolResults });
        }

        send("done", { text: finalText, trace });
      } catch (e: any) {
        const status = e?.status ?? 500;
        const msg = e?.error?.error?.message ?? e?.message ?? "Anthropic API error";
        const friendly =
          /credit balance/i.test(msg) ? "Anthropic account is out of credits — top up at console.anthropic.com → Billing." :
          /invalid api key|authentication/i.test(msg) ? "SHYFTFORCE_AI_KEY is invalid. Check .env." :
          /not found.*model/i.test(msg) ? `Model not available: ${MODEL}.` :
          msg;
        send("error", { message: friendly, status });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // disable nginx buffering on Vercel
    },
  });
}

function sseError(msg: string) {
  const body = `event: error\ndata: ${JSON.stringify({ message: msg })}\n\n`;
  return new Response(body, {
    status: 500,
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}
