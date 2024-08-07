CREATE TABLE IF NOT EXISTS tracks (
	id SERIAL PRIMARY KEY,
	title VARCHAR(255) NOT NULL,
	release_date DATE NOT NULL,
	locked BOOLEAN NOT NULL,
	ogcache JSONB NOT NULL,
	titlecache VARCHAR(511) NOT NULL,
	hidden BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS release_date_index ON tracks(release_date);

-- ALTER TABLE tracks ADD COLUMN ogcache JSONB
-- ALTER TABLE tracks ADD COLUMN hidden BOOLEAN NOT NULL DEFAULT false

--
-- UPDATE tracks
-- SET titlecache = substring(title || ' - ' || (
-- 	SELECT COALESCE(string_agg(value, ', '), '') from track_tags WHERE track_id=id and property='artist'
-- ) from 0 for 512)
-- WHERE titlecache IS NULL

CREATE TABLE IF NOT EXISTS track_tags(
	track_id INTEGER NOT NULL,
	property VARCHAR(255) NOT NULL,
	value TEXT NOT NULL,
	number INTEGER
);

CREATE INDEX IF NOT EXISTS property_index ON track_tags(property, value);
CREATE INDEX IF NOT EXISTS track_id_index ON track_tags(track_id);

CREATE TABLE IF NOT EXISTS tag_metadata (
	type VARCHAR(255) NOT NULL,
	id TEXT NOT NULL,
	property VARCHAR(255) NOT NULL,
	value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS object_index ON tag_metadata(type, id);
CREATE INDEX IF NOT EXISTS property_index ON tag_metadata(property, value);

CREATE TABLE IF NOT EXISTS track_history (
	track_id INTEGER,
	user_id VARCHAR(355),
	timestamp TIMESTAMP WITH TIME ZONE,
	value JSONB
);

CREATE INDEX IF NOT EXISTS track_index ON track_history(track_id);
CREATE INDEX IF NOT EXISTS editor_index ON track_history(user_id);

CREATE TABLE IF NOT EXISTS tag_metadata_history (
	type VARCHAR(255) NOT NULL,
	id TEXT NOT NULL,
	user_id VARCHAR(355),
	timestamp TIMESTAMP WITH TIME ZONE,
	value JSONB
);

CREATE TABLE IF NOT EXISTS users (
	id VARCHAR(255) PRIMARY KEY,
	name VARCHAR(255) NOT NULL,
	avatar VARCHAR(255),
	role INTEGER
);

CREATE TABLE IF NOT EXISTS user_flags (
	track_id INTEGER NOT NULL,
	user_id VARCHAR(255) NOT NULL,
	flag VARCHAR(20) NOT NULL,
	value REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
	session VARCHAR(255) PRIMARY KEY,
	user_id VARCHAR(255),
	expire_time TIMESTAMP WITH TIME ZONE
);



-- INSERT INTO users (id, name, role) VALUES('1', 'System', 2)
-- INSERT INTO sessions (session, user_id, expire_time) VALUES ('1', '1', NOW() + interval '1 year')

-- SELECT pg_catalog.setval(pg_get_serial_sequence('tracks', 'id'), (SELECT MAX(track_id) FROM track_history)+1);