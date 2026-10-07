const bcrypt = require('bcryptjs');
const db = require('./config/database');

function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  // Reset tables
  db.exec(`
    DELETE FROM activity_logs;
    DELETE FROM activity_types WHERE is_system = 0;
    DELETE FROM users;
  `);

  const passwordHash = bcrypt.hashSync('Password123!', 10);
  const adminPasswordHash = bcrypt.hashSync('Admin123!', 10);

  // 1. Create Users
  const insertUser = db.prepare(`
    INSERT INTO users (username, email, password_hash, role, display_name, avatar_color)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const usersData = [
    { username: 'admin', email: 'admin@archon.app', hash: adminPasswordHash, role: 'admin', name: 'Platform Admin', color: '#6366f1' },
    { username: 'elena_pro', email: 'elena@fitness.io', hash: passwordHash, role: 'user', name: 'Elena Rostova', color: '#ec4899' },
    { username: 'marcus_speed', email: 'marcus@fitness.io', hash: passwordHash, role: 'user', name: 'Marcus Vance', color: '#3b82f6' },
    { username: 'sarah_cyclist', email: 'sarah@fitness.io', hash: passwordHash, role: 'user', name: 'Sarah Chen', color: '#10b981' },
    { username: 'liam_trail', email: 'liam@fitness.io', hash: passwordHash, role: 'user', name: 'Liam O’Connor', color: '#f59e0b' },
    { username: 'chloe_pace', email: 'chloe@fitness.io', hash: passwordHash, role: 'user', name: 'Chloe Dubois', color: '#8b5cf6' },
    { username: 'david_stride', email: 'david@fitness.io', hash: passwordHash, role: 'user', name: 'David Miller', color: '#06b6d4' },
    { username: 'maya_zen', email: 'maya@fitness.io', hash: passwordHash, role: 'user', name: 'Maya Patel', color: '#14b8a6' },
    // User ABC: The user with private workouts to demonstrate the exact requested privacy feature!
    { username: 'abc', email: 'abc@archon.app', hash: passwordHash, role: 'user', name: 'User ABC (Shadow Demo)', color: '#f43f5e' },
    { username: 'henry_fit', email: 'henry@fitness.io', hash: passwordHash, role: 'user', name: 'Henry Ford', color: '#84cc16' },
    { username: 'ian_walker', email: 'ian@fitness.io', hash: passwordHash, role: 'user', name: 'Ian Wright', color: '#a855f7' },
    { username: 'zoe_active', email: 'zoe@fitness.io', hash: passwordHash, role: 'user', name: 'Zoe Martinez', color: '#eab308' }
  ];

  const userMap = {};
  for (const u of usersData) {
    const res = insertUser.run(u.username, u.email, u.hash, u.role, u.name, u.color);
    userMap[u.username] = res.lastInsertRowid;
  }

  // 2. Add custom activities
  const insertAct = db.prepare(`
    INSERT OR IGNORE INTO activity_types (slug, name, icon, primary_unit, cal_per_unit, description, is_system, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAct.run('swimming', 'Swimming', '🏊‍♂️', 'km', 85.0, 'Lap swimming and open water cardio', 0, userMap['admin']);
  insertAct.run('rowing', 'Rowing', '🚣‍♂️', 'km', 70.0, 'Concept2 rowing and water sculling', 0, userMap['admin']);
  insertAct.run('hiking', 'Mountain Hiking', '🥾', 'km', 65.0, 'Incline hiking and trail elevation', 0, userMap['admin']);

  const acts = db.prepare('SELECT id, slug FROM activity_types').all();
  const actMap = {};
  for (const a of acts) {
    actMap[a.slug] = a.id;
  }

  // 3. Helper to insert activity logs
  const insertLog = db.prepare(`
    INSERT INTO activity_logs (user_id, activity_type_id, distance, duration_minutes, calories, date, notes, is_private)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const today = new Date();
  function getDateAgo(daysAgo) {
    const d = new Date(today);
    d.setDate(today.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  }

  // Public users with varying scores
  // Elena: Rank 1 (~150km, ~1800 pts)
  for (let i = 1; i <= 12; i++) {
    insertLog.run(userMap['elena_pro'], actMap['running'], 12.5, 62, 850, getDateAgo(i), 'Morning tempo run', 0);
  }

  // Marcus: Rank 2 (~120km, ~1450 pts)
  for (let i = 1; i <= 10; i++) {
    insertLog.run(userMap['marcus_speed'], actMap['cycling'], 18.0, 48, 550, getDateAgo(i), 'Interval cycling session', 0);
  }

  // Sarah: Rank 3 (~100km, ~1250 pts)
  for (let i = 1; i <= 8; i++) {
    insertLog.run(userMap['sarah_cyclist'], actMap['cycling'], 22.0, 55, 620, getDateAgo(i * 2), 'Long weekend road ride', 0);
  }

  // Liam: Rank 4 (~85km, ~1050 pts)
  for (let i = 1; i <= 7; i++) {
    insertLog.run(userMap['liam_trail'], actMap['running'], 10.0, 52, 680, getDateAgo(i * 2), 'Trail run in the woods', 0);
  }

  // Chloe: Rank 5 (~70km, ~880 pts)
  for (let i = 1; i <= 6; i++) {
    insertLog.run(userMap['chloe_pace'], actMap['walking'], 9.5, 75, 420, getDateAgo(i * 2), 'Brisk park walk', 0);
  }

  // David: Rank 6 (~55km, ~720 pts)
  for (let i = 1; i <= 5; i++) {
    insertLog.run(userMap['david_stride'], actMap['running'], 8.5, 46, 560, getDateAgo(i * 2), 'Track intervals', 0);
  }

  // Maya: Rank 7 (~55km, ~650 pts)
  for (let i = 1; i <= 6; i++) {
    insertLog.run(userMap['maya_zen'], actMap['walking'], 8.0, 65, 360, getDateAgo(i * 2), 'Power walk routine', 0);
  }

  // Henry: Rank 8 on public board (~28km, ~360 pts)
  for (let i = 1; i <= 3; i++) {
    insertLog.run(userMap['henry_fit'], actMap['running'], 6.5, 38, 410, getDateAgo(i * 3), 'Evening jog', 0);
  }

  // Ian: Rank 9 on public board (~20km, ~270 pts)
  for (let i = 1; i <= 3; i++) {
    insertLog.run(userMap['ian_walker'], actMap['walking'], 5.0, 45, 230, getDateAgo(i * 3), 'Neighborhood stroll', 0);
  }

  // Zoe: Rank 10 on public board (~10km, ~140 pts)
  insertLog.run(userMap['zoe_active'], actMap['running'], 5.0, 30, 320, getDateAgo(2), 'Quick treadmill run', 0);
  insertLog.run(userMap['zoe_active'], actMap['walking'], 4.0, 40, 180, getDateAgo(5), 'Casual stroll', 0);

  // =========================================================================
  // USER ABC (The exact requested demonstration):
  // User ABC has PRIVATE workouts giving a total score higher than Henry (~400 pts)
  // but lower than Maya (~550 pts) -> around ~480 points!
  // In ABC's personal view: Maya is #7, ABC is #8, Henry is #9!
  // On the PUBLIC board: ABC's workouts are private, so ABC is NOT shown publicly,
  // and Henry becomes #8, Ian becomes #9!
  // =========================================================================
  insertLog.run(userMap['abc'], actMap['running'], 8.0, 45, 520, getDateAgo(1), 'Secret 8k run (marked private)', 1);
  insertLog.run(userMap['abc'], actMap['cycling'], 15.0, 42, 450, getDateAgo(3), 'Private indoor cycling ride', 1);
  insertLog.run(userMap['abc'], actMap['running'], 7.5, 40, 490, getDateAgo(5), 'Evening trail run (private log)', 1);
  insertLog.run(userMap['abc'], actMap['swimming'], 2.5, 50, 400, getDateAgo(8), 'Endurance lap swim (private log)', 1);

  console.log('✅ Database seeded successfully with realistic data and privacy showcase!');
  console.log('---------------------------------------------------------');
  console.log('👑 Admin Account:');
  console.log('   Username: admin | Password: Admin123!');
  console.log('🔒 Demo User ABC (Private Activity & Rank #8 Showcase):');
  console.log('   Username: abc | Password: Password123!');
  console.log('🏃 Other Demo Users: Password123!');
  console.log('---------------------------------------------------------');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
