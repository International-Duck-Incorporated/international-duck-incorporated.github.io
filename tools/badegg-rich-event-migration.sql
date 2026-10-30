-- Apply once, after confirming PRAGMA table_info(badegg_events) does not
-- already show details_json. Back up the D1 database first.
ALTER TABLE badegg_events ADD COLUMN details_json TEXT;
CREATE INDEX IF NOT EXISTS badegg_events_ip_ts ON badegg_events (client_ip, ts DESC, id DESC);
