const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { optionalAuth } = require('../middleware/auth');
const { calculateImprovement, calculatePace } = require('../utils/calculations');

// Compare two users head-to-head
router.get('/compare', optionalAuth, (req, res) => {
  const { user1, user2, activity = 'all' } = req.query;
  const currentUserId = req.user ? req.user.id : null;

  if (!user1 || !user2) {
    return res.status(400).json({ error: 'Both user1 and user2 IDs are required for comparison.' });
  }

  const u1Id = parseInt(user1, 10);
  const u2Id = parseInt(user2, 10);

  const u1 = db.prepare('SELECT id, username, display_name, avatar_color, role FROM users WHERE id = ?').get(u1Id);
  const u2 = db.prepare('SELECT id, username, display_name, avatar_color, role FROM users WHERE id = ?').get(u2Id);

  if (!u1 || !u2) {
    return res.status(404).json({ error: 'One or both users could not be found.' });
  }

  function getUserMetrics(targetUser) {
    const isOwner = currentUserId && targetUser.id === currentUserId;
    const privacyFilter = isOwner ? '' : 'AND l.is_private = 0';

    let activityFilter = '';
    let actParams = [];
    if (activity && activity !== 'all') {
      const act = db.prepare('SELECT id FROM activity_types WHERE slug = ?').get(activity);
      if (act) {
        activityFilter = 'AND l.activity_type_id = ?';
        actParams.push(act.id);
      }
    }

    // Overall metrics
    const overall = db.prepare(`
      SELECT 
        COUNT(l.id) AS total_workouts,
        COALESCE(SUM(l.distance), 0.0) AS total_distance,
        COALESCE(SUM(l.duration_minutes), 0) AS total_duration,
        COALESCE(SUM(l.calories), 0) AS total_calories,
        COUNT(DISTINCT l.date) AS active_days
      FROM activity_logs l
      WHERE l.user_id = ? ${privacyFilter} ${activityFilter}
    `).get(targetUser.id, ...actParams);

    // Recent 7 days
    const now = new Date();
    const d7 = new Date(now); d7.setDate(now.getDate() - 7);
    const d14 = new Date(now); d14.setDate(now.getDate() - 14);

    const cur = db.prepare(`
      SELECT 
        COUNT(l.id) AS workouts,
        COALESCE(SUM(l.distance), 0.0) AS distance,
        COALESCE(SUM(l.duration_minutes), 0) AS duration,
        COUNT(DISTINCT l.date) AS activeDays
      FROM activity_logs l
      WHERE l.user_id = ? AND l.date >= ? ${privacyFilter} ${activityFilter}
    `).get(targetUser.id, d7.toISOString().split('T')[0], ...actParams);
    cur.daysInPeriod = 7;

    const prev = db.prepare(`
      SELECT 
        COUNT(l.id) AS workouts,
        COALESCE(SUM(l.distance), 0.0) AS distance,
        COALESCE(SUM(l.duration_minutes), 0) AS duration,
        COUNT(DISTINCT l.date) AS activeDays
      FROM activity_logs l
      WHERE l.user_id = ? AND l.date >= ? AND l.date < ? ${privacyFilter} ${activityFilter}
    `).get(targetUser.id, d14.toISOString().split('T')[0], d7.toISOString().split('T')[0], ...actParams);
    prev.daysInPeriod = 7;

    const improvement = calculateImprovement(cur, prev);
    const dist = parseFloat((overall.total_distance || 0).toFixed(2));
    const dur = overall.total_duration || 0;
    const score = Math.round((dist * 10) + (dur * 0.25) + ((overall.total_calories || 0) * 0.05));

    // Top activities breakdown
    const breakdown = db.prepare(`
      SELECT a.name, a.icon, COALESCE(SUM(l.distance), 0.0) AS distance, COUNT(l.id) AS count
      FROM activity_types a
      JOIN activity_logs l ON a.id = l.activity_type_id
      WHERE l.user_id = ? ${privacyFilter}
      GROUP BY a.id
      ORDER BY distance DESC
    `).all(targetUser.id);

    return {
      user: targetUser,
      isOwner,
      overall: {
        score,
        totalDistance: dist,
        totalDuration: dur,
        totalWorkouts: overall.total_workouts || 0,
        totalCalories: overall.total_calories || 0,
        activeDays: overall.active_days || 0,
        pace: calculatePace(dist, dur).formatted
      },
      improvement,
      breakdown
    };
  }

  const m1 = getUserMetrics(u1);
  const m2 = getUserMetrics(u2);

  // Discrete deltas between User 1 and User 2
  const distanceDelta = parseFloat((m1.overall.totalDistance - m2.overall.totalDistance).toFixed(2));
  const durationDelta = m1.overall.totalDuration - m2.overall.totalDuration;
  const workoutsDelta = m1.overall.totalWorkouts - m2.overall.totalWorkouts;
  const scoreDelta = m1.overall.score - m2.overall.score;

  // Ratios between User 1 and User 2
  const distanceRatio = m2.overall.totalDistance > 0 
    ? parseFloat((m1.overall.totalDistance / m2.overall.totalDistance).toFixed(2))
    : (m1.overall.totalDistance > 0 ? 10.0 : 1.0);

  const durationRatio = m2.overall.totalDuration > 0
    ? parseFloat((m1.overall.totalDuration / m2.overall.totalDuration).toFixed(2))
    : (m1.overall.totalDuration > 0 ? 10.0 : 1.0);

  // Categories won
  const categories = [
    { name: 'Total Distance', leader: distanceDelta > 0 ? u1.display_name : (distanceDelta < 0 ? u2.display_name : 'Tied') },
    { name: 'Active Duration', leader: durationDelta > 0 ? u1.display_name : (durationDelta < 0 ? u2.display_name : 'Tied') },
    { name: 'Workout Frequency', leader: workoutsDelta > 0 ? u1.display_name : (workoutsDelta < 0 ? u2.display_name : 'Tied') },
    { name: 'Overall Fitness Score', leader: scoreDelta > 0 ? u1.display_name : (scoreDelta < 0 ? u2.display_name : 'Tied') },
    { 
      name: 'Recent Growth %', 
      leader: m1.improvement.ratios.distancePercentChange > m2.improvement.ratios.distancePercentChange 
        ? u1.display_name 
        : (m1.improvement.ratios.distancePercentChange < m2.improvement.ratios.distancePercentChange ? u2.display_name : 'Tied')
    }
  ];

  res.json({
    user1: m1,
    user2: m2,
    headToHead: {
      discrete: {
        distanceDelta, // > 0 means User 1 leads
        durationDelta,
        workoutsDelta,
        scoreDelta
      },
      ratios: {
        distanceRatio, // e.g. 1.35x
        durationRatio
      },
      categories
    }
  });
});

module.exports = router;
