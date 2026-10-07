const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { optionalAuth } = require('../middleware/auth');
const { calculateImprovement, calculatePace } = require('../utils/calculations');

/**
 * Helper to compute stats for all users based on privacy criteria
 * @param {number|null} requestingUserId - ID of logged in user (if any)
 * @param {string|null} activitySlug - filter by activity type (or null for all)
 * @param {string} timeframe - 'all_time' | 'month' | 'week'
 * @param {boolean} forcePublicOnly - whether to force public-only calculation even for logged in user
 */
function getLeaderboardData(requestingUserId = null, activitySlug = null, timeframe = 'all_time', forcePublicOnly = false) {
  // Activity filter condition
  let activityCondition = '';
  let activityParams = [];
  if (activitySlug && activitySlug !== 'all') {
    const act = db.prepare('SELECT id FROM activity_types WHERE slug = ?').get(activitySlug);
    if (act) {
      activityCondition = 'AND l.activity_type_id = ?';
      activityParams.push(act.id);
    }
  }

  // Time boundaries
  const now = new Date();
  let daysInPeriod = 7;
  let currentStartStr, prevStartStr;

  if (timeframe === 'month') {
    daysInPeriod = 30;
    const curStart = new Date(now); curStart.setDate(now.getDate() - 30);
    const prevStart = new Date(now); prevStart.setDate(now.getDate() - 60);
    currentStartStr = curStart.toISOString().split('T')[0];
    prevStartStr = prevStart.toISOString().split('T')[0];
  } else {
    // default 7 days for week / improvement calculation
    daysInPeriod = 7;
    const curStart = new Date(now); curStart.setDate(now.getDate() - 7);
    const prevStart = new Date(now); prevStart.setDate(now.getDate() - 14);
    currentStartStr = curStart.toISOString().split('T')[0];
    prevStartStr = prevStart.toISOString().split('T')[0];
  }

  // Get all registered users
  const users = db.prepare('SELECT id, username, display_name, avatar_color, role FROM users').all();

  const userStatsList = [];

  for (const user of users) {
    const isRequestingUser = requestingUserId && user.id === requestingUserId && !forcePublicOnly;

    // PRIVACY RULE:
    // If it's the requesting user themselves (and not forcePublicOnly), include BOTH public and private logs.
    // If it's anyone else (or forcePublicOnly), include ONLY public logs (is_private = 0).
    const privacyFilter = isRequestingUser ? '' : 'AND l.is_private = 0';

    // 1. Overall stats
    let overallQuery = `
      SELECT 
        COUNT(l.id) AS total_workouts,
        COALESCE(SUM(l.distance), 0.0) AS total_distance,
        COALESCE(SUM(l.duration_minutes), 0) AS total_duration,
        COALESCE(SUM(l.calories), 0) AS total_calories,
        COUNT(DISTINCT l.date) AS total_active_days,
        SUM(CASE WHEN l.is_private = 1 THEN 1 ELSE 0 END) AS private_workouts_count
      FROM activity_logs l
      WHERE l.user_id = ? ${privacyFilter} ${activityCondition}
    `;
    const overall = db.prepare(overallQuery).get(user.id, ...activityParams);

    // 2. Current period stats (for improvement calculations)
    let curQuery = `
      SELECT 
        COUNT(l.id) AS workouts,
        COALESCE(SUM(l.distance), 0.0) AS distance,
        COALESCE(SUM(l.duration_minutes), 0) AS duration,
        COALESCE(SUM(l.calories), 0) AS calories,
        COUNT(DISTINCT l.date) AS activeDays
      FROM activity_logs l
      WHERE l.user_id = ? AND l.date >= ? ${privacyFilter} ${activityCondition}
    `;
    const curStats = db.prepare(curQuery).get(user.id, currentStartStr, ...activityParams);
    curStats.daysInPeriod = daysInPeriod;

    // 3. Previous period stats
    let prevQuery = `
      SELECT 
        COUNT(l.id) AS workouts,
        COALESCE(SUM(l.distance), 0.0) AS distance,
        COALESCE(SUM(l.duration_minutes), 0) AS duration,
        COALESCE(SUM(l.calories), 0) AS calories,
        COUNT(DISTINCT l.date) AS activeDays
      FROM activity_logs l
      WHERE l.user_id = ? AND l.date >= ? AND l.date < ? ${privacyFilter} ${activityCondition}
    `;
    const prevStats = db.prepare(prevQuery).get(user.id, prevStartStr, currentStartStr, ...activityParams);
    prevStats.daysInPeriod = daysInPeriod;

    // Improvement math
    const improvement = calculateImprovement(curStats, prevStats);

    // Score calculation
    const totalDist = parseFloat((overall.total_distance || 0).toFixed(2));
    const totalDur = overall.total_duration || 0;
    const totalCal = overall.total_calories || 0;
    const overallScore = Math.round((totalDist * 10) + (totalDur * 0.25) + (totalCal * 0.05));

    // If on public board and user has 0 workouts, skip showing them on public board
    if (!isRequestingUser && overall.total_workouts === 0) {
      continue;
    }

    userStatsList.push({
      userId: user.id,
      username: user.username,
      displayName: user.display_name,
      avatarColor: user.avatar_color,
      isCurrentUser: isRequestingUser,
      hasPrivateWorkoutsIncluded: isRequestingUser && (overall.private_workouts_count > 0),
      privateWorkoutsCount: isRequestingUser ? overall.private_workouts_count : 0,
      overall: {
        score: overallScore,
        totalDistance: totalDist,
        totalDuration: totalDur,
        totalWorkouts: overall.total_workouts,
        totalCalories: totalCal,
        activeDays: overall.total_active_days,
        pace: calculatePace(totalDist, totalDur).formatted
      },
      currentPeriod: {
        distance: parseFloat((curStats.distance || 0).toFixed(2)),
        duration: curStats.duration || 0,
        workouts: curStats.workouts || 0,
        activeDays: curStats.activeDays || 0
      },
      previousPeriod: {
        distance: parseFloat((prevStats.distance || 0).toFixed(2)),
        duration: prevStats.duration || 0,
        workouts: prevStats.workouts || 0,
        activeDays: prevStats.activeDays || 0
      },
      improvement: {
        discrete: improvement.discrete,
        ratios: improvement.ratios,
        improvementScore: improvement.improvementScore
      }
    });
  }

  return userStatsList;
}

