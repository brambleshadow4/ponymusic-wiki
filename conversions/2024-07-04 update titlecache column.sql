UPDATE tracks
SET titlecache=SUBSTRING(
	'"' || title ||'" by ' || 
	(SELECT COALESCE(string_agg(value, ', '), '') FROM track_tags WHERE track_id=id AND (property='artist' OR property='original artist'))
	FROM 1 for 500
)