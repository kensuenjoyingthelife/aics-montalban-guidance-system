-- One-time fix: open "Parents to call" tasks of cases that are already closed (Resolved) are marked done.
-- Non-destructive (no delete). New closes do this automatically in updateCaseFlowInDb.
update follow_up_tasks t
set resolved = true, last_contact_summary_en = 'Case closed', last_contact_summary_tl = 'Sarado na ang kaso'
from discipline_cases c
where t.case_code = c.case_code and c.status = 'Resolved' and t.resolved = false
returning t.task_code, t.case_code;
