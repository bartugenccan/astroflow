-- AI readings are now cached per subject (owner in the key and in "deviceId").
-- Rows written before that were shared across devices by birth data and could
-- not be removed by data deletion; the bumped cache versions no longer read them.
DELETE FROM "interpretations" WHERE "deviceId" IS NULL;
