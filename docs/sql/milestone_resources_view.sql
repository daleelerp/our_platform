-- Convenience view used by admin UI to show milestone resources with titles and URLs
CREATE OR REPLACE VIEW milestone_resources_view AS
SELECT
  mr.id,
  mr.milestone_id,
  mr.resource_id,
  lr.title AS resource_title,
  lr.title_ar AS resource_title_ar,
  lr.description,
  lr.description_ar,
  lr.url,
  lr.resource_type,
  lr.difficulty_level,
  mr.resource_order,
  mr.is_primary,
  mr.is_required,
  mr.created_at
FROM milestone_resources mr
JOIN learning_resources lr ON lr.id = mr.resource_id;




