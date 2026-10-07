/**
 * ARCHON USER-BASED COMPARISON VIEW
 * Side-by-side Head-to-Head analytics between any two athletes
 */

const ComparisonView = {
  presetTargetUser: null,
  data: null,
  user1Id: null,
  user2Id: null,
  allUsers: [],

  async render(container) {
    container.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading head-to-head comparison telemetry...</p>
      </div>
    `;

    try {
      // Load leaderboard to get list of users
      const lb = await API.leaderboard.get({ view: 'personal' });
      this.allUsers = lb.leaderboard || [];

      // Determine default comparison pair
      const me = State.currentUser;
      if (me) {
        this.user1Id = me.id;
        // User 2: either preset, or top ranked athlete who is not me
        if (this.presetTargetUser && parseInt(this.presetTargetUser, 10) !== me.id) {
          this.user2Id = parseInt(this.presetTargetUser, 10);
        } else {
          const other = this.allUsers.find(u => u.userId !== me.id);
          this.user2Id = other ? other.userId : (this.allUsers[0]?.userId || 1);
        }
      } else {
        this.user1Id = this.allUsers[0]?.userId || 1;
        this.user2Id = this.allUsers[1]?.userId || 2;
      }

      this.presetTargetUser = null; // reset preset

      await this.loadComparison();
      this.renderContent(container);
    } catch (err) {
      container.innerHTML = `
        <div class="card error-card">
          <p>Error loading comparison: ${err.message}</p>
        </div>
      `;
    }
  },

  async loadComparison() {
    if (!this.user1Id || !this.user2Id) return;
    this.data = await API.stats.compare(this.user1Id, this.user2Id);
  },

  renderContent(container) {
    if (!this.data) return;

    const u1 = this.data.user1;
    const u2 = this.data.user2;
    const h2h = this.data.headToHead;

    // Progress bar math
    const totalDist = (u1.overall.totalDistance + u2.overall.totalDistance) || 1;
    const u1DistPct = Math.round((u1.overall.totalDistance / totalDist) * 100);
    const u2DistPct = 100 - u1DistPct;

    const totalDur = (u1.overall.totalDuration + u2.overall.totalDuration) || 1;
    const u1DurPct = Math.round((u1.overall.totalDuration / totalDur) * 100);
    const u2DurPct = 100 - u1DurPct;

    const totalWorkouts = (u1.overall.totalWorkouts + u2.overall.totalWorkouts) || 1;
    const u1WorkoutsPct = Math.round((u1.overall.totalWorkouts / totalWorkouts) * 100);
    const u2WorkoutsPct = 100 - u1WorkoutsPct;

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">⚡ Head-to-Head Athlete Comparison</h2>
            <p class="card-subtitle">Select any two community members for side-by-side discrete and ratio benchmarking.</p>
          </div>
        </div>

        <!-- Selector Row -->
        <div class="controls-toolbar" style="margin-bottom: 1.5rem;">
          <div class="filter-group">
            <label for="selectUser1" class="filter-label">Athlete A:</label>
            <select id="selectUser1" class="filter-select">
              ${this.allUsers.map(u => `
                <option value="${u.userId}" ${u.userId === this.user1Id ? 'selected' : ''}>
                  ${u.displayName} (@${u.username})
                </option>
              `).join('')}
            </select>
          </div>

          <div class="filter-group">
            <label for="selectUser2" class="filter-label">Athlete B:</label>
            <select id="selectUser2" class="filter-select">
              ${this.allUsers.map(u => `
                <option value="${u.userId}" ${u.userId === this.user2Id ? 'selected' : ''}>
                  ${u.displayName} (@${u.username})
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- Athletes Comparison Cards & VS Circle -->
        <div class="comparison-grid">
          <!-- Athlete 1 Card -->
          <div class="comparison-user-card" style="border-top: 4px solid var(--cyan-primary);">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div class="avatar-circle" style="background-color: ${u1.user.avatar_color}; width: 50px; height: 50px; font-size: 1.3rem;">
                ${u1.user.display_name.charAt(0)}
              </div>
              <div>
                <h3 style="font-size: 1.15rem; font-weight: 700;">${u1.user.display_name}</h3>
                <span class="text-muted" style="font-size: 0.8rem;">@${u1.user.username} ${u1.isOwner ? '<span class="badge-you">You</span>' : ''}</span>
              </div>
            </div>

            <div style="margin-top: 0.5rem; text-align: center; background: var(--bg-elevated); padding: 0.75rem; border-radius: var(--radius-md);">
              <span class="text-muted" style="font-size: 0.75rem; text-transform: uppercase;">Fitness Score</span>
              <div class="metric-mono" style="font-size: 1.5rem; color: var(--cyan-primary); font-weight: 800;">
                ${u1.overall.score.toLocaleString()} pts
              </div>
            </div>

            <!-- Discrete Stats -->
            <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.88rem;">
              <div style="display: flex; justify-content: space-between;">
                <span class="text-muted">Total Distance:</span>
                <strong>${u1.overall.totalDistance} km</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span class="text-muted">Total Active Time:</span>
                <strong>${Math.floor(u1.overall.totalDuration / 60)}h ${u1.overall.totalDuration % 60}m</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span class="text-muted">Workouts:</span>
                <strong>${u1.overall.totalWorkouts} sessions</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span class="text-muted">Consistency Ratio:</span>
                <strong>${Math.round((u1.improvement.ratios.currentConsistencyRatio || 0) * 100)}%</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span class="text-muted">Growth Ratio (%):</span>
                <span class="ratio-badge ${u1.improvement.ratios.distancePercentChange >= 0 ? 'ratio-up' : 'ratio-down'}">
                  ${u1.improvement.ratios.distancePercentChange >= 0 ? '+' : ''}${u1.improvement.ratios.distancePercentChange}%
                </span>
              </div>
            </div>
          </div>

          <!-- VS Centerpiece -->
          <div class="comparison-vs-badge">
            <div class="vs-circle">VS</div>
          </div>

          <!-- Athlete 2 Card -->
          <div class="comparison-user-card" style="border-top: 4px solid var(--indigo-accent);">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div class="avatar-circle" style="background-color: ${u2.user.avatar_color}; width: 50px; height: 50px; font-size: 1.3rem;">
                ${u2.user.display_name.charAt(0)}
              </div>
              <div>
                <h3 style="font-size: 1.15rem; font-weight: 700;">${u2.user.display_name}</h3>
                <span class="text-muted" style="font-size: 0.8rem;">@${u2.user.username} ${u2.isOwner ? '<span class="badge-you">You</span>' : ''}</span>
              </div>
            </div>

            <div style="margin-top: 0.5rem; text-align: center; background: var(--bg-elevated); padding: 0.75rem; border-radius: var(--radius-md);">
              <span class="text-muted" style="font-size: 0.75rem; text-transform: uppercase;">Fitness Score</span>
              <div class="metric-mono" style="font-size: 1.5rem; color: var(--indigo-accent); font-weight: 800;">
                ${u2.overall.score.toLocaleString()} pts
              </div>
            </div>

            <!-- Discrete Stats -->
            <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.88rem;">
              <div style="display: flex; justify-content: space-between;">
                <span class="text-muted">Total Distance:</span>
                <strong>${u2.overall.totalDistance} km</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span class="text-muted">Total Active Time:</span>
                <strong>${Math.floor(u2.overall.totalDuration / 60)}h ${u2.overall.totalDuration % 60}m</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span class="text-muted">Workouts:</span>
                <strong>${u2.overall.totalWorkouts} sessions</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span class="text-muted">Consistency Ratio:</span>
                <strong>${Math.round((u2.improvement.ratios.currentConsistencyRatio || 0) * 100)}%</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span class="text-muted">Growth Ratio (%):</span>
                <span class="ratio-badge ${u2.improvement.ratios.distancePercentChange >= 0 ? 'ratio-up' : 'ratio-down'}">
                  ${u2.improvement.ratios.distancePercentChange >= 0 ? '+' : ''}${u2.improvement.ratios.distancePercentChange}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Comparative Metrics & Relative Progress Bars -->
        <div style="margin-top: 2rem;">
          <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1.25rem;">📊 Comparative Ratio Breakdown</h3>

          <!-- Distance Bar -->
          <div class="metric-comparison-row">
            <div class="metric-comparison-header">
              <span><strong>${u1.user.display_name}:</strong> ${u1.overall.totalDistance} km</span>
              <span><strong>Distance Ratio:</strong> ${h2h.ratios.distanceRatio}x (Δ ${h2h.discrete.distanceDelta > 0 ? '+' : ''}${h2h.discrete.distanceDelta} km)</span>
              <span><strong>${u2.user.display_name}:</strong> ${u2.overall.totalDistance} km</span>
            </div>
            <div class="comparison-bar-track">
              <div class="comparison-bar-u1" style="width: ${u1DistPct}%;"></div>
              <div class="comparison-bar-u2" style="width: ${u2DistPct}%;"></div>
            </div>
          </div>

          <!-- Duration Bar -->
          <div class="metric-comparison-row">
            <div class="metric-comparison-header">
              <span><strong>${u1.user.display_name}:</strong> ${Math.floor(u1.overall.totalDuration / 60)}h ${u1.overall.totalDuration % 60}m</span>
              <span><strong>Duration Ratio:</strong> ${h2h.ratios.durationRatio}x (Δ ${h2h.discrete.durationDelta > 0 ? '+' : ''}${h2h.discrete.durationDelta} min)</span>
              <span><strong>${u2.user.display_name}:</strong> ${Math.floor(u2.overall.totalDuration / 60)}h ${u2.overall.totalDuration % 60}m</span>
            </div>
            <div class="comparison-bar-track">
              <div class="comparison-bar-u1" style="width: ${u1DurPct}%;"></div>
              <div class="comparison-bar-u2" style="width: ${u2DurPct}%;"></div>
            </div>
          </div>

          <!-- Workouts Bar -->
          <div class="metric-comparison-row">
            <div class="metric-comparison-header">
              <span><strong>${u1.user.display_name}:</strong> ${u1.overall.totalWorkouts} sessions</span>
              <span><strong>Workouts Delta:</strong> ${h2h.discrete.workoutsDelta > 0 ? '+' : ''}${h2h.discrete.workoutsDelta}</span>
              <span><strong>${u2.user.display_name}:</strong> ${u2.overall.totalWorkouts} sessions</span>
            </div>
            <div class="comparison-bar-track">
              <div class="comparison-bar-u1" style="width: ${u1WorkoutsPct}%;"></div>
              <div class="comparison-bar-u2" style="width: ${u2WorkoutsPct}%;"></div>
            </div>
          </div>
        </div>

        <!-- Category Leaders Table -->
        <div style="margin-top: 2rem;">
          <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.75rem;">🏆 Category Honors</h3>
          <div class="table-responsive">
            <table class="leaderboard-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Honor Leader</th>
                  <th>Competitive Delta</th>
                </tr>
              </thead>
              <tbody>
                ${h2h.categories.map(c => `
                  <tr>
                    <td><strong>${c.name}</strong></td>
                    <td>
                      <span class="badge-you" style="background: rgba(16, 185, 129, 0.15); color: var(--emerald-success); border-color: rgba(16, 185, 129, 0.3);">
                        🏆 ${c.leader}
                      </span>
                    </td>
                    <td class="text-muted">
                      ${c.name === 'Total Distance' ? `${Math.abs(h2h.discrete.distanceDelta)} km difference` : ''}
                      ${c.name === 'Active Duration' ? `${Math.abs(h2h.discrete.durationDelta)} min difference` : ''}
                      ${c.name === 'Workout Frequency' ? `${Math.abs(h2h.discrete.workoutsDelta)} workouts difference` : ''}
                      ${c.name === 'Overall Fitness Score' ? `${Math.abs(h2h.discrete.scoreDelta)} pts difference` : ''}
                      ${c.name === 'Recent Growth %' ? `${Math.abs(u1.improvement.ratios.distancePercentChange - u2.improvement.ratios.distancePercentChange).toFixed(1)}% ratio gap` : ''}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners(container);
  },

  attachEventListeners(container) {
    const s1 = container.querySelector('#selectUser1');
    const s2 = container.querySelector('#selectUser2');

    if (s1 && s2) {
      s1.addEventListener('change', async (e) => {
        this.user1Id = parseInt(e.target.value, 10);
        await this.loadComparison();
        this.renderContent(container);
      });

      s2.addEventListener('change', async (e) => {
        this.user2Id = parseInt(e.target.value, 10);
        await this.loadComparison();
        this.renderContent(container);
      });
    }
  }
};
