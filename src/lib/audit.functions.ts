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
  .inputValidator((d: unknown) =>
    z.object({ text: z.string().min(80).max(12000), context: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { text, count } = redact(data.text);
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Assignment context: ${data.context || "n/a"}\n\nSubmission:\n"""${text}"""` },
        ],
      }),
    });
    if (res.status === 429) throw new Error("Rate limited, please retry shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    if (!res.ok) throw new Error("AI service error");
    const j = await res.json();
    const raw = j.choices?.[0]?.message?.content ?? "{}";
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
