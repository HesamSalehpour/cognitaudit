import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const SYSTEM_PROMPT = `You are Cognita, a reasoning auditor that assists human reviewers (educators, research reviewers).
You DO NOT grade the final answer or give a pass/fail. You audit HOW the author thought.
Rules:
- Evaluate only the text provided. Never infer identity, gender, ethnicity, nationality, or native language.
- Do not penalize grammar, dialect, or writing style; judge reasoning substance only.
- Every score must cite a verbatim quote from the text as evidence. If no evidence exists, say so and lower confidence.
- Be calibrated: state uncertainty. You are advisory; the human reviewer makes the final judgement.
Return ONLY JSON:
{"summary":string,
 "dimensions":[{"name":"Problem Framing"|"Evidence Use"|"Synthesis"|"Counter-argument"|"Methodology"|"Metacognition","score":0-5,"evidence":string,"note":string}],
 "reasoning_chain":[{"step":string,"type":"claim"|"evidence"|"inference"|"assumption"|"conclusion","strength":"strong"|"weak"|"unsupported"}],
 "gaps":[string],
 "questions_for_author":[string],
 "confidence":0-1}`;

const PII = [
  [/[\w.+-]+@[\w-]+\.[\w.]+/g, "[EMAIL]"],
  [/\+?\d[\d\s().-]{7,}\d/g, "[PHONE]"],
  [/\b(student|id|matric)[\s#:]*\d{4,}\b/gi, "[ID]"],
] as const;

export function redact(text: string) {
  let t = text;
  let count = 0;
  for (const [re, tag] of PII) t = t.replace(re, () => (count++, tag));
  return { text: t, count };
}

export const auditReasoning = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ text: z.string().min(80).max(12000), context: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { text, count } = redact(data.text);
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Lovable-API-Key": process.env["LOVABLE_API_KEY"] ?? "", "X-Lovable-AIG-SDK": "fetch", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        text: { format: { type: "json_object" } },
        instructions: SYSTEM_PROMPT,
        input: `Return JSON. Assignment context: ${data.context || "n/a"}\n\nSubmission:\n"""${text}"""`,
      }),
    });
    if (res.status === 429) throw new Error("Rate limited, please retry shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    if (!res.ok || !res.body) throw new Error("AI service error " + res.status);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", raw = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const l of lines) {
        if (!l.startsWith("data:")) continue;
        try {
          const ev = JSON.parse(l.slice(5));
          if (ev.type === "response.output_text.delta") raw += ev.delta;
        } catch { /* ignore */ }
      }
    }
    const parsed = JSON.parse(raw.replace(/^```json|```$/g, "").trim());
    return { ...parsed, redactions: count } as Audit;
  });

export type Audit = {
  summary: string;
  dimensions: { name: string; score: number; evidence: string; note: string }[];
  reasoning_chain: { step: string; type: string; strength: string }[];
  gaps: string[];
  questions_for_author: string[];
  confidence: number;
  redactions: number;
};
