const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sql = fs.readFileSync('./prisma/migrations/manual_change_user_id_to_text.sql', 'utf8');

async function run() {
  try {
    console.log('🔄 Applying migration...');
    await pool.query(sql);
    console.log('✅ Migration applied successfully');
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

run();
