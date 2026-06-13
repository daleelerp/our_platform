-- Allow authenticated users to read active certification exams (needed for dashboard + learn page)
-- Previously only the service-role (admin) client could read this table.

ALTER TABLE certification_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "auth_read_active_cert_exams"
  ON certification_exams FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Allow users to read their own certification purchases
ALTER TABLE user_certification_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "users_read_own_cert_purchases"
  ON user_certification_purchases FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow users to read their own certificates
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "users_read_own_certificates"
  ON certificates FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
