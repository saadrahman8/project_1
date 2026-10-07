/**
 * ARCHON LEADERBOARD VIEW
 * Handles public ranking, shadow personal ranking (private inputs),
 * and discrete number / ratio improvement statistics.
 */

const LeaderboardView = {
  data: null,

  async render(container) {
    container.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Calculating leaderboard & discrete delta ratios...</p>
      </div>
    `;

    try {
      await this.loadData();
      this.renderContent(container);
    } catch (err) {
      container.innerHTML = `
        <div class="card error-card">
          <p>Failed to load leaderboard data: ${err.message}</p>
          <button class="btn btn-secondary btn-sm" onclick="LeaderboardView.render(document.getElementById('viewContainer'))">Retry</button>
        </div>
      `;
    }
  },

  async loadData() {
    const params = {
      activity: State.leaderboard.selectedActivity,
      timeframe: State.leaderboard.selectedTimeframe,
      sort: State.leaderboard.sortBy,
      view: State.leaderboard.viewMode
    };

    this.data = await API.leaderboard.get(params);
  },

  renderContent(container) {
    const user = State.currentUser;
    const isPersonal = this.data.activeView === 'personal';
    const ranks = this.data.ranks || {};
    const list = this.data.leaderboard || [];

    // Top 3 for podium
    const top3 = list.slice(0, 3);

    container.innerHTML = `
      <!-- Privacy Shadow Rank Hero Banner -->
      <section class="privacy-banner" aria-label="Privacy Standing Status">
        <div class="privacy-banner-content">
          <div class="privacy-banner-icon">${isPersonal ? '🔒' : '🌐'}</div>
          <div class="privacy-banner-text">
            <h3>
              ${isPersonal 
                ? 'Personal Shadow Board Active <span class="badge-private-indicator">🔒 Private Data Included</span>' 
                : 'Public Board Active <span class="badge-you">🌐 Public Consensus View</span>'}
            </h3>
            <p>
              ${user 
                ? (isPersonal 
                    ? `You are viewing your <strong>Personal Rank (#${ranks.personalRank || '--'})</strong>. Your private entries boost your standing here, but are completely hidden from public view. Other users see the 9th athlete shifted into 8th place.`
                    : `You are viewing what <strong>all other users and guests see</strong>. Any private workouts logged by users are strictly omitted from this leaderboard.`)
                : 'Showing the official public leaderboard. Sign in to view your personalized rank with private workouts included.'}
            </p>
          </div>
        </div>

        ${user ? `
          <div class="view-toggle-group">
            <button class="view-toggle-btn personal ${isPersonal ? 'active' : ''}" id="togglePersonalViewBtn">
              🔒 My Personal View
            </button>
            <button class="view-toggle-btn public ${!isPersonal ? 'active' : ''}" id="togglePublicViewBtn">
              🌐 Public View
            </button>
          </div>
        ` : ''}
      </section>

      <!-- Main Controls Toolbar (HCI Flexibility & Recognition) -->
      <div class="controls-toolbar">
        <div class="filter-group">
          <span class="filter-label">Mode:</span>
          <button class="filter-pill ${State.leaderboard.activeTab === 'overall' ? 'active' : ''}" data-tab="overall">
            🏆 Overall Standings
          </button>
          <button class="filter-pill ${State.leaderboard.activeTab === 'improvement' ? 'active' : ''}" data-tab="improvement">
            📈 Discrete & Ratio Improvement
          </button>
        </div>

        <div class="filter-group">
          <span class="filter-label">Activity:</span>
          <select id="leaderboardActivityFilter" class="filter-select">
            <option value="all" ${State.leaderboard.selectedActivity === 'all' ? 'selected' : ''}>All Activities</option>
            ${State.activities.map(a => `
              <option value="${a.slug}" ${State.leaderboard.selectedActivity === a.slug ? 'selected' : ''}>
                ${a.icon} ${a.name}
              </option>
            `).join('')}
          </select>

          <span class="filter-label">Sort:</span>
          <select id="leaderboardSortFilter" class="filter-select">
            <option value="score" ${State.leaderboard.sortBy === 'score' ? 'selected' : ''}>Overall Score</option>
            <option value="distance" ${State.leaderboard.sortBy === 'distance' ? 'selected' : ''}>Total Distance</option>
            <option value="improvement_ratio" ${State.leaderboard.sortBy === 'improvement_ratio' ? 'selected' : ''}>Growth Ratio (%)</option>
            <option value="improvement_delta" ${State.leaderboard.sortBy === 'improvement_delta' ? 'selected' : ''}>Discrete Gain (Δ km)</option>
          </select>
        </div>
      </div>

      <!-- Top 3 Athletes Podium -->
      ${top3.length > 0 ? this.renderPodium(top3) : ''}

      <!-- Detailed Ranking Table -->
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">
              ${State.leaderboard.activeTab === 'overall' ? 'Athletic Volume & Score Ranking' : 'Growth Velocity & Ratio Analytics'}
            </h2>
            <p class="card-subtitle">
              ${isPersonal 
                ? 'Showing your personalized positioning including private activity records.' 
                : 'Showing verified public workouts across all community members.'}
            </p>
          </div>
          <span class="metric-mono text-muted" style="font-size: 0.8rem;">${list.length} Athletes Ranked</span>
        </div>

        <div class="table-responsive">
          <table class="leaderboard-table">
            <thead>
              ${State.leaderboard.activeTab === 'overall' ? `
                <tr>
                  <th>Rank</th>
                  <th>Athlete</th>
                  <th>Total Distance</th>
                  <th>Active Time</th>
                  <th>Workouts</th>
                  <th>Avg Pace</th>
                  <th>Fitness Score</th>
                  <th>Compare</th>
                </tr>
              ` : `
                <tr>
                  <th>Rank</th>
                  <th>Athlete</th>
                  <th>Discrete Gain (Δ Distance)</th>
                  <th>Growth Ratio (%)</th>
                  <th>Consistency Ratio</th>
                  <th>Recent / Prior Workouts</th>
                  <th>Improvement Score</th>
                  <th>Compare</th>
                </tr>
              `}
            </thead>
            <tbody>
              ${list.map(athlete => this.renderTableRow(athlete)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.attachEventListeners(container);
  },

  renderPodium(top3) {
    const p1 = top3[0];
    const p2 = top3[1];
    const p3 = top3[2];

    return `
      <div class="podium-container">
        <!-- 2nd Place -->
        ${p2 ? `
          <div class="podium-card podium-2">
            <div class="podium-rank-badge">2</div>
            <div class="avatar-circle" style="background-color: ${p2.avatarColor}; margin: 0 auto 0.5rem; width: 44px; height: 44px; font-size: 1.2rem;">
              ${p2.displayName.charAt(0)}
            </div>
            <div class="podium-name">${p2.displayName}</div>
            <div class="podium-score">${p2.overall.score.toLocaleString()} pts</div>
            <div class="podium-metrics">
              <span><strong>${p2.overall.totalDistance}</strong> km</span>
              <span>&bull;</span>
              <span><strong>${p2.overall.totalWorkouts}</strong> workouts</span>
            </div>
          </div>
        ` : '<div></div>'}

        <!-- 1st Place -->
        ${p1 ? `
          <div class="podium-card podium-1">
            <div class="podium-rank-badge">🏆 1</div>
            <div class="avatar-circle" style="background-color: ${p1.avatarColor}; margin: 0 auto 0.6rem; width: 54px; height: 54px; font-size: 1.4rem; box-shadow: 0 0 20px rgba(251, 191, 36, 0.4);">
              ${p1.displayName.charAt(0)}
            </div>
            <div class="podium-name" style="font-size: 1.2rem;">${p1.displayName}</div>
            <div class="podium-score" style="font-size: 1.6rem; color: var(--amber-gold);">${p1.overall.score.toLocaleString()} pts</div>
            <div class="podium-metrics">
              <span><strong>${p1.overall.totalDistance}</strong> km</span>
              <span>&bull;</span>
              <span><strong>${p1.overall.totalWorkouts}</strong> workouts</span>
            </div>
          </div>
        ` : '<div></div>'}

        <!-- 3rd Place -->
        ${p3 ? `
          <div class="podium-card podium-3">
            <div class="podium-rank-badge">3</div>
            <div class="avatar-circle" style="background-color: ${p3.avatarColor}; margin: 0 auto 0.5rem; width: 44px; height: 44px; font-size: 1.2rem;">
              ${p3.displayName.charAt(0)}
            </div>
            <div class="podium-name">${p3.displayName}</div>
            <div class="podium-score">${p3.overall.score.toLocaleString()} pts</div>
            <div class="podium-metrics">
              <span><strong>${p3.overall.totalDistance}</strong> km</span>
              <span>&bull;</span>
              <span><strong>${p3.overall.totalWorkouts}</strong> workouts</span>
            </div>
          </div>
        ` : '<div></div>'}
      </div>
    `;
  },

  renderTableRow(athlete) {
    const isOverall = State.leaderboard.activeTab === 'overall';
    const isMe = athlete.isCurrentUser;
    const hasPrivate = athlete.hasPrivateWorkoutsIncluded;
    const imp = athlete.improvement;

    const rowClass = `leaderboard-row ${isMe ? 'current-user-row' : ''} ${hasPrivate ? 'shadow-user-row' : ''} rank-${athlete.rank}`;

    if (isOverall) {
      return `
        <tr class="${rowClass}">
          <td class="rank-cell">
            <span class="rank-number">#${athlete.rank}</span>
          </td>
          <td>
            <div class="user-cell-content">
              <div class="avatar-circle" style="background-color: ${athlete.avatarColor}">
                ${athlete.displayName.charAt(0)}
              </div>
              <div class="user-cell-meta">
                <span class="user-cell-name">
                  ${athlete.displayName}
                  ${isMe ? '<span class="badge-you">You</span>' : ''}
                  ${hasPrivate ? `<span class="badge-private-indicator" title="Your ${athlete.privateWorkoutsCount} private workouts are included for your eyes only">🔒 Private Logs (${athlete.privateWorkoutsCount})</span>` : ''}
                </span>
                <span class="user-cell-sub">@${athlete.username}</span>
              </div>
            </div>
          </td>
          <td class="metric-mono"><strong>${athlete.overall.totalDistance}</strong> km</td>
          <td class="metric-mono">${Math.floor(athlete.overall.totalDuration / 60)}h ${athlete.overall.totalDuration % 60}m</td>
          <td class="metric-mono">${athlete.overall.totalWorkouts} sessions</td>
          <td class="metric-mono text-muted">${athlete.overall.pace}</td>
          <td class="metric-mono">
            <span style="color: var(--cyan-primary); font-weight: 700;">${athlete.overall.score.toLocaleString()}</span>
          </td>
          <td>
            <button class="btn btn-secondary btn-sm btn-compare-user" data-user-id="${athlete.userId}" title="Compare head-to-head with this athlete">
              ⚡ Compare
            </button>
          </td>
        </tr>
      `;
    } else {
      // Improvement View (Discrete numbers and ratios)
      const deltaDist = imp.discrete.deltaDistance;
      const distSign = deltaDist >= 0 ? '+' : '';
      const distClass = deltaDist > 0 ? 'delta-positive' : (deltaDist < 0 ? 'delta-negative' : 'delta-neutral');

      const pctChange = imp.ratios.distancePercentChange;
      const ratioSign = pctChange >= 0 ? '+' : '';
      const ratioClass = pctChange >= 0 ? 'ratio-up' : 'ratio-down';

      return `
        <tr class="${rowClass}">
          <td class="rank-cell">
            <span class="rank-number">#${athlete.rank}</span>
          </td>
          <td>
            <div class="user-cell-content">
              <div class="avatar-circle" style="background-color: ${athlete.avatarColor}">
                ${athlete.displayName.charAt(0)}
              </div>
              <div class="user-cell-meta">
                <span class="user-cell-name">
                  ${athlete.displayName}
                  ${isMe ? '<span class="badge-you">You</span>' : ''}
                  ${hasPrivate ? `<span class="badge-private-indicator">🔒 Private Logs</span>` : ''}
                </span>
                <span class="user-cell-sub">@${athlete.username}</span>
              </div>
            </div>
          </td>
          <td class="metric-mono">
            <span class="${distClass}">${distSign}${deltaDist} km</span>
            <small class="text-muted" style="display: block; font-size: 0.72rem;">${athlete.currentPeriod.distance} vs ${athlete.previousPeriod.distance} km</small>
          </td>
          <td>
            <span class="ratio-badge ${ratioClass}">${ratioSign}${pctChange}%</span>
            <small class="text-muted" style="display: block; font-size: 0.72rem;">${imp.ratios.distanceRatio}x ratio</small>
          </td>
          <td class="metric-mono">
            <strong>${Math.round(imp.ratios.currentConsistencyRatio * 100)}%</strong>
            <small class="text-muted" style="display: block; font-size: 0.72rem;">${athlete.currentPeriod.activeDays} of 7 active days</small>
          </td>
          <td class="metric-mono">
            ${athlete.currentPeriod.workouts} / ${athlete.previousPeriod.workouts}
          </td>
          <td class="metric-mono">
            <strong style="color: var(--emerald-success);">${imp.improvementScore > 0 ? '+' : ''}${imp.improvementScore}</strong>
          </td>
          <td>
            <button class="btn btn-secondary btn-sm btn-compare-user" data-user-id="${athlete.userId}">
              ⚡ Compare
            </button>
          </td>
        </tr>
      `;
    }
  },

  attachEventListeners(container) {
    // Toggle View (Personal vs Public)
    const togglePersonal = container.querySelector('#togglePersonalViewBtn');
    if (togglePersonal) {
      togglePersonal.addEventListener('click', () => {
        State.setLeaderboardViewMode('personal');
        this.render(container);
      });
    }

    const togglePublic = container.querySelector('#togglePublicViewBtn');
    if (togglePublic) {
      togglePublic.addEventListener('click', () => {
        State.setLeaderboardViewMode('public');
        this.render(container);
      });
    }

    // Tab buttons (Overall vs Improvement)
    container.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        State.setLeaderboardTab(btn.dataset.tab);
        this.render(container);
      });
    });

    // Filters
    const actFilter = container.querySelector('#leaderboardActivityFilter');
    if (actFilter) {
      actFilter.addEventListener('change', (e) => {
        State.setLeaderboardFilter('selectedActivity', e.target.value);
        this.render(container);
      });
    }

    const sortFilter = container.querySelector('#leaderboardSortFilter');
    if (sortFilter) {
      sortFilter.addEventListener('change', (e) => {
        State.setLeaderboardFilter('sortBy', e.target.value);
        this.render(container);
      });
    }

    // Compare user buttons
    container.querySelectorAll('.btn-compare-user').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetUserId = btn.dataset.userId;
        ComparisonView.presetTargetUser = targetUserId;
        State.setView('compare');
      });
    });
  }
};
