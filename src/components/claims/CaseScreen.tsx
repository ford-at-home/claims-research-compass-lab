import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Download, FileText, Play, RotateCcw, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { runFixture } from "@/lib/claims/fixtures";
import { inputHash } from "@/lib/claims/hash";
import { buildPublicContext } from "@/lib/claims/public-context";
import { FIXTURE_INPUTS, LIMITS } from "@/lib/claims/spec";
import { CASES, MODE_LABEL, type CaseId, type EvidenceFact, type Mode, type RunRecord } from "@/lib/claims/types";
import { loadFixtureRuns, loadReviews, saveFixtureRun, setReview, type Disposition, type Review } from "@/lib/claims/local-store";
import { download, runReviews, toReport } from "@/lib/claims/export";
import { listStoredRuns, resumeLiveRun, runWarRoomLive, startLiveRun, requestRentalException } from "@/lib/claims/research.functions";
import { rentalExceptionEligibility, rentalScenarioSchema } from "@/lib/claims/rental";
import { Chip, Mono, ORIGIN_LABEL, originTone, statusTone } from "./ui-bits";
import { cn } from "@/lib/utils";
import { WorkflowIntro } from "./WorkflowIntro";

const pretty = (v: unknown) => JSON.stringify(v, null, 2);

export function CaseScreen({ caseId }: { caseId: CaseId }) {
  const meta = CASES.find((c) => c.id === caseId)!;
  const { user, ready } = useAuth();
  const [text, setText] = useState(() => pretty(FIXTURE_INPUTS[caseId]));
  const [mode, setMode] = useState<Mode>("fixture");
  const [run, setRun] = useState<RunRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [history, setHistory] = useState<RunRecord[]>([]);
  const [stored, setStored] = useState<RunRecord[]>([]);
  const [fact, setFact] = useState<EvidenceFact | null>(null);
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [precise, setPrecise] = useState(false);
  const [currentHash, setCurrentHash] = useState("");
  const [localDeadlineHit, setLocalDeadlineHit] = useState(false);
  const cancelPoll = useRef(false);
  const [exceptionQuestion, setExceptionQuestion] = useState("");
  const [exceptionMessage, setExceptionMessage] = useState<string | null>(null);
  const exceptionFn = useServerFn(requestRentalException);
  const isRental = caseId === "UC03";

  const startFn = useServerFn(startLiveRun);
  const resumeFn = useServerFn(resumeLiveRun);
  const listFn = useServerFn(listStoredRuns);
  const warFn = useServerFn(runWarRoomLive);

  const parsed = useMemo(() => {
    try {
      return { ok: true as const, value: JSON.parse(text) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [text]);

  useEffect(() => {
    setHistory(loadFixtureRuns(caseId).filter((r) => caseId !== "UC03" || r.result.workflow === "supplier_integration_baseline"));
    setReviews(loadReviews());
    return () => {
      cancelPoll.current = true;
    };
  }, [caseId]);
  useEffect(() => {
    if (parsed.ok) inputHash(parsed.value).then(setCurrentHash);
  }, [parsed]);
  const refreshStored = async () => {
    if (!user) return setStored([]);
    try {
      setStored(await listFn({ data: { caseId } }));
    } catch {
      setStored([]);
    }
  };
  useEffect(() => {
    void refreshStored();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, caseId]);

  const outbound = parsed.ok ? buildPublicContext(caseId, parsed.value, new Date(), { precisePoint: precise }) : null;

  const poll = async (dbId: string, startedAt: number) => {
    cancelPoll.current = false;
    setLocalDeadlineHit(false);
    while (!cancelPoll.current) {
      await new Promise((r) => setTimeout(r, LIMITS.pollIntervalMs));
      setElapsed(Math.round((Date.now() - startedAt) / 1000));
      if (Date.now() - startedAt > LIMITS.localWaitMs) {
        setLocalDeadlineHit(true);
        setProgress("Local wait deadline reached. The remote task may still be running; provider ID preserved — use Resume.");
        return;
      }
      const r = await resumeFn({ data: { dbId } });
      setRun(r);
      if (r.status !== "running") return;
    }
  };

  const execute = async () => {
    if (!parsed.ok) return;
    setBusy(true);
    setFact(null);
    const t0 = Date.now();
    setElapsed(0);
    try {
      if (mode === "fixture") {
        setProgress("Loading fabricated storyboard (no provider calls)…");
        const r = runFixture(caseId, parsed.value, await inputHash(parsed.value));
        saveFixtureRun(r);
        setHistory(loadFixtureRuns(caseId).filter((r) => caseId !== "UC03" || r.result.workflow === "supplier_integration_baseline"));
        setRun(r);
      } else if (mode === "live") {
        if (!user) {
          setProgress(null);
          setRun(null);
          return;
        }
        setProgress(isRental ? "Checking supplier adapter…" : caseId === "UC05" ? "Connecting MCP servers and running tool calls…" : "Search → Extract → Task create…");
        const r = caseId === "UC05" ? await warFn({ data: { input: parsed.value } }) : await startFn({ data: { caseId, input: parsed.value, precisePoint: precise } });
        setRun(r);
        if (r.status === "running" && r.provider_ids["db_run_id"]) {
          setProgress("Task submitted; polling the existing run (never resubmitted)…");
          await poll(r.provider_ids["db_run_id"], t0);
        }
        await refreshStored();
      }
    } catch (e) {
      setRun(null);
      setProgress(`Live request failed: ${(e as Error).message}. No fixture data was substituted.`);
      setBusy(false);
      return;
    }
    setProgress(null);
    setBusy(false);
  };

  const resume = async () => {
    const id = run?.provider_ids["db_run_id"];
    if (!id) return;
    setBusy(true);
    setProgress("Resuming the existing provider run…");
    await poll(id, Date.now());
    setProgress(null);
    setBusy(false);
  };

  const replayable = stored.filter((r) => r.mode === "live" && r.status === "completed" && r.captured_at);
  const review = (f: EvidenceFact, d: Disposition) => run && setReviews({ ...setReview(run.run_id, f, d) });
  const rr = run ? runReviews(run, reviews) : {};
  const doneSteps = run?.steps.filter((s) => s.status !== "pending").length ?? 0;
  const shown = run && mode === "replay" ? { ...run, mode: "replay" as Mode, label: MODE_LABEL.replay } : run;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-xs text-primary">{caseId}</div>
          <h1 className="text-2xl font-semibold">{meta.title}</h1>
        </div>
        <ModeSelector mode={mode} onChange={(m) => { setMode(m); setRun(null); setProgress(null); }} />
      </div>

      <WorkflowIntro caseId={caseId} />

      <div className={cn("rounded-md border px-3 py-2 text-sm", mode === "fixture" ? "border-sim-foreground/30 bg-sim text-sim-foreground" : mode === "live" ? "bg-live text-live-foreground" : "bg-replay text-replay-foreground")}>
        <strong className="uppercase tracking-wide">{mode}</strong> — {MODE_LABEL[mode]}.{" "}
        {mode === "fixture" && "Every observation is fabricated; no provider calls are made."}
        {mode === "live" && (isRental ? "Supplier adapter unconfigured — no real contract or connection is supplied. No Parallel calls and no simulated pricing in Live." : "Real Parallel requests with the hypothetical claim context. Failures stay visible; no fixture substitution.")}
        {mode === "replay" && "Shows only genuine previously captured live runs with their original capture time."}
      </div>

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        {/* Inputs */}
        <section className="space-y-3 rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Scenario input <Chip tone="sim">Synthetic</Chip></h2>
            <Button size="sm" variant="ghost" onClick={() => setText(pretty(FIXTURE_INPUTS[caseId]))}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              Sample
            </Button>
          </div>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} className="h-72 font-mono text-[11.5px]" spellCheck={false} aria-label="Scenario input JSON" />
          {!parsed.ok && <p className="text-xs text-bad-foreground">Invalid JSON: {parsed.error}</p>}
          {caseId === "UC04" && (
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={precise} onCheckedChange={setPrecise} /> Send precise coordinates (default: ZIP and state only)
            </label>
          )}
          {!isRental && <details className="text-xs" open={caseId === "UC05"}>
            <summary className="cursor-pointer font-medium">Outbound public context preview</summary>
            {outbound?.ok ? (
              <>
                <Mono className="mt-2">{pretty(outbound.context)}</Mono>
                <p className="mt-1 text-muted-foreground">Kept local: {outbound.dropped.join("; ") || "none"}</p>
              </>
            ) : (
              <p className="mt-2 text-bad-foreground">{outbound?.reason ?? "Fix input JSON"} — live submission blocked.</p>
            )}
          </details>}
          {isRental && <div className="space-y-2 border-t pt-3 text-xs">
            <p className="font-semibold">Supplier integration baseline</p>
            <p className="text-muted-foreground">Pricing is the confirmed capability. Availability, reservation and extension fields are unverified. Sample supplier prices, insurer rules and repair timing are simulated.</p>
            {!rentalScenarioSchema.safeParse(parsed.ok ? parsed.value : null).success && <p className="text-bad-foreground">Invalid rental scenario contract.</p>}
          </div>}

          {mode === "replay" ? (
            <div className="space-y-2">
              {!user ? (
                <p className="text-xs text-muted-foreground"><Link to="/auth" className="text-primary underline">Sign in</Link> to see recorded live runs.</p>
              ) : replayable.length === 0 ? (
                <p className="rounded border border-dashed p-3 text-xs text-muted-foreground">No recorded live research for {caseId} yet. Replay never uses fixture data.</p>
              ) : (
                replayable.map((r) => (
                  <button key={r.run_id} onClick={() => setRun(r)} className="block w-full rounded border p-2 text-left text-xs hover:bg-accent">
                    <span className="font-mono">{r.run_id.slice(0, 22)}</span> · captured {new Date(r.captured_at!).toLocaleString()}
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {mode === "live" && ready && !user && (
                <p className="rounded border border-warn-foreground/30 bg-warn p-2 text-xs text-warn-foreground">
                  Live research requires an authenticated account. <Link to="/auth" className="underline">Sign in</Link>. Mode was not changed.
                </p>
              )}
              <Button className="w-full" onClick={execute} disabled={busy || !parsed.ok || (isRental && !rentalScenarioSchema.safeParse(parsed.ok ? parsed.value : null).success) || (mode === "live" && (!user || (!isRental && !outbound?.ok)))}>
                <Play className="mr-1.5 h-4 w-4" /> {isRental ? "Run supplier baseline" : "Run research"}
              </Button>
              {run && run.input_hash && currentHash && run.input_hash !== currentHash && (
                <p className="text-xs text-warn-foreground">Input changed since the displayed run (hash {run.input_hash.slice(0, 10)}). The run is retained; start a new run explicitly.</p>
              )}
            </div>
          )}
          {isRental && <div className="space-y-2 border-t pt-3">
            <h2 className="text-sm font-semibold">External exception research <Chip>Optional</Chip></h2>
            <p className="text-xs text-muted-foreground">No validated external gap has been identified. This is not part of ordinary rentals and cannot override supplier prices, coverage or reservations.</p>
            <Textarea aria-label="External exception question" value={exceptionQuestion} onChange={(e) => { setExceptionQuestion(e.target.value); setExceptionMessage(null); }} placeholder="Unanswered external question" className="min-h-20 text-xs" />
            <Button variant="outline" size="sm" disabled={!exceptionQuestion.trim() || busy || mode === "replay" || (mode === "live" && !user)} onClick={async () => {
              const action = "external_exception_research";
              try {
                const result = mode === "live" ? await exceptionFn({ data: { action, question: exceptionQuestion } }) : rentalExceptionEligibility(action, exceptionQuestion);
                setExceptionMessage(result.reason);
              } catch { setExceptionMessage("Exception eligibility check failed. No external research was started."); }
            }}><Play className="mr-1 h-3.5 w-3.5" /> External exception research</Button>
            {exceptionMessage && <p role="status" className="text-xs text-warn-foreground">{exceptionMessage}</p>}
          </div>}
        </section>

        {/* Results */}
        <section className="min-w-0 space-y-4">
          {(busy || progress) && (
            <div className="rounded-lg border bg-card p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>{progress ?? "Working…"}</span>
                <span className="font-mono text-xs text-muted-foreground">{elapsed}s</span>
              </div>
              <Progress value={run?.steps.length ? (doneSteps / run.steps.length) * 100 : busy ? 15 : 0} />
            </div>
          )}
          {!shown ? (
            <div className="rounded-lg border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
              {isRental ? "No supplier evidence yet." : <>Choose a mode and press <strong>Run research</strong>{mode === "replay" ? " — or pick a recording" : ""}.</>}
            </div>
          ) : (
            <RunView run={shown} reviews={rr} onFact={setFact} onResume={localDeadlineHit || (run?.status === "running" && !busy) ? resume : null} busy={busy} />
          )}

          <History
            items={[...history, ...stored].sort((a, b) => b.created_at.localeCompare(a.created_at))}
            onPick={(r) => {
              setMode(r.mode === "fixture" ? "fixture" : r.status === "completed" ? "replay" : "live");
              setRun(r);
            }}
          />
        </section>
      </div>

      <Sheet open={!!fact} onOpenChange={(o) => !o && setFact(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {fact && shown && (
            <>
              <SheetHeader>
                <SheetTitle className="font-mono text-base">{fact.fact_id}</SheetTitle>
                <SheetDescription>
                  {fact.attribute} · {fact.entity_id}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4 text-sm">
                <div className="flex flex-wrap gap-1.5">
                  <Chip tone={originTone(fact.origin)}>{ORIGIN_LABEL[fact.origin]}</Chip>
                  <Chip tone={statusTone(fact.status)}>{fact.status}</Chip>
                  <Chip>{fact.evidence_type}</Chip>
                </div>
                <dl className="grid grid-cols-[140px_1fr] gap-y-1 text-xs">
                  {(
                    [
                      ["Value", fact.number_decimal ?? fact.value_text ?? "null"],
                      ["Unit / currency", `${fact.unit ?? "null"} / ${fact.currency ?? "null"}`],
                      ["Effective at", fact.effective_at ?? "null"],
                      ["Published at", fact.published_at ?? "null"],
                      ["Source observed at", fact.source_observed_at ?? "null"],
                      ["Retrieved (app)", fact.retrieved_at],
                      ["Basis paths", fact.provider_basis_paths.join(", ") || "—"],
                      ["Vendor confidence", fact.vendor_confidence ?? "—"],
                      ["Formula", fact.formula ?? "—"],
                      ["Input facts", fact.input_fact_ids.join(", ") || "—"],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="font-mono break-all">{v}</dd>
                    </div>
                  ))}
                </dl>
                {fact.qualifiers.length > 0 && <div className="text-xs"><span className="text-muted-foreground">Qualifiers: </span>{fact.qualifiers.join(" · ")}</div>}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground">Exact source excerpts</h3>
                  {fact.citations.length === 0 && (
                    <p className="text-xs text-warn-foreground">
                      {fact.origin === "calculation" ? "Local calculation — see formula and input facts above." : "No citation — non-actionable."}
                    </p>
                  )}
                  {fact.citations.map((c, i) => (
                    <div key={i} className="rounded border p-2">
                      {c.url ? (
                        <a href={c.url} target="_blank" rel="noreferrer" className="break-all font-mono text-xs text-primary underline">{c.url}</a>
                      ) : (
                        <span className="font-mono text-xs text-muted-foreground">{c.source_ref} (no public URL)</span>
                      )}
                      <blockquote className="mt-1 border-l-2 border-primary/40 pl-2 text-xs">{c.excerpt}</blockquote>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground">Review (stored locally)</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => review(fact, "accepted")}>Accept evidence</Button>
                    <Button size="sm" variant="outline" onClick={() => review(fact, "rejected")}>Reject evidence</Button>
                    <Button size="sm" variant="outline" onClick={() => review(fact, "more_research")}>Request research</Button>
                  </div>
                  {rr[fact.fact_id] && <p className="text-xs text-muted-foreground">Current: {rr[fact.fact_id]!.disposition} at {rr[fact.fact_id]!.at} ({rr[fact.fact_id]!.evidence_version})</p>}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ModeSelector({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div role="radiogroup" aria-label="Data mode" className="inline-flex rounded-md border bg-card p-0.5">
      {(["fixture", "live", "replay"] as Mode[]).map((m) => (
        <button key={m} role="radio" aria-checked={mode === m} onClick={() => onChange(m)} className={cn("rounded px-3 py-1.5 text-sm capitalize transition-colors", mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
          {m}
        </button>
      ))}
    </div>
  );
}

function RunView({ run, reviews, onFact, onResume, busy }: { run: RunRecord; reviews: Record<string, Review>; onFact: (f: EvidenceFact) => void; onResume: (() => void) | null; busy: boolean }) {
  const isSim = run.mode === "fixture";
  const calcs = run.facts.filter((f) => f.origin === "calculation");
  const exportJson = () => download(`${run.case_id}-${run.run_id}.json`, JSON.stringify({ run, reviews }, null, 2), "application/json");
  const exportMd = () => download(`${run.case_id}-${run.run_id}.md`, toReport(run, reviews), "text/markdown");
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={isSim ? "sim" : run.mode === "replay" ? "replay" : "live"}>{isSim ? "SIMULATED" : run.mode === "replay" ? `RECORDED ${run.captured_at ? new Date(run.captured_at).toLocaleString() : ""}` : "LIVE"}</Chip>
          <Chip tone={statusTone(run.status)}>{run.status}</Chip>
          <span className="font-mono text-[11px] text-muted-foreground">{run.run_id} · input {run.input_hash.slice(0, 12)}</span>
          <div className="ml-auto flex gap-1">
            {onResume && (
              <Button size="sm" variant="outline" onClick={onResume} disabled={busy}>
                <RefreshCw className="mr-1 h-3.5 w-3.5" /> Resume
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={exportJson}><Download className="mr-1 h-3.5 w-3.5" />JSON</Button>
            <Button size="sm" variant="ghost" onClick={exportMd}><FileText className="mr-1 h-3.5 w-3.5" />Report</Button>
          </div>
        </div>
        {run.error && <p className="mt-2 rounded border border-bad-foreground/30 bg-bad p-2 text-sm text-bad-foreground">{run.error}</p>}
        {run.summary && <p className="mt-2 text-sm">{run.summary}</p>}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {run.steps.map((s) => (
            <Chip key={s.name} tone={s.status === "done" ? "ok" : s.status === "error" ? "bad" : "muted"}>{s.name}</Chip>
          ))}
        </div>
        <div className="mt-2 font-mono text-[11px] text-muted-foreground">
          calls — search {run.calls.search}/{LIMITS.maxSearchRequests} · extract urls {run.calls.extract_urls}/{LIMITS.maxExtractUrls} · task {run.calls.task}/{LIMITS.maxTaskCreates} · mcp tools {run.calls.mcp}/{LIMITS.maxMcpToolCalls}
          {Object.entries(run.provider_ids).map(([k, v]) => ` · ${k}: ${v}`)}
        </div>
      </div>

      {run.case_id === "UC05" && <WarRoom run={run} onFact={onFact} />}

      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-2 text-sm font-semibold">Findings ({run.facts.length})</div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fact</TableHead>
                <TableHead>Attribute</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Review</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {run.facts.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">No findings. Missing evidence stays null.</TableCell></TableRow>
              )}
              {run.facts.map((f) => (
                <TableRow key={f.fact_id} className="cursor-pointer" onClick={() => onFact(f)}>
                  <TableCell className="font-mono text-[11px]">{f.fact_id}</TableCell>
                  <TableCell className="text-xs">{f.attribute}<div className="text-[11px] text-muted-foreground">{f.entity_id}</div></TableCell>
                  <TableCell className="text-right font-mono text-xs">{f.number_decimal !== null ? `${f.number_decimal} ${f.unit ?? ""}` : (f.value_text ?? <span className="text-muted-foreground">null</span>)}</TableCell>
                  <TableCell><Chip>{f.evidence_type}</Chip></TableCell>
                  <TableCell><Chip tone={originTone(f.origin)}>{ORIGIN_LABEL[f.origin]}</Chip></TableCell>
                  <TableCell><Chip tone={statusTone(f.status)}>{f.status}</Chip></TableCell>
                  <TableCell className="text-xs">{reviews[f.fact_id]?.disposition ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Tabs defaultValue="sources" className="rounded-lg border bg-card p-3">
        <TabsList className="flex-wrap">
          <TabsTrigger value="sources">Sources & coverage</TabsTrigger>
          <TabsTrigger value="calc">Calculations</TabsTrigger>
          <TabsTrigger value="result">Result</TabsTrigger>
          <TabsTrigger value="trace">Redacted trace</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
        </TabsList>
        <TabsContent value="sources" className="space-y-3 text-sm">
          <ul className="space-y-1">{run.coverage.map((c, i) => <li key={i} className="flex gap-2"><Chip tone={statusTone(c.status)}>{c.status}</Chip><span>{c.category}</span><span className="text-muted-foreground">{c.notes}</span></li>)}</ul>
          <div>
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">Gaps</h3>
            <ul className="list-disc pl-5">{run.gaps.length ? run.gaps.map((g, i) => <li key={i}>{g}</li>) : <li className="text-muted-foreground">None reported</li>}</ul>
          </div>
        </TabsContent>
        <TabsContent value="calc" className="space-y-2">
          {calcs.length === 0 && <p className="text-sm text-muted-foreground">No calculations: required components missing or not applicable.</p>}
          {calcs.map((c) => (
            <div key={c.fact_id} className="rounded border p-2 font-mono text-xs">
              <div><span className="text-primary">{c.attribute}</span> = {c.number_decimal ?? "null"} {c.unit}</div>
              <div className="text-muted-foreground">{c.formula} · inputs [{c.input_fact_ids.join(", ")}] · Decimal, 2 dp half-up</div>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="result"><Mono>{pretty(run.result)}</Mono></TabsContent>
        <TabsContent value="trace" className="space-y-2">
          {run.trace.map((t, i) => (
            <details key={i} className="rounded border p-2 text-xs">
              <summary className="cursor-pointer"><Chip tone={statusTone(t.status)}>{t.status}</Chip> <span className="font-mono">{t.op}</span> <Chip>{t.transport}</Chip> <span className="text-muted-foreground">{t.note}</span></summary>
              <Mono className="mt-2">{pretty({ at: t.at, request: t.request, response: t.response })}</Mono>
            </details>
          ))}
        </TabsContent>
        <TabsContent value="review" className="text-sm">
          {Object.keys(reviews).length === 0 ? <p className="text-muted-foreground">Open a finding to accept, reject or request further research. Dispositions are stored in this browser.</p> : (
            <ul className="space-y-1 font-mono text-xs">{Object.entries(reviews).map(([k, v]) => <li key={k}>{k}: {v.disposition} @ {v.at} ({v.evidence_version})</li>)}</ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function WarRoom({ run, onFact }: { run: RunRecord; onFact: (f: EvidenceFact) => void }) {
  const r: any = run.result;
  const b = r.brief ?? {};
  const Section = ({ title, items }: { title: string; items: any[] }) => (
    <div>
      <h3 className="text-xs font-semibold uppercase text-muted-foreground">{title}</h3>
      <ul className="list-disc pl-5 text-sm">
        {(items ?? []).length === 0 && <li className="text-muted-foreground">None</li>}
        {(items ?? []).map((x: any, i: number) => (
          <li key={i}>
            {typeof x === "string" ? x : x.text}{" "}
            {(x.fact_ids ?? []).map((id: string) => {
              const f = run.facts.find((y) => y.fact_id === id);
              return f ? <button key={id} className="font-mono text-xs text-primary underline" onClick={() => onFact(f)}>[{id}]</button> : null;
            })}
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold">MCP connections</h2>
        {Object.entries(r.mcp_connections ?? {}).map(([k, v]) => (
          <div key={k} className="flex items-center justify-between text-sm"><span className="font-mono">{k}</span><Chip tone={statusTone(String(v))}>{String(v)}</Chip></div>
        ))}
        <div className="flex items-center justify-between text-sm"><span>Private canary in outbound requests</span><Chip tone={r.private_canary_outbound ? "bad" : "ok"}>{r.private_canary_outbound ? "PRESENT" : "absent"}</Chip></div>
        <div>
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">Internal context <Chip tone="warn">Mock enterprise</Chip></h3>
          <Mono className="mt-1">{pretty(r.internal_context ?? (run.input as any)?.input?.internal_context ?? null)}</Mono>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">Public question sent</h3>
          <Mono className="mt-1">{pretty(r.outbound_preview)}</Mono>
        </div>
      </div>
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold">Cited brief {run.mode === "fixture" && <Chip tone="sim">Simulated</Chip>}</h2>
        {b.cited_narrative && <Mono>{b.cited_narrative}</Mono>}
        <Section title="Supported facts" items={b.supported_facts} />
        <Section title="Hypotheses" items={b.hypotheses} />
        <Section title="Contradictions" items={b.contradictions} />
        <Section title="Open questions" items={b.open_questions} />
        <Section title="Reviewer next actions" items={b.next_actions} />
        <p className="text-xs text-muted-foreground">Delay causation: <strong>{r.delay_causation}</strong></p>
      </div>
    </div>
  );
}

function History({ items, onPick }: { items: RunRecord[]; onPick: (r: RunRecord) => void }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-4 py-2 text-sm font-semibold">Run history</div>
      {items.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">No runs yet.</p>
      ) : (
        <ul className="divide-y">
          {items.slice(0, 15).map((r) => (
            <li key={r.run_id}>
              <button className="flex w-full flex-wrap items-center gap-2 px-4 py-2 text-left text-xs hover:bg-accent" onClick={() => onPick(r)}>
                <Chip tone={r.mode === "fixture" ? "sim" : "live"}>{r.mode === "fixture" ? "Simulated" : "Live"}</Chip>
                <Chip tone={statusTone(r.status)}>{r.status}</Chip>
                <span className="font-mono">{r.run_id.slice(0, 26)}</span>
                <span className="ml-auto text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
