ALTER TABLE tracks ADD COLUMN titlecache VARCHAR(511);

UPDATE tracks
SET titlecache = substring(title || ' - ' || (
 	SELECT COALESCE(string_agg(value, ', '), '') from track_tags WHERE track_id=id and property='artist'
 ) from 0 for 512)
WHERE titlecache IS NULL;

ALTER TABLE tracks ALTER COLUMN titlecache SET NOT NULL;