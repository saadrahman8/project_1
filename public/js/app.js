/**
 * ARCHON FITNESS APPLICATION CONTROLLER
 * Initializes views, authentication lifecycle, modals, and navigation
 */

document.addEventListener('DOMContentLoaded', async () => {
  const viewContainer = document.getElementById('viewContainer');
  const userControls = document.getElementById('userControls');
  const mainNav = document.getElementById('mainNav');
  const adminNavTab = document.getElementById('adminNavTab');

  // 1. Initial State Subscription
  State.subscribe((event, data) => {
    if (event === 'user_changed') {
      renderUserControls();
      updateNavVisibility();
      renderActiveView();
    } else if (event === 'view_changed') {
      updateNavActiveTab();
      renderActiveView();
    } else if (event === 'activities_loaded') {
      // Re-render if in admin or logs view
      if (['admin', 'logs'].includes(State.currentView)) {
        renderActiveView();
      }
    }
  });

  // 2. Load Session & Activities
  try {
    const actRes = await API.activities.getAll();
    State.setActivities(actRes.activities || []);
  } catch (e) {
    console.error('Failed to load activity types:', e);
  }

  const token = API.getToken();
  if (token) {
    try {
      const meRes = await API.auth.me();
      State.setUser(meRes.user);
    } catch (e) {
      console.warn('Session expired or invalid, signing out');
      API.clearToken();
      State.setUser(null);
    }
  } else {
    // Check if demo query param is set, or default to unauthenticated/guest
    State.setUser(null);
  }

  renderUserControls();
  updateNavVisibility();
  renderActiveView();

  // 3. Navigation Tab Switching
  mainNav.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const targetView = tab.dataset.view;
      State.setView(targetView);
    });
  });

  function updateNavActiveTab() {
    mainNav.querySelectorAll('.nav-tab').forEach(tab => {
      if (tab.dataset.view === State.currentView) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
  }

  function updateNavVisibility() {
    const user = State.currentUser;
    if (user && user.role === 'admin') {
      adminNavTab.classList.remove('hidden');
    } else {
      adminNavTab.classList.add('hidden');
      if (State.currentView === 'admin') {
        State.setView('leaderboard');
      }
    }
  }

  // 4. Render Active View
  async function renderActiveView() {
    switch (State.currentView) {
      case 'leaderboard':
        await LeaderboardView.render(viewContainer);
        break;
      case 'compare':
        await ComparisonView.render(viewContainer);
        break;
      case 'logs':
        await LogsView.render(viewContainer);
        break;
      case 'admin':
        await AdminView.render(viewContainer);
        break;
      case 'guide':
        GuideView.render(viewContainer);
        break;
      default:
        await LeaderboardView.render(viewContainer);
    }
  }

  // 5. User Controls (Header)
  function renderUserControls() {
    const user = State.currentUser;

    if (user) {
      userControls.innerHTML = `
        <div class="user-badge">
          <div class="avatar-circle" style="background-color: ${user.avatar_color}">
            ${user.display_name.charAt(0)}
          </div>
          <span class="user-name">${user.display_name}</span>
          <span class="role-tag ${user.role === 'admin' ? 'role-admin' : 'role-user'}">${user.role}</span>
        </div>
        <button class="btn btn-secondary btn-sm" id="logoutBtn" title="Sign out of current account">
          Sign Out
        </button>
      `;

      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          API.clearToken();
          State.setUser(null);
          showToast('Signed out successfully.', 'info');
        });
      }
    } else {
      userControls.innerHTML = `
        <button class="btn btn-secondary btn-sm" id="openLoginBtn">
          Sign In
        </button>
        <button class="btn btn-primary btn-sm" id="openRegisterBtn">
          Register
        </button>
      `;

      const openLogin = document.getElementById('openLoginBtn');
      const openReg = document.getElementById('openRegisterBtn');

      if (openLogin) {
        openLogin.addEventListener('click', () => {
          showAuthModal('login');
        });
      }

      if (openReg) {
        openReg.addEventListener('click', () => {
          showAuthModal('register');
        });
      }
    }
  }

  // 6. Auth Modal Logic
  const authModal = document.getElementById('authModal');
  const closeAuthModal = document.getElementById('closeAuthModal');
  const tabLoginBtn = document.getElementById('tabLoginBtn');
  const tabRegisterBtn = document.getElementById('tabRegisterBtn');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  function showAuthModal(mode = 'login') {
    authModal.classList.remove('hidden');
    if (mode === 'login') {
      tabLoginBtn.classList.add('active');
      tabRegisterBtn.classList.remove('active');
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
    } else {
      tabRegisterBtn.classList.add('active');
      tabLoginBtn.classList.remove('active');
      registerForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
    }
  }

  closeAuthModal.addEventListener('click', () => authModal.classList.add('hidden'));
  tabLoginBtn.addEventListener('click', () => showAuthModal('login'));
  tabRegisterBtn.addEventListener('click', () => showAuthModal('register'));

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = loginForm.loginIdentifier.value;
    const pwd = loginForm.loginPassword.value;

    try {
      const res = await API.auth.login(id, pwd);
      API.setToken(res.token);
      State.setUser(res.user);
      authModal.classList.add('hidden');
      loginForm.reset();
      showToast(`Welcome back, ${res.user.display_name}!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      display_name: registerForm.regDisplayName.value,
      username: registerForm.regUsername.value,
      email: registerForm.regEmail.value,
      password: registerForm.regPassword.value
    };

    try {
      const res = await API.auth.register(payload);
      API.setToken(res.token);
      State.setUser(res.user);
      authModal.classList.add('hidden');
      registerForm.reset();
      showToast('Account registered successfully!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // 7. Edit Log Modal Submission (Strict User Ownership)
  const editModal = document.getElementById('editLogModal');
  const closeEditModal = document.getElementById('closeEditModal');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const editForm = document.getElementById('editLogForm');

  function closeEdit() {
    editModal.classList.add('hidden');
  }

  closeEditModal.addEventListener('click', closeEdit);
  cancelEditBtn.addEventListener('click', closeEdit);

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const logId = editForm.editLogId.value;
    const payload = {
      distance: editForm.editDistance.value,
      duration_minutes: editForm.editDuration.value,
      date: editForm.editDate.value,
      calories: editForm.editCalories.value ? parseInt(editForm.editCalories.value, 10) : undefined,
      notes: editForm.editNotes.value,
      is_private: editForm.editIsPrivate.checked
    };

    try {
      const res = await API.logs.update(logId, payload);
      showToast(res.message, 'success');
      closeEdit();
      if (State.currentView === 'logs') {
        await LogsView.render(viewContainer);
      } else if (State.currentView === 'leaderboard') {
        await LeaderboardView.render(viewContainer);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // 8. Demo Quick Switcher Handlers
  document.querySelectorAll('.btn-demo').forEach(btn => {
    btn.addEventListener('click', async () => {
      const targetUsername = btn.dataset.user;
      const pwd = targetUsername === 'admin' ? 'Admin123!' : 'Password123!';

      try {
        const res = await API.auth.login(targetUsername, pwd);
        API.setToken(res.token);
        State.setUser(res.user);
        
        let msg = `Switched to ${res.user.display_name}!`;
        if (targetUsername === 'abc') {
          msg = `Logged in as User ABC! Notice you are ranked #8 in Personal view with private logs included.`;
        } else if (targetUsername === 'henry_fit') {
          msg = `Logged in as Henry! You are ranked #8 on the public board.`;
        }
        showToast(msg, 'success', 5000);
      } catch (e) {
        showToast(`Failed to switch demo user: ${e.message}`, 'error');
      }
    });
  });

  // 9. ESC Key listener to close open modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      authModal.classList.add('hidden');
      editModal.classList.add('hidden');
    }
  });
});
