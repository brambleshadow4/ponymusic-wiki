-- Get all tracks in an album which starts with Ponies at Dawn but doesn't have the P@D tag --

SELECT DISTINCT a.id FROM tracks AS a LEFT JOIN track_tags AS b ON a.id = b.track_id WHERE a.id IN (
	SELECT a.id FROM tracks AS a LEFT JOIN track_tags AS b ON a.id = b.track_id WHERE b.property = 'album' AND b.value LIKE 'Ponies at Dawn%'
) AND 
a.id NOT IN (
	SELECT a.id FROM tracks AS a LEFT JOIN track_tags AS b ON a.id = b.track_id WHERE b.property = 'tag' AND b.value = 'P@D'
)

-- Get all tracks on an album -- 

SELECT DISTINCT a.id FROM tracks AS a LEFT JOIN track_tags AS b ON a.id = b.track_id WHERE a.id IN (
	SELECT a.id FROM tracks AS a LEFT JOIN track_tags AS b ON a.id = b.track_id WHERE b.property = 'album' AND b.value = 'Moonlight Vapours'
)

