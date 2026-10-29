-- Apply ONCE to the existing idi-badegg-metrics database before deploying.
-- Existing rows intentionally remain NULL: these fields cannot be recovered.
ALTER TABLE badegg_events ADD COLUMN client_ip TEXT;
ALTER TABLE badegg_events ADD COLUMN path TEXT;
ALTER TABLE badegg_events ADD COLUMN host TEXT;
ALTER TABLE badegg_events ADD COLUMN method TEXT;
ALTER TABLE badegg_events ADD COLUMN rule_ids TEXT;
ALTER TABLE badegg_events ADD COLUMN direction TEXT;
ALTER TABLE badegg_events ADD COLUMN confidence REAL;
