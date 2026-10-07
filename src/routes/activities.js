const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Get all activity types (public or authenticated)
router.get('/', (req, res) => {
  const activities = db.prepare(`
    SELECT a.*, u.display_name AS created_by_name
    FROM activity_types a
    LEFT JOIN users u ON a.created_by = u.id
    ORDER BY a.is_system DESC, a.name ASC
  `).all();
  res.json({ activities });
});

// Admin creates a new activity type
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  const { name, icon, primary_unit, cal_per_unit, description } = req.body;

  if (!name || String(name).trim().length === 0) {
    return res.status(400).json({ error: 'Activity name is required.' });
  }

  const cleanName = String(name).trim();
  const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const cleanIcon = icon && String(icon).trim() ? String(icon).trim() : '⚡';
  const unit = primary_unit && String(primary_unit).trim() ? String(primary_unit).trim() : 'km';
  const calRate = parseFloat(cal_per_unit) > 0 ? parseFloat(cal_per_unit) : 50.0;
  const desc = description ? String(description).trim() : '';

  // Check unique slug
  const existing = db.prepare('SELECT id FROM activity_types WHERE slug = ?').get(slug);
  if (existing) {
    return res.status(409).json({ error: `Activity '${cleanName}' already exists.` });
  }

  const insert = db.prepare(`
    INSERT INTO activity_types (slug, name, icon, primary_unit, cal_per_unit, description, is_system, created_by)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `);

  try {
    const info = insert.run(slug, cleanName, cleanIcon, unit, calRate, desc, req.user.id);
    const newActivity = db.prepare('SELECT * FROM activity_types WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({
      message: `Activity '${cleanName}' created successfully!`,
      activity: newActivity
    });
  } catch (err) {
    console.error('Error creating activity:', err);
    res.status(500).json({ error: 'Failed to create activity.' });
  }
});

// Admin delete custom activity (cannot delete system activities)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const actId = parseInt(req.params.id, 10);
  const act = db.prepare('SELECT * FROM activity_types WHERE id = ?').get(actId);

  if (!act) {
    return res.status(404).json({ error: 'Activity not found.' });
  }

  if (act.is_system === 1) {
    return res.status(400).json({ error: 'Cannot delete core system activities (Walking, Running, Cycling).' });
  }

  // Check if logs exist using this activity
  const usageCount = db.prepare('SELECT COUNT(*) as count FROM activity_logs WHERE activity_type_id = ?').get(actId).count;
  if (usageCount > 0) {
    return res.status(400).json({ 
      error: `Cannot delete activity because it has ${usageCount} logged workout entries associated with it.` 
    });
  }

  db.prepare('DELETE FROM activity_types WHERE id = ?').run(actId);
  res.json({ message: `Activity '${act.name}' deleted successfully.` });
});

module.exports = router;
