-- ====================================================================
-- FynPad — Goals: Description field (Part 14, tasarım revizyonu)
-- Hedefe opsiyonel, kısa (<=200) bir açıklama eklenir. GoalCard'da name'in
-- altında, goal-edit formunda name'in altında gösterilir.
-- ====================================================================

alter table public.goals
  add column if not exists description text
    check (description is null or length(description) <= 200);
