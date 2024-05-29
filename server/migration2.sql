-- tag metadata table
ALTER TABLE track_tags_metadata
RENAME COLUMN property TO type;

ALTER TABLE track_tags_metadata
RENAME COLUMN value TO id;

ALTER TABLE track_tags_metadata
RENAME COLUMN meta_property TO property;

ALTER TABLE track_tags_metadata
RENAME COLUMN meta_value TO value;

ALTER TABLE track_tags_metadata
RENAME TO tag_metadata;