// GET /api/leaderboard - Combined leaderboard with Shadow Privacy and Improvement Metrics
router.get('/', optionalAuth, (req, res) => {
  const { activity, timeframe = 'all_time', sort = 'score', view = 'auto' } = req.query;
  const currentUserId = req.user ? req.user.id : null;

  // 1. Calculate Public Leaderboard (only public activities for all users)
  const publicRaw = getLeaderboardData(null, activity, timeframe, true);
  
  // Sort public list
  const publicSorted = [...publicRaw].sort((a, b) => {
    if (sort === 'distance') return b.overall.totalDistance - a.overall.totalDistance;
    if (sort === 'improvement_ratio') return b.improvement.ratios.distancePercentChange - a.improvement.ratios.distancePercentChange;
    if (sort === 'improvement_delta') return b.improvement.discrete.deltaDistance - a.improvement.discrete.deltaDistance;
    if (sort === 'improvement_score') return b.improvement.improvementScore - a.improvement.improvementScore;
    return b.overall.score - a.overall.score;
  });

  const publicLeaderboard = publicSorted.map((item, index) => ({
    ...item,
    rank: index + 1
  }));

  // 2. If user is logged in, calculate Personal/Shadow Leaderboard (includes user's private logs)
  let personalLeaderboard = null;
  let currentUserPersonalRank = null;
  let currentUserPublicRank = null;

  if (currentUserId) {
    const personalRaw = getLeaderboardData(currentUserId, activity, timeframe, false);

    const personalSorted = [...personalRaw].sort((a, b) => {
      if (sort === 'distance') return b.overall.totalDistance - a.overall.totalDistance;
      if (sort === 'improvement_ratio') return b.improvement.ratios.distancePercentChange - a.improvement.ratios.distancePercentChange;
      if (sort === 'improvement_delta') return b.improvement.discrete.deltaDistance - a.improvement.discrete.deltaDistance;
      if (sort === 'improvement_score') return b.improvement.improvementScore - a.improvement.improvementScore;
      return b.overall.score - a.overall.score;
    });

    personalLeaderboard = personalSorted.map((item, index) => {
      const rank = index + 1;
      if (item.userId === currentUserId) {
        currentUserPersonalRank = rank;
      }
      return {
        ...item,
        rank
      };
    });

    // Find user's public rank if they are on the public board
    const publicEntry = publicLeaderboard.find(item => item.userId === currentUserId);
    currentUserPublicRank = publicEntry ? publicEntry.rank : null;
  }

  // Decide which list to return as primary based on requested view ('personal' or 'public')
  const isPersonalView = (view === 'personal' || (view === 'auto' && currentUserId !== null));
  const activeBoard = (isPersonalView && personalLeaderboard) ? personalLeaderboard : publicLeaderboard;

  res.json({
    activeView: (isPersonalView && personalLeaderboard) ? 'personal' : 'public',
    currentUserId,
    ranks: {
      personalRank: currentUserPersonalRank,
      publicRank: currentUserPublicRank
    },
    privacyInsight: currentUserId ? {
      hasPrivateData: personalLeaderboard?.find(u => u.userId === currentUserId)?.hasPrivateWorkoutsIncluded || false,
      explanation: currentUserPersonalRank 
        ? `You are ranked #${currentUserPersonalRank} in your personal view (including private logs). Other users see the public board where your private workouts are hidden.`
        : 'Log workouts to appear on the personal leaderboard.'
    } : null,
    leaderboard: activeBoard,
    publicCount: publicLeaderboard.length,
    personalCount: personalLeaderboard ? personalLeaderboard.length : 0
  });
});

module.exports = router;
