/**
 * Calculation utilities for fitness scores, discrete improvement deltas, and ratios
 */

function calculateActivityScore(distance, durationMinutes, calPerUnit = 60, calories = 0) {
  const dist = parseFloat(distance) || 0;
  const dur = parseInt(durationMinutes, 10) || 0;
  const cal = parseInt(calories, 10) || Math.round(dist * calPerUnit + (dur * 4));
  
  // Composite score: distance (10 pts/km) + duration (0.25 pts/min) + calorie efficiency (0.05 pts/kcal)
  const score = Math.round((dist * 10) + (dur * 0.25) + (cal * 0.05));
  return { score, calories: cal };
}

function calculatePace(distance, durationMinutes) {
  const dist = parseFloat(distance) || 0;
  const dur = parseInt(durationMinutes, 10) || 0;
  if (dist <= 0 || dur <= 0) return { raw: 0, formatted: '--' };

  const paceRaw = dur / dist; // minutes per km
  const mins = Math.floor(paceRaw);
  const secs = Math.round((paceRaw - mins) * 60);
  const formatted = `${mins}:${secs < 10 ? '0' : ''}${secs} /km`;
  return { raw: paceRaw, formatted };
}

/**
 * Calculates discrete deltas and ratio improvements between two time periods
 * @param {Object} currentStats - { distance, duration, workouts, calories, activeDays, daysInPeriod }
 * @param {Object} previousStats - { distance, duration, workouts, calories, activeDays, daysInPeriod }
 */
function calculateImprovement(currentStats, previousStats) {
  const cDist = currentStats.distance || 0;
  const pDist = previousStats.distance || 0;
  const cDur = currentStats.duration || 0;
  const pDur = previousStats.duration || 0;
  const cWorkouts = currentStats.workouts || 0;
  const pWorkouts = previousStats.workouts || 0;

  // Discrete numbers (absolute changes)
  const deltaDistance = parseFloat((cDist - pDist).toFixed(2));
  const deltaDuration = Math.round(cDur - pDur);
  const deltaWorkouts = Math.round(cWorkouts - pWorkouts);

  // Ratios and percentages
  let distanceRatio = 1.0;
  let distancePercentChange = 0.0;
  if (pDist > 0) {
    distanceRatio = parseFloat((cDist / pDist).toFixed(2));
    distancePercentChange = parseFloat((((cDist - pDist) / pDist) * 100).toFixed(1));
  } else if (cDist > 0) {
    distanceRatio = parseFloat((cDist).toFixed(2));
    distancePercentChange = 100.0; // Started fresh
  }

  let durationRatio = 1.0;
  let durationPercentChange = 0.0;
  if (pDur > 0) {
    durationRatio = parseFloat((cDur / pDur).toFixed(2));
    durationPercentChange = parseFloat((((cDur - pDur) / pDur) * 100).toFixed(1));
  } else if (cDur > 0) {
    durationRatio = parseFloat((cDur).toFixed(2));
    durationPercentChange = 100.0;
  }

  // Consistency Ratio: Active Days / Total Days
  const currentConsistencyRatio = currentStats.daysInPeriod > 0 
    ? parseFloat(((currentStats.activeDays || 0) / currentStats.daysInPeriod).toFixed(3))
    : 0;
  const previousConsistencyRatio = previousStats.daysInPeriod > 0
    ? parseFloat(((previousStats.activeDays || 0) / previousStats.daysInPeriod).toFixed(3))
    : 0;
  const deltaConsistency = parseFloat((currentConsistencyRatio - previousConsistencyRatio).toFixed(3));

  // Overall Improvement Index:
  // Combines discrete distance gain (+15 pts per delta km), workout frequency (+20 pts per workout delta),
  // and capped percentage multiplier
  let growthFactor = distancePercentChange;
  if (growthFactor > 300) growthFactor = 300;
  if (growthFactor < -100) growthFactor = -100;

  const improvementScore = Math.round(
    (deltaDistance * 15) + 
    (deltaDuration * 0.2) + 
    (deltaWorkouts * 25) + 
    (growthFactor * 0.5)
  );

  return {
    discrete: {
      deltaDistance, // in km (e.g. +5.4)
      deltaDuration, // in minutes (e.g. +45)
      deltaWorkouts  // in count (e.g. +2)
    },
    ratios: {
      distanceRatio, // e.g. 1.25 (25% increase)
      distancePercentChange, // e.g. +25.0%
      durationRatio,
      durationPercentChange,
      currentConsistencyRatio, // e.g. 0.71 (5 of 7 days)
      deltaConsistency // e.g. +0.14
    },
    improvementScore // composite score used for Improvement Leaderboard
  };
}

module.exports = {
  calculateActivityScore,
  calculatePace,
  calculateImprovement
};
