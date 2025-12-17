/**
 * Script to create an admin user with hashed password
 * Usage: node scripts/create-admin-user.js
 */

const bcrypt = require("bcryptjs");

// Admin credentials
const username = "@fmolv";
const password = "Mario123456@Mm";

// Hash the password
bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error("Error hashing password:", err);
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log("ADMIN USER CREDENTIALS");
  console.log("=".repeat(60));
  console.log(`Username: ${username}`);
  console.log(`Password: ${password}`);
  console.log("\nHashed Password (use this in SQL):");
  console.log(hash);
  console.log("\n" + "=".repeat(60));
  console.log("\nSQL INSERT Statement:");
  console.log("-".repeat(60));
  console.log(`
INSERT INTO public.admin_credentials (username, password_hash, is_active)
VALUES ('${username}', '${hash}', true)
ON CONFLICT (username) 
DO UPDATE SET 
  password_hash = EXCLUDED.password_hash,
  is_active = true,
  failed_login_attempts = 0,
  locked_until = NULL;
  `);
  console.log("=".repeat(60));
});

