-- BAD EGG durable console metrics + event history (Cloudflare D1).
-- One database shared by the home Pages project (idi-official), its Worker
-- mirror (idi) and Agentarium, all bound as `BADEGG_DB` and tagged with their
-- own `BADEGG_SITE` label. Create and initialize once:
--
--   npx wrangler d1 create idi-badegg-metrics
--   npx wrangler d1 execute idi-badegg-metrics --remote --file .\tools\badegg-metrics.sql
--
-- 5-minute counter buckets, additively upserted by every site; the status API
-- sums them so the console shows fleet totals that survive deploys.
CREATE TABLE IF NOT EXISTS badegg_metrics (
  bucket_start INTEGER NOT NULL,        -- unix seconds, floored to 300s buckets
  site        TEXT    NOT NULL,         -- BADEGG_SITE: home | home-worker | agentarium
  inspected   INTEGER NOT NULL DEFAULT 0,
  blocked     INTEGER NOT NULL DEFAULT 0,
  throttled   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_start, site)
);

-- Refusal/decision history for the console's "Recent events"; throttled to at
-- most one row per distinct decision+categories per minute per isolate and
-- swept to a 30-day retention by the engine itself.
CREATE TABLE IF NOT EXISTS badegg_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  site       TEXT    NOT NULL,
  ts         INTEGER NOT NULL,          -- unix milliseconds
  decision   TEXT    NOT NULL,          -- blocked | temp_ban | ban_always | blocklist | throttled_rate_limit | config_updated | ...
  status     TEXT    NOT NULL,          -- console display status, e.g. blocked / observed / inspected
  categories TEXT    NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_badegg_events_ts ON badegg_events (ts DESC);
