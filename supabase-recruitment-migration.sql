-- ============================================================================
-- HR Dashboard: Recruitment pipeline backend (hr_requisitions)
-- Project: aarqmoujwdhpfdlylyzp (same shared Supabase as the CMaT app)
--
-- Run this in the Supabase SQL Editor ONCE. It is safe to re-run (IF NOT EXISTS).
--
-- Optional: the Recruitment page works entirely from localStorage without it.
-- Creating this table simply makes requisitions shared across browsers/devices
-- (the same pattern used by hr_employee_changes / leave_requests).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.hr_requisitions (
  id TEXT PRIMARY KEY,          -- REQ-001
  data JSONB,                   -- full requisition record
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_requisitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for anon" ON public.hr_requisitions
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_hr_requisitions_updated ON public.hr_requisitions(updated_at);
