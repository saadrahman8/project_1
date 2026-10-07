const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { calculateActivityScore, calculatePace } = require('../utils/calculations');

// Create a new activity log
router.post('/', authenticateToken, (req, res) => {
  const { activity_type_id, distance, duration_minutes, date, notes, is_private, calories } = req.body;

  const actTypeId = parseInt(activity_type_id, 10);
  const dur = parseInt(duration_minutes, 10);
  const dist = parseFloat(distance) || 0.0;
  const logDate = date && String(date).trim() ? String(date).trim() : new Date().toISOString().split('T')[0];
  const priv = (is_private === true || is_private === 1 || is_private === 'true' || is_private === '1') ? 1 : 0;
  const noteStr = notes ? String(notes).trim().slice(0, 500) : '';

  if (!actTypeId) {
    return res.status(400).json({ error: 'Activity type is required.' });
  }

  if (isNaN(dur) || dur <= 0) {
    return res.status(400).json({ error: 'Duration must be greater than 0 minutes.' });
  }

  if (dist < 0) {
    return res.status(400).json({ error: 'Distance cannot be negative.' });
  }

  // Verify activity type exists
  const actType = db.prepare('SELECT * FROM activity_types WHERE id = ?').get(actTypeId);
  if (!actType) {
    return res.status(404).json({ error: 'Invalid activity type selected.' });
  }

  // Calculate calories & score
  const { calories: calcCal } = calculateActivityScore(dist, dur, actType.cal_per_unit, calories);

  const insert = db.prepare(`
    INSERT INTO activity_logs (user_id, activity_type_id, distance, duration_minutes, calories, date, notes, is_private)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    const info = insert.run(req.user.id, actTypeId, dist, dur, calcCal, logDate, noteStr, priv);
    const newLog = db.prepare(`
      SELECT l.*, a.name AS activity_name, a.icon, a.primary_unit
      FROM activity_logs l
      JOIN activity_types a ON l.activity_type_id = a.id
      WHERE l.id = ?
    `).get(info.lastInsertRowid);

    res.status(201).json({
      message: priv ? 'Private workout logged! (Visible only to you)' : 'Workout logged successfully!',
      log: {
        ...newLog,
        pace: calculatePace(newLog.distance, newLog.duration_minutes).formatted
      }
    });
  } catch (err) {
    console.error('Error logging activity:', err);
    res.status(500).json({ error: 'Failed to record workout.' });
  }
});

// Get current user's activity logs (both public and private)
router.get('/my', authenticateToken, (req, res) => {
  const { limit = 50, activity_id } = req.query;

  let query = `
    SELECT l.*, a.name AS activity_name, a.icon, a.primary_unit, a.cal_per_unit
    FROM activity_logs l
    JOIN activity_types a ON l.activity_type_id = a.id
    WHERE l.user_id = ?
  `;
  const params = [req.user.id];

  if (activity_id) {
    query += ' AND l.activity_type_id = ?';
    params.push(parseInt(activity_id, 10));
  }

  query += ' ORDER BY l.date DESC, l.id DESC LIMIT ?';
  params.push(parseInt(limit, 10) || 50);

  const logs = db.prepare(query).all(...params);

  const formattedLogs = logs.map(l => {
    const paceInfo = calculatePace(l.distance, l.duration_minutes);
    const { score } = calculateActivityScore(l.distance, l.duration_minutes, l.cal_per_unit, l.calories);
    return {
      ...l,
      pace: paceInfo.formatted,
      score
    };
  });

  res.json({ logs: formattedLogs });
});

// Get current user summary statistics
router.get('/my-summary', authenticateToken, (req, res) => {
  const userId = req.user.id;

  // Aggregate all activities (public + private)
  const totalStats = db.prepare(`
    SELECT 
      COUNT(*) AS total_workouts,
      SUM(CASE WHEN is_private = 1 THEN 1 ELSE 0 END) AS private_workouts,
      SUM(CASE WHEN is_private = 0 THEN 1 ELSE 0 END) AS public_workouts,
      COALESCE(SUM(distance), 0.0) AS total_distance,
      COALESCE(SUM(duration_minutes), 0) AS total_duration,
      COALESCE(SUM(calories), 0) AS total_calories
    FROM activity_logs
    WHERE user_id = ?
  `).get(userId);

  // Breakdown by activity type
  const activityBreakdown = db.prepare(`
    SELECT 
      a.id, a.name, a.icon, a.primary_unit,
      COUNT(l.id) AS count,
      COALESCE(SUM(l.distance), 0.0) AS total_distance,
      COALESCE(SUM(l.duration_minutes), 0) AS total_duration
    FROM activity_types a
    LEFT JOIN activity_logs l ON a.id = l.activity_type_id AND l.user_id = ?
    GROUP BY a.id
    ORDER BY total_distance DESC
  `).all(userId);

  // Recent 7 days vs previous 7 days (including private for user's personal view)
  const today = new Date();
  const d7 = new Date(today);
  d7.setDate(today.getDate() - 7);
  const d14 = new Date(today);
  d14.setDate(today.getDate() - 14);

  const dateStr7 = d7.toISOString().split('T')[0];
  const dateStr14 = d14.toISOString().split('T')[0];

  const current7 = db.prepare(`
    SELECT 
      COALESCE(SUM(distance), 0.0) AS distance,
      COALESCE(SUM(duration_minutes), 0) AS duration,
      COUNT(*) AS workouts,
      COUNT(DISTINCT date) AS activeDays
    FROM activity_logs
    WHERE user_id = ? AND date >= ?
  `).get(userId, dateStr7);

  const prev7 = db.prepare(`
    SELECT 
      COALESCE(SUM(distance), 0.0) AS distance,
      COALESCE(SUM(duration_minutes), 0) AS duration,
      COUNT(*) AS workouts,
      COUNT(DISTINCT date) AS activeDays
    FROM activity_logs
    WHERE user_id = ? AND date >= ? AND date < ?
  `).get(userId, dateStr14, dateStr7);

  res.json({
    totals: {
      totalWorkouts: totalStats.total_workouts || 0,
      privateWorkouts: totalStats.private_workouts || 0,
      publicWorkouts: totalStats.public_workouts || 0,
      totalDistance: parseFloat((totalStats.total_distance || 0).toFixed(2)),
      totalDuration: totalStats.total_duration || 0,
      totalCalories: totalStats.total_calories || 0
    },
    activityBreakdown,
    recentWeek: {
      current: current7,
      previous: prev7
    }
  });
});

// Update an activity log (STRICT OWNERSHIP ENFORCEMENT)
router.put('/:id', authenticateToken, (req, res) => {
  const logId = parseInt(req.params.id, 10);
  const log = db.prepare('SELECT * FROM activity_logs WHERE id = ?').get(logId);

  if (!log) {
    return res.status(404).json({ error: 'Activity log not found.' });
  }

  // Security check: User can ONLY update their own score/log
  if (log.user_id !== req.user.id) {
    return res.status(403).json({ 
      error: 'Access Denied: You can only edit and update your own activity records.' 
    });
  }

  const { distance, duration_minutes, date, notes, is_private, calories } = req.body;

  const dur = duration_minutes !== undefined ? parseInt(duration_minutes, 10) : log.duration_minutes;
  const dist = distance !== undefined ? parseFloat(distance) : log.distance;
  const logDate = date ? String(date).trim() : log.date;
  const priv = is_private !== undefined 
    ? (is_private === true || is_private === 1 || is_private === 'true' || is_private === '1' ? 1 : 0)
    : log.is_private;
  const noteStr = notes !== undefined ? String(notes).trim().slice(0, 500) : log.notes;

  if (isNaN(dur) || dur <= 0) {
    return res.status(400).json({ error: 'Duration must be greater than 0 minutes.' });
  }

  if (dist < 0) {
    return res.status(400).json({ error: 'Distance cannot be negative.' });
  }

  // Fetch activity type for calorie calculation
  const actType = db.prepare('SELECT * FROM activity_types WHERE id = ?').get(log.activity_type_id);
  const { calories: calcCal } = calculateActivityScore(dist, dur, actType.cal_per_unit, calories || log.calories);

  const update = db.prepare(`
    UPDATE activity_logs
    SET distance = ?, duration_minutes = ?, calories = ?, date = ?, notes = ?, is_private = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `);

  try {
    update.run(dist, dur, calcCal, logDate, noteStr, priv, logId, req.user.id);
    const updated = db.prepare(`
      SELECT l.*, a.name AS activity_name, a.icon, a.primary_unit
      FROM activity_logs l
      JOIN activity_types a ON l.activity_type_id = a.id
      WHERE l.id = ?
    `).get(logId);

    res.json({
      message: 'Workout log updated successfully!',
      log: {
        ...updated,
        pace: calculatePace(updated.distance, updated.duration_minutes).formatted
      }
    });
  } catch (err) {
    console.error('Error updating activity log:', err);
    res.status(500).json({ error: 'Failed to update workout log.' });
  }
});

// Delete an activity log (STRICT OWNERSHIP ENFORCEMENT)
router.delete('/:id', authenticateToken, (req, res) => {
  const logId = parseInt(req.params.id, 10);
  const log = db.prepare('SELECT * FROM activity_logs WHERE id = ?').get(logId);

  if (!log) {
    return res.status(404).json({ error: 'Activity log not found.' });
  }

  // Security check: User can ONLY delete their own score/log
  if (log.user_id !== req.user.id) {
    return res.status(403).json({ 
      error: 'Access Denied: You can only delete your own activity records.' 
    });
  }

  try {
    db.prepare('DELETE FROM activity_logs WHERE id = ? AND user_id = ?').run(logId, req.user.id);
    res.json({ message: 'Workout log deleted successfully.' });
  } catch (err) {
    console.error('Error deleting activity log:', err);
    res.status(500).json({ error: 'Failed to delete workout log.' });
  }
});

module.exports = router;
