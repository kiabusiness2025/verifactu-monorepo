ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "first_name" TEXT,
ADD COLUMN IF NOT EXISTS "last_name" TEXT;

UPDATE "User"
SET
  "first_name" = COALESCE(
    "first_name",
    NULLIF(split_part(TRIM("name"), ' ', 1), '')
  ),
  "last_name" = COALESCE(
    "last_name",
    NULLIF(substring(TRIM("name") from '^\S+\s+(.*)$'), '')
  )
WHERE "name" IS NOT NULL;