import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { auditReasoning, type Audit } from "@/lib/audit.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cognita — Audit reasoning, not answers" },
      { name: "description", content: "AI reasoning auditor for educators and research reviewers. Map thinking, evidence and synthesis with human-in-the-loop control." },
      { property: "og:title", content: "Cognita — Audit reasoning, not answers" },
      { property: "og:description", content: "AI reasoning auditor for educators and reviewers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const SAMPLE = `I think remote work increases productivity. My first assumption was that fewer commutes means more time, but that alone doesn't prove output rises. A 2015 Stanford study of a Chinese call centre found a 13% performance increase for home workers, although this was one firm and self-selected staff, so it may not generalize. On the other hand, Microsoft's 2021 data showed collaboration networks became more siloed. Combining both, I'd argue remote work raises individual task productivity but may reduce cross-team innovation. To test this I would compare patent output across hybrid vs office firms. I'm unsure whether my conclusion holds for creative industries.`;

const STRENGTH: Record<string, string> = { strong: "bg-primary", weak: "bg-accent", unsupported: "bg-destructive" };

function Index() {
  const run = useServerFn(auditReasoning);
  const [text, setText] = useState("");
  const [ctx, setCtx] = useState("");
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [overrides, setOverrides] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState("");
  const [signed, setSigned] = useState(false);

  async function go() {
    setLoading(true); setErr(""); setAudit(null); setOverrides({}); setSigned(false);
    try { setAudit(await run({ data: { text, context: ctx } })); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }

  const final = audit?.dimensions.map((d, i) => overrides[i] ?? d.score) ?? [];
  const depth = final.length ? (final.reduce((a, b) => a + b, 0) / (final.length * 5)) * 100 : 0;

  return (
    <main className="min-h-screen grain">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="font-display text-2xl">Cognita<span className="text-primary">.</span></div>
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Reasoning audit · v0.1</span>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-10 pt-6">
        <h1 className="font-display text-5xl leading-[1.05] md:text-7xl">
          Audit the <em className="text-primary">thinking</em>,<br />not the answer.
        </h1>
        <p className="mt-5 max-w-xl text-muted-foreground">
          Paste a submission. Cognita maps the reasoning chain, scores six cognitive dimensions with quoted evidence, and hands the final judgement back to you.
        </p>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-20 lg:grid-cols-[1fr_1.2fr]">
        <div className="panel space-y-4 self-start lg:sticky lg:top-6">
          <input className="field" placeholder="Assignment context (optional)" value={ctx} onChange={(e) => setCtx(e.target.value)} />
          <textarea className="field h-72 resize-none font-mono text-sm" placeholder="Paste student essay, research rationale, or reasoning log…" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn-primary" disabled={loading || text.length < 80} onClick={go}>{loading ? "Auditing…" : "Run reasoning audit →"}</button>
            <button className="btn-ghost" onClick={() => setText(SAMPLE)}>Load sample</button>
          </div>
          <p className="font-mono text-[11px] text-muted-foreground">PII (emails, phones, IDs) is redacted before AI processing. Nothing is stored.</p>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>

        <div className="space-y-6">
          {!audit && !loading && (
            <div className="panel flex h-full min-h-72 items-center justify-center text-center text-muted-foreground">
              <p className="font-display text-2xl">Your audit appears here.</p>
            </div>
          )}
          {loading && <div className="panel min-h-72 animate-pulse" />}
          {audit && (
            <>
              <div className="panel">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="label">Cognitive depth</div>
                    <div className="font-display text-6xl">{Math.round(depth)}<span className="text-2xl text-muted-foreground">/100</span></div>
                  </div>
                  <div className="text-right font-mono text-xs text-muted-foreground">
                    AI confidence {Math.round((audit.confidence ?? 0) * 100)}%<br />{audit.redactions} PII redacted
                  </div>
                </div>
                <p className="mt-4">{audit.summary}</p>
              </div>

              <div className="panel">
                <div className="label mb-4">Reasoning chain</div>
                <ol className="space-y-3 border-l border-border pl-5">
                  {audit.reasoning_chain?.map((s, i) => (
                    <li key={i} className="relative">
                      <span className={`absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full ${STRENGTH[s.strength] ?? "bg-muted"}`} />
                      <span className="font-mono text-[11px] uppercase text-muted-foreground">{s.type} · {s.strength}</span>
                      <p className="text-sm">{s.step}</p>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="panel">
                <div className="label mb-4">Dimensions — adjust any score (human override)</div>
                <div className="space-y-5">
                  {audit.dimensions?.map((d, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{d.name}</span>
                        <span className="font-mono text-sm">
                          {overrides[i] !== undefined && <s className="mr-2 text-muted-foreground">{d.score}</s>}
                          {final[i]}/5
                        </span>
                      </div>
                      <input type="range" min={0} max={5} value={final[i]} onChange={(e) => setOverrides({ ...overrides, [i]: +e.target.value })} className="mt-2 w-full accent-primary" />
                      <blockquote className="mt-1 border-l-2 border-primary pl-3 text-sm italic text-muted-foreground">“{d.evidence}”</blockquote>
                      <p className="mt-1 text-sm">{d.note}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="panel">
                  <div className="label mb-3">Gaps detected</div>
                  <ul className="list-disc space-y-2 pl-4 text-sm">{audit.gaps?.map((g, i) => <li key={i}>{g}</li>)}</ul>
                </div>
                <div className="panel">
                  <div className="label mb-3">Viva questions</div>
                  <ul className="list-decimal space-y-2 pl-4 text-sm">{audit.questions_for_author?.map((g, i) => <li key={i}>{g}</li>)}</ul>
                </div>
              </div>

              <div className="panel space-y-3">
                <div className="label">Reviewer sign-off</div>
                <textarea className="field h-24 text-sm" placeholder="Your judgement and rationale (required)…" value={notes} onChange={(e) => setNotes(e.target.value)} />
                <button className="btn-primary" disabled={notes.trim().length < 10 || signed} onClick={() => setSigned(true)}>
                  {signed ? "✓ Signed by human reviewer" : "Approve & sign audit"}
                </button>
                <p className="font-mono text-[11px] text-muted-foreground">AI output is advisory. No result is final without reviewer sign-off.</p>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
