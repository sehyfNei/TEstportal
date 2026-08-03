insert into public.feature_flags (key, enabled, description)
values (
  'test_runner_beta',
  true,
  'Allows students to opt into the full-screen beta CBT test experience.'
)
on conflict (key) do update
set description = excluded.description;
