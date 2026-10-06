-- Prevent duplicate payout attempts for the same recipient on a bounty.
-- Deploy this before code that reserves split payouts in payout_events.
create unique index if not exists payout_events_issue_recipient_unique_idx
  on public.payout_events(issue_id, recipient_username);
