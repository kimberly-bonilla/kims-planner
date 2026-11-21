-- Slice 0: empty first migration that proves the migration pipeline works.
-- Real tables start in Slice 1 (profiles). Every user-owned table must enable
-- Row Level Security in the same migration that creates it (NFR-3, TEC-2).
select 1;
