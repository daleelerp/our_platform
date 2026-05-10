## Student Feedback MVP Rollout

### 1) Start with a subset of users

Set these environment variables:

- `FEEDBACK_ROLLOUT_PERCENT=20` (or lower for safer start)
- `FEEDBACK_SNOOZE_DAYS=5`

Rollout bucketing is deterministic by `user_id`, so users remain consistently in/out of the experiment.

### 2) Monitor early metrics

Use Admin -> Analytics page (backed by `/api/admin/feedback-report`) to monitor:

- Prompt volume (`total_requests`)
- Submission count (`submitted_requests`)
- Response rate (`response_rate`)
- Average rating by plan
- Suggestions feed

### 3) Expand rollout

Increase `FEEDBACK_ROLLOUT_PERCENT` gradually after metrics are healthy:

- 20% -> 50% -> 100%

Recommended check before each increase:

- No API/server errors in feedback routes
- Response rate acceptable for current cohort
- Suggestions quality is actionable for product/support

### 4) Full launch

Set `FEEDBACK_ROLLOUT_PERCENT=100` and continue tracking trend lines in Admin Analytics.
