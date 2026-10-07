/**
 * ARCHON ADMIN CONSOLE
 * Allows platform administrators to define and provision new activity types
 */

const AdminView = {
  async render(container) {
    const user = State.currentUser;

    if (!user || user.role !== 'admin') {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 3rem 1.5rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🛡️</div>
          <h2 class="card-title" style="justify-content: center;">Admin Privileges Required</h2>
          <p class="card-subtitle" style="max-width: 450px; margin: 0.5rem auto 1.5rem;">
            Only platform administrators can create new activity types. Please log in with an administrator account.
          </p>
          <button class="btn btn-primary" onclick="document.querySelector('[data-user=\\'admin\\']').click()">
            👑 Switch to Demo Admin Account
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading activity catalogue and administrative controls...</p>
      </div>
    `;

    try {
      const res = await API.activities.getAll();
      State.setActivities(res.activities || []);
      this.renderContent(container);
    } catch (err) {
      container.innerHTML = `
        <div class="card error-card">
          <p>Failed to load activities: ${err.message}</p>
        </div>
      `;
    }
  },

  renderContent(container) {
    const activities = State.activities;

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: 400px 1fr; gap: 1.75rem;">
        <!-- Left Column: Add New Activity Form -->
        <div class="card" style="align-self: flex-start;">
          <h2 class="card-title">👑 Create New Activity</h2>
          <p class="card-subtitle">Expand the platform with any custom sport, discipline, or fitness format.</p>

          <form id="createActivityForm" style="margin-top: 1.25rem;">
            <div class="form-group">
              <label for="actName">Activity Name</label>
              <input type="text" id="actName" required placeholder="e.g. Trail Hiking or Kickboxing">
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="actIcon">Icon / Emoji</label>
                <input type="text" id="actIcon" required value="🏃" placeholder="e.g. 🥾, 🥊, 🎾, 🧘">
              </div>
              <div class="form-group">
                <label for="actUnit">Primary Unit</label>
                <select id="actUnit">
                  <option value="km">Kilometers (km)</option>
                  <option value="mi">Miles (mi)</option>
                  <option value="laps">Laps</option>
                  <option value="min">Minutes (min)</option>
                  <option value="reps">Reps</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label for="actCalRate">Estimated Calories per Unit</label>
              <input type="number" id="actCalRate" step="1" min="1" value="65" placeholder="e.g. 65">
            </div>

            <div class="form-group">
              <label for="actDesc">Description (optional)</label>
              <textarea id="actDesc" rows="3" placeholder="Explain the activity parameters or guidelines..."></textarea>
            </div>

            <button type="submit" class="btn btn-primary btn-block">
              ✨ Provision Activity Type
            </button>
          </form>
        </div>

        <!-- Right Column: Existing Activities Catalog -->
        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">📦 Activity Directory</h2>
              <p class="card-subtitle">Active sports available to all users across the platform.</p>
            </div>
            <span class="metric-mono text-muted" style="font-size: 0.85rem;">${activities.length} Types</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.85rem;">
            ${activities.map(act => `
              <div class="card" style="padding: 1rem 1.25rem; background: var(--bg-surface);">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
                  <div style="display: flex; align-items: center; gap: 0.85rem;">
                    <span style="font-size: 2rem;">${act.icon}</span>
                    <div>
                      <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <strong style="font-size: 1.05rem; color: var(--text-highlight);">${act.name}</strong>
                        ${act.is_system === 1 
                          ? '<span class="badge-you" style="background: rgba(99, 102, 241, 0.2); color: var(--indigo-accent); border-color: rgba(99, 102, 241, 0.3);">Core System</span>' 
                          : '<span class="badge-private-indicator" style="background: rgba(245, 158, 11, 0.2); color: var(--amber-gold); border-color: rgba(245, 158, 11, 0.4);">Custom Admin</span>'}
                      </div>
                      <p class="text-muted" style="font-size: 0.8rem; margin-top: 0.2rem;">
                        ${act.description || 'Standard tracking'} &bull; Base: ${act.cal_per_unit} kcal/${act.primary_unit}
                      </p>
                    </div>
                  </div>

                  <div>
                    ${act.is_system === 0 ? `
                      <button class="btn btn-danger btn-sm btn-delete-act" data-id="${act.id}" title="Remove custom activity">
                        🗑️ Delete
                      </button>
                    ` : `
                      <span class="text-muted" style="font-size: 0.75rem; font-style: italic;">Protected</span>
                    `}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners(container);
  },

  attachEventListeners(container) {
    const form = container.querySelector('#createActivityForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          name: form.actName.value,
          icon: form.actIcon.value,
          primary_unit: form.actUnit.value,
          cal_per_unit: form.actCalRate.value,
          description: form.actDesc.value
        };

        try {
          const res = await API.activities.create(payload);
          showToast(res.message, 'success');
          form.reset();
          await this.render(container);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    container.querySelectorAll('.btn-delete-act').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (!confirm('Are you sure you want to delete this custom activity?')) return;

        try {
          const res = await API.activities.delete(id);
          showToast(res.message, 'success');
          await this.render(container);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  }
};
