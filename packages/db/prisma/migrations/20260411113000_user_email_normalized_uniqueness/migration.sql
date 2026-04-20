DO $$
DECLARE
  user_table regclass;
  duplicate_emails text;
BEGIN
  user_table := COALESCE(to_regclass('"User"'), to_regclass('users'));

  IF user_table IS NULL THEN
    RAISE EXCEPTION 'User table not found for normalized email uniqueness migration';
  END IF;

  EXECUTE format(
    $query$
      SELECT string_agg(email_key, ', ' ORDER BY email_key)
      FROM (
        SELECT LOWER(BTRIM(email)) AS email_key
        FROM %s
        WHERE email IS NOT NULL
          AND BTRIM(email) <> ''
        GROUP BY LOWER(BTRIM(email))
        HAVING COUNT(*) > 1
      ) duplicates
    $query$,
    user_table
  ) INTO duplicate_emails;

  IF duplicate_emails IS NOT NULL THEN
    RAISE EXCEPTION
      'Cannot enforce normalized email uniqueness until duplicates are resolved: %',
      duplicate_emails;
  END IF;

  EXECUTE format(
    'UPDATE %s SET email = LOWER(BTRIM(email)) WHERE email IS NOT NULL AND email <> LOWER(BTRIM(email))',
    user_table
  );

  EXECUTE 'DROP INDEX IF EXISTS "User_email_normalized_key"';

  EXECUTE format(
    'CREATE UNIQUE INDEX "User_email_normalized_key" ON %s (LOWER(BTRIM(email))) WHERE email IS NOT NULL AND BTRIM(email) <> ''''',
    user_table
  );
END $$;