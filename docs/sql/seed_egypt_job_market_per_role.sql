-- Egypt salary / demand signals per job role (EGP in database — NOT converted from USD).
-- Edit bands and sources to match your research (Wuzzuf, LinkedIn, HR surveys, etc.).
-- Run after job_roles rows exist (including slugs from the pipeline).

-- Pipeline roles (replace min/max with your market research)
INSERT INTO public.job_market_data (
  job_role_id,
  country,
  region,
  salary_min,
  salary_max,
  salary_currency,
  salary_period,
  open_positions_count,
  remote_percentage,
  contract_percentage,
  data_source,
  sample_size,
  data_date,
  confidence_score
)
SELECT jr.id,
  'EG',
  'North Africa',
  240000,
  600000,
  'EGP',
  'yearly',
  NULL,
  30,
  25,
  'Replace: Wuzzuf + LinkedIn Egypt scrape / survey',
  0,
  CURRENT_DATE,
  0.55
FROM public.job_roles jr
WHERE jr.slug = 'erp-functional-consultant'
  AND NOT EXISTS (
    SELECT 1 FROM public.job_market_data j
    WHERE j.job_role_id = jr.id AND j.country = 'EG'
  );

INSERT INTO public.job_market_data (
  job_role_id, country, region,
  salary_min, salary_max, salary_currency, salary_period,
  open_positions_count, remote_percentage, contract_percentage,
  data_source, sample_size, data_date, confidence_score
)
SELECT jr.id, 'EG', 'North Africa',
  300000, 720000, 'EGP', 'yearly',
  NULL, 35, 20,
  'Replace: market research', 0, CURRENT_DATE, 0.55
FROM public.job_roles jr
WHERE jr.slug = 'erp-technical-consultant'
  AND NOT EXISTS (SELECT 1 FROM public.job_market_data j WHERE j.job_role_id = jr.id AND j.country = 'EG');

INSERT INTO public.job_market_data (
  job_role_id, country, region,
  salary_min, salary_max, salary_currency, salary_period,
  open_positions_count, remote_percentage, contract_percentage,
  data_source, sample_size, data_date, confidence_score
)
SELECT jr.id, 'EG', 'North Africa',
  350000, 900000, 'EGP', 'yearly',
  NULL, 25, 15,
  'Replace: market research', 0, CURRENT_DATE, 0.55
FROM public.job_roles jr
WHERE jr.slug = 'sap-fico-consultant'
  AND NOT EXISTS (SELECT 1 FROM public.job_market_data j WHERE j.job_role_id = jr.id AND j.country = 'EG');

INSERT INTO public.job_market_data (
  job_role_id, country, region,
  salary_min, salary_max, salary_currency, salary_period,
  open_positions_count, remote_percentage, contract_percentage,
  data_source, sample_size, data_date, confidence_score
)
SELECT jr.id, 'EG', 'North Africa',
  280000, 780000, 'EGP', 'yearly',
  NULL, 28, 22,
  'Replace: market research', 0, CURRENT_DATE, 0.55
FROM public.job_roles jr
WHERE jr.slug = 'oracle-erp-consultant'
  AND NOT EXISTS (SELECT 1 FROM public.job_market_data j WHERE j.job_role_id = jr.id AND j.country = 'EG');

INSERT INTO public.job_market_data (
  job_role_id, country, region,
  salary_min, salary_max, salary_currency, salary_period,
  open_positions_count, remote_percentage, contract_percentage,
  data_source, sample_size, data_date, confidence_score
)
SELECT jr.id, 'EG', 'North Africa',
  260000, 700000, 'EGP', 'yearly',
  NULL, 30, 25,
  'Replace: market research', 0, CURRENT_DATE, 0.55
FROM public.job_roles jr
WHERE jr.slug = 'microsoft-dynamics-consultant'
  AND NOT EXISTS (SELECT 1 FROM public.job_market_data j WHERE j.job_role_id = jr.id AND j.country = 'EG');

INSERT INTO public.job_market_data (
  job_role_id, country, region,
  salary_min, salary_max, salary_currency, salary_period,
  open_positions_count, remote_percentage, contract_percentage,
  data_source, sample_size, data_date, confidence_score
)
SELECT jr.id, 'EG', 'North Africa',
  180000, 480000, 'EGP', 'yearly',
  NULL, 35, 30,
  'Replace: market research', 0, CURRENT_DATE, 0.55
FROM public.job_roles jr
WHERE jr.slug = 'odoo-consultant'
  AND NOT EXISTS (SELECT 1 FROM public.job_market_data j WHERE j.job_role_id = jr.id AND j.country = 'EG');

-- Example legacy titled role (Oracle analyst track)
INSERT INTO public.job_market_data (
  job_role_id, country, region,
  salary_min, salary_max, salary_currency, salary_period,
  open_positions_count, remote_percentage, contract_percentage,
  data_source, sample_size, data_date, confidence_score
)
SELECT jr.id, 'EG', 'North Africa',
  120000, 300000, 'EGP', 'yearly',
  NULL, 40, 25,
  'Replace: junior band Egypt', 0, CURRENT_DATE, 0.5
FROM public.job_roles jr
WHERE jr.title = 'Junior Financial Analyst (Oracle)'
  AND NOT EXISTS (SELECT 1 FROM public.job_market_data j WHERE j.job_role_id = jr.id AND j.country = 'EG');
