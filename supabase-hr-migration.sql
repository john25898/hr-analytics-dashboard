-- ============================================================================
-- HR Dashboard: Employee Changes backend (hr_employee_changes)
-- Project: aarqmoujwdhpfdlylyzp (same shared Supabase as the CMaT app)
--
-- Run this in the Supabase SQL Editor ONCE. It is safe to re-run (IF NOT EXISTS).
--
-- What it does: the HR dashboard's modifications (new workers added via
-- "Add New Worker", contract extensions, employee edits, departures,
-- disabilities and transfers) are stored here so they survive page reloads
-- and are consistent across browsers/devices — the same pattern already used
-- for leave_requests / timesheets / employees.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.hr_employee_changes (
  id TEXT PRIMARY KEY,          -- `${change_type}:${ref_id}`
  change_type TEXT NOT NULL,    -- new_worker | employee_edit | disability | transfer
  ref_id TEXT,                  -- employee name or record id
  data JSONB,                   -- full record (both apps keep their own shape)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_employee_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for anon" ON public.hr_employee_changes
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_hr_employee_changes_type ON public.hr_employee_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_hr_employee_changes_ref ON public.hr_employee_changes(ref_id);
CREATE INDEX IF NOT EXISTS idx_hr_employee_changes_updated ON public.hr_employee_changes(updated_at);
