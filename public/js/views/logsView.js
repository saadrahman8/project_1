/**
 * ARCHON WORKOUT LOGGING & MANAGEMENT VIEW
 * Allows logging activities with Private input option, live preview,
 * and strict ownership edit/delete controls.
 */

const LogsView = {
  logs: [],
  summary: null,

  async render(container) {
    const user = State.currentUser;

    if (!user) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 3rem 1.5rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🔒</div>
          <h2 class="card-title" style="justify-content: center;">Authentication Required</h2>
          <p class="card-subtitle" style="max-width: 450px; margin: 0.5rem auto 1.5rem;">
            Please sign in to record workouts, configure private shadow entries, and update your personal fitness score.
          </p>
          <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-primary" onclick="document.getElementById('authModal').classList.remove('hidden')">
              Sign In or Register
            </button>
            <button class="btn btn-secondary" onclick="document.querySelector('[data-user=\\'abc\\']').click()">
              Log In as Demo User ABC
            </button>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Retrieving your personal workout ledger...</p>
      </div>
    `;

    try {
      await this.loadData();
      this.renderContent(container);
    } catch (err) {
      container.innerHTML = `
        <div class="card error-card">
          <p>Failed to load activity records: ${err.message}</p>
        </div>
      `;
    }
  },

  async loadData() {
    const [logsRes, summaryRes] = await Promise.all([
      API.logs.getMy(),
      API.logs.getMySummary()
    ]);
    this.logs = logsRes.logs || [];
    this.summary = summaryRes;
  },

  renderContent(container) {
    const user = State.currentUser;
    const totals = this.summary?.totals || {};

    container.innerHTML = `
      <!-- User Summary Stat Tiles -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div class="card" style="padding: 1.25rem;">
          <span class="text-muted" style="font-size: 0.75rem; text-transform: uppercase;">Total Distance</span>
          <div class="metric-mono" style="font-size: 1.6rem; font-weight: 800; color: var(--cyan-primary);">
            ${totals.totalDistance || 0} km
          </div>
        </div>

        <div class="card" style="padding: 1.25rem;">
          <span class="text-muted" style="font-size: 0.75rem; text-transform: uppercase;">Total Workouts</span>
          <div class="metric-mono" style="font-size: 1.6rem; font-weight: 800; color: var(--text-highlight);">
            ${totals.totalWorkouts || 0} sessions
          </div>
        </div>

        <div class="card" style="padding: 1.25rem; border-color: rgba(244, 63, 94, 0.3);">
          <span class="text-muted" style="font-size: 0.75rem; text-transform: uppercase;">Private Shadow Entries</span>
          <div class="metric-mono" style="font-size: 1.6rem; font-weight: 800; color: var(--rose-private);">
            🔒 ${totals.privateWorkouts || 0} entries
          </div>
          <small class="text-muted" style="font-size: 0.72rem;">Visible strictly to you</small>
        </div>

        <div class="card" style="padding: 1.25rem;">
          <span class="text-muted" style="font-size: 0.75rem; text-transform: uppercase;">Public Community Entries</span>
          <div class="metric-mono" style="font-size: 1.6rem; font-weight: 800; color: var(--emerald-success);">
            🌐 ${totals.publicWorkouts || 0} entries
          </div>
        </div>
      </div>

      <!-- Main Layout: Logger Form (Left) & History Feed (Right) -->
      <div class="workout-logger-grid">
        <!-- New Activity Logger Card -->
        <div class="card" style="align-self: flex-start;">
          <h2 class="card-title">📝 Record Activity</h2>
          <p class="card-subtitle">Log your walking, running, cycling, or custom sports performance.</p>

          <form id="newLogForm" style="margin-top: 1.25rem;">
            <div class="form-group">
              <label for="logActivityType">Activity Sport</label>
              <select id="logActivityType" required>
                ${State.activities.map(a => `
                  <option value="${a.id}" data-unit="${a.primary_unit}" data-rate="${a.cal_per_unit}">
                    ${a.icon} ${a.name} (${a.primary_unit})
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="logDistance">Distance (km)</label>
                <input type="number" id="logDistance" step="0.1" min="0" required placeholder="e.g. 5.5">
              </div>
              <div class="form-group">
                <label for="logDuration">Duration (min)</label>
                <input type="number" id="logDuration" min="1" required placeholder="e.g. 35">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="logDate">Date Completed</label>
                <input type="date" id="logDate" required value="${new Date().toISOString().split('T')[0]}">
              </div>
              <div class="form-group">
                <label for="logCalories">Est. Calories</label>
                <input type="number" id="logCalories" placeholder="Auto-calculated">
              </div>
            </div>

            <div class="form-group">
              <label for="logNotes">Workout Notes</label>
              <input type="text" id="logNotes" placeholder="Morning pace, trail conditions, shoes...">
            </div>

            <!-- PRIVACY TOGGLE BOX (CRITICAL REQUIREMENT) -->
            <div class="privacy-toggle-box">
              <label class="toggle-switch-label" for="logIsPrivate">
                <input type="checkbox" id="logIsPrivate" class="toggle-checkbox">
                <span class="toggle-slider"></span>
                <div class="toggle-text">
                  <strong>🔒 Private Workout Option</strong>
                  <small>Creates an entry only you see. Boosts your personal shadow rank without appearing on the public leaderboard.</small>
                </div>
              </label>
            </div>

            <!-- Live Calculation Preview Card (HCI Visibility) -->
            <div id="liveCalcPreview" style="margin: 1rem 0; padding: 0.75rem; background: var(--bg-surface); border-radius: var(--radius-md); font-size: 0.8rem; display: flex; justify-content: space-between;">
              <span>Est. Pace: <strong id="previewPace">--</strong></span>
              <span>Estimated Score: <strong id="previewScore" style="color: var(--cyan-primary);">+0 pts</strong></span>
            </div>

            <button type="submit" class="btn btn-primary btn-block">
              💾 Record & Update Score
            </button>
          </form>
        </div>

        <!-- Personal Workout History Feed -->
        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">📜 My Personal Ledger</h2>
              <p class="card-subtitle">You have permission to edit or delete your own score records.</p>
            </div>
            <span class="metric-mono text-muted" style="font-size: 0.85rem;">${this.logs.length} Total Logs</span>
          </div>

          ${this.logs.length === 0 ? `
            <div style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
              No workouts logged yet. Use the form on the left to record your first activity!
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 0.85rem;">
              ${this.logs.map(log => this.renderLogItem(log)).join('')}
            </div>
          `}
        </div>
      </div>
    `;

    this.attachEventListeners(container);
  },

  renderLogItem(log) {
    const isPriv = log.is_private === 1;

    return `
      <div class="card" style="padding: 1rem 1.25rem; background: var(--bg-surface); border-left: 4px solid ${isPriv ? 'var(--rose-private)' : 'var(--cyan-primary)'};">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-size: 1.75rem;">${log.icon || '🏃'}</span>
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <strong style="font-size: 1rem; color: var(--text-highlight);">${log.activity_name}</strong>
                ${isPriv 
                  ? `<span class="badge-private-indicator">🔒 Private (Shadow Only)</span>` 
                  : `<span class="badge-you" style="background: rgba(6, 182, 212, 0.15);">🌐 Public</span>`}
                <span class="text-muted" style="font-size: 0.78rem;">&bull; ${log.date}</span>
              </div>
              ${log.notes ? `<p class="text-muted" style="font-size: 0.82rem; margin-top: 0.2rem;">"${log.notes}"</p>` : ''}
            </div>
          </div>

          <!-- Discrete Metrics -->
          <div style="display: flex; align-items: center; gap: 1.25rem;">
            <div style="text-align: right;">
              <div class="metric-mono" style="font-weight: 700; font-size: 1rem; color: var(--text-highlight);">
                ${log.distance} ${log.primary_unit}
              </div>
              <small class="text-muted">${log.duration_minutes} min &bull; ${log.pace}</small>
            </div>

            <!-- Ownership Actions (Edit & Delete) -->
            <div style="display: flex; gap: 0.35rem;">
              <button class="btn btn-secondary btn-sm btn-edit-log" data-log='${JSON.stringify(log)}' title="Edit your score">
                ✏️ Edit
              </button>
              <button class="btn btn-danger btn-sm btn-delete-log" data-id="${log.id}" title="Delete record">
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  attachEventListeners(container) {
    const form = container.querySelector('#newLogForm');
    const distInput = container.querySelector('#logDistance');
    const durInput = container.querySelector('#logDuration');
    const previewPace = container.querySelector('#previewPace');
    const previewScore = container.querySelector('#previewScore');

    function updatePreview() {
      const dist = parseFloat(distInput.value) || 0;
      const dur = parseInt(durInput.value, 10) || 0;

      if (dist > 0 && dur > 0) {
        const pace = dur / dist;
        const mins = Math.floor(pace);
        const secs = Math.round((pace - mins) * 60);
        previewPace.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs} /km`;
      } else {
        previewPace.textContent = '--';
      }

      const score = Math.round((dist * 10) + (dur * 0.25));
      previewScore.textContent = `+${score} pts`;
    }

    if (distInput && durInput) {
      distInput.addEventListener('input', updatePreview);
      durInput.addEventListener('input', updatePreview);
    }

    // Submit New Log
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          activity_type_id: form.logActivityType.value,
          distance: form.logDistance.value,
          duration_minutes: form.logDuration.value,
          date: form.logDate.value,
          calories: form.logCalories.value ? parseInt(form.logCalories.value, 10) : undefined,
          notes: form.logNotes.value,
          is_private: form.logIsPrivate.checked
        };

        try {
          const res = await API.logs.create(payload);
          showToast(res.message, 'success');
          form.reset();
          form.logDate.value = new Date().toISOString().split('T')[0];
          updatePreview();
          await this.render(container);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    // Delete Log
    container.querySelectorAll('.btn-delete-log').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (!confirm('Are you sure you want to delete this workout log?')) return;

        try {
          const res = await API.logs.delete(id);
          showToast(res.message, 'success');
          await this.render(container);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    // Edit Log Modal
    container.querySelectorAll('.btn-edit-log').forEach(btn => {
      btn.addEventListener('click', () => {
        const log = JSON.parse(btn.dataset.log);
        const modal = document.getElementById('editLogModal');
        const editForm = document.getElementById('editLogForm');

        editForm.editLogId.value = log.id;
        editForm.editDistance.value = log.distance;
        editForm.editDuration.value = log.duration_minutes;
        editForm.editDate.value = log.date;
        editForm.editCalories.value = log.calories || '';
        editForm.editNotes.value = log.notes || '';
        editForm.editIsPrivate.checked = log.is_private === 1;

        modal.classList.remove('hidden');
      });
    });
  }
};
