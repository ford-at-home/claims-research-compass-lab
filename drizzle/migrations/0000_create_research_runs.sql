CREATE TABLE public.research_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  case_id text NOT NULL,
  mode text NOT NULL DEFAULT 'live',
  input jsonb NOT NULL,
  input_hash text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  provider_ids jsonb NOT NULL DEFAULT '{}'::jsonb,
  outbound_context jsonb,
  provider_output jsonb,
  result jsonb,
  trace jsonb NOT NULL DEFAULT '[]'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  captured_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.research_runs TO authenticated;
GRANT ALL ON public.research_runs TO service_role;
ALTER TABLE public.research_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own runs select" ON public.research_runs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own runs insert" ON public.research_runs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own runs update" ON public.research_runs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own runs delete" ON public.research_runs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX research_runs_user_case ON public.research_runs(user_id, case_id, created_at DESC);