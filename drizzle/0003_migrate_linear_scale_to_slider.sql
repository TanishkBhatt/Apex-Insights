-- Convert legacy linear-scale questions to sliders. Existing numeric answers
-- remain valid: the min/max bounds are preserved and the step is 1.
UPDATE "questions"
SET
  "type" = 'slider',
  "config" = "config" || '{"step": 1}'::jsonb
WHERE "type" = 'linear_scale';
