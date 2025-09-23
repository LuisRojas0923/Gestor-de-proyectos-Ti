SELECT 
  al.id,
  al.development_id,
  al.stage_id,
  ds.stage_code,
  ds.stage_name,
  dp.phase_name,
  al.activity_type,
  al.status,
  al.actor_type,
  al.start_date,
  al.end_date,
  al.next_follow_up_at,
  al.notes,
  al.dynamic_payload,
  al.created_by,
  al.created_at
FROM development_activity_log al
LEFT JOIN development_stages ds ON al.stage_id = ds.id
LEFT JOIN development_phases dp ON ds.phase_id = dp.id
ORDER BY al.created_at DESC;


--@block
-