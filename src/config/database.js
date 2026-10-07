const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(dataDir, 'archon_fitness.db');
const db = new Database(dbPath);

// Enable WAL mode for high concurrency & performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user', -- 'user' or 'admin'
      display_name TEXT NOT NULL,
      avatar_color TEXT DEFAULT '#06b6d4',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activity_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '🏃',
      primary_unit TEXT NOT NULL DEFAULT 'km', -- 'km', 'mi', 'laps', 'reps'
      cal_per_unit REAL DEFAULT 60.0,
      description TEXT,
      is_system INTEGER DEFAULT 0, -- 1 for built-ins (walking, running, cycling)
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      activity_type_id INTEGER NOT NULL,
      distance REAL DEFAULT 0.0, -- in primary_unit (e.g. km)
      duration_minutes INTEGER NOT NULL,
      calories INTEGER DEFAULT 0,
      date TEXT NOT NULL, -- YYYY-MM-DD
      notes TEXT,
      is_private INTEGER DEFAULT 0, -- 1 = private (only user sees, hidden from public leaderboard)
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(activity_type_id) REFERENCES activity_types(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_logs_user_date ON activity_logs(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_logs_privacy ON activity_logs(is_private);
    CREATE INDEX IF NOT EXISTS idx_logs_type ON activity_logs(activity_type_id);
  `);

  // Insert default activities if not present
  const defaultActivities = [
    { slug: 'walking', name: 'Walking', icon: '🚶‍♂️', primary_unit: 'km', cal_per_unit: 45.0, description: 'Brisk walking or leisurely stroll', is_system: 1 },
    { slug: 'running', name: 'Running', icon: '🏃‍♂️', primary_unit: 'km', cal_per_unit: 75.0, description: 'Outdoor or treadmill running', is_system: 1 },
    { slug: 'cycling', name: 'Cycling', icon: '🚴‍♂️', primary_unit: 'km', cal_per_unit: 35.0, description: 'Road cycling, mountain biking, or spin', is_system: 1 },
    { slug: 'swimming', name: 'Swimming', icon: '🏊‍♂️', primary_unit: 'km', cal_per_unit: 80.0, description: 'Lap swimming or open water', is_system: 0 },
    { slug: 'rowing', name: 'Rowing', icon: '🚣‍♂️', primary_unit: 'km', cal_per_unit: 70.0, description: 'Indoor rowing machine or sculling', is_system: 0 }
  ];

  const checkStmt = db.prepare('SELECT id FROM activity_types WHERE slug = ?');
  const insertStmt = db.prepare(`
    INSERT INTO activity_types (slug, name, icon, primary_unit, cal_per_unit, description, is_system)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const act of defaultActivities) {
    if (!checkStmt.get(act.slug)) {
      insertStmt.run(act.slug, act.name, act.icon, act.primary_unit, act.cal_per_unit, act.description, act.is_system);
    }
  }
}

initSchema();

module.exports = db;
