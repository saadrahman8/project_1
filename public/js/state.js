/**
 * ARCHON STATE MANAGEMENT
 * Central store for session, navigation, filters, and UI notifications
 */

const State = {
  currentUser: null,
  currentView: 'leaderboard',
  activities: [],
  
  leaderboard: {
    activeTab: 'overall', // 'overall' or 'improvement'
    viewMode: 'personal', // 'personal' (shadow ranking with private logs) or 'public'
    selectedActivity: 'all',
    selectedTimeframe: 'all_time',
    sortBy: 'score'
  },

  listeners: [],

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  },

  notify(eventType, data) {
    this.listeners.forEach(fn => fn(eventType, data));
  },

  setUser(user) {
    this.currentUser = user;
    this.notify('user_changed', user);
  },

  setView(viewName) {
    this.currentView = viewName;
    this.notify('view_changed', viewName);
  },

  setActivities(list) {
    this.activities = list;
    this.notify('activities_loaded', list);
  },

  setLeaderboardViewMode(mode) {
    this.leaderboard.viewMode = mode;
    this.notify('leaderboard_view_changed', mode);
  },

  setLeaderboardTab(tab) {
    this.leaderboard.activeTab = tab;
    this.notify('leaderboard_tab_changed', tab);
  },

  setLeaderboardFilter(key, val) {
    this.leaderboard[key] = val;
    this.notify('leaderboard_filters_changed', { key, val });
  }
};

/**
 * Toast Notification Helper (HCI Visibility of System Status)
 */
function showToast(message, type = 'info', durationMs = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '⚠️';

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-msg">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 300ms ease';
    setTimeout(() => toast.remove(), 300);
  }, durationMs);
}
