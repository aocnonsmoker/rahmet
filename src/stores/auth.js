import { defineStore } from 'pinia';
import { apiFetch, AUTH_STORAGE_KEY } from '@/services/api';

function loadPersisted() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => {
    const persisted = loadPersisted();
    return {
      token: persisted?.token || null,
      username: persisted?.username || null,
      role: persisted?.role || null,
      sections: persisted?.sections || [],
      readOnly: persisted?.readOnly || false,
      tenantName: persisted?.tenantName || null,
      subscriptionStatus: persisted?.subscriptionStatus || null,
    };
  },
  getters: {
    isAuthenticated: (state) => !!state.token,
    isOwner: (state) => state.role === 'owner',
    // Owner always has full write access; read_only only limits employees.
    canWrite: (state) => state.role === 'owner' || !state.readOnly,
    isSubscriptionActive: (state) => ['active', 'trial'].includes(state.subscriptionStatus),
    hasSection: (state) => (section) => state.role === 'owner' || state.sections.includes(section),
  },
  actions: {
    _persist() {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
        token: this.token,
        username: this.username,
        role: this.role,
        sections: this.sections,
        readOnly: this.readOnly,
        tenantName: this.tenantName,
        subscriptionStatus: this.subscriptionStatus,
      }));
    },
    async login(tenantSlug, username, password) {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        skipAuth: true,
        body: { tenant_slug: tenantSlug, username, password },
      });
      this.token = data.access_token;
      this.username = username;
      this.role = data.role;
      this.sections = data.sections;
      this.readOnly = data.read_only;
      this.tenantName = data.tenant_name;
      this.subscriptionStatus = data.subscription_status;
      this._persist();
    },
    async restoreSession() {
      if (!this.token) return;
      try {
        const me = await apiFetch('/auth/me');
        this.username = me.username;
        this.role = me.role;
        this.sections = me.sections;
        this.readOnly = me.read_only;
        this.tenantName = me.tenant_name;
        this.subscriptionStatus = me.subscription_status;
        this._persist();
      } catch {
        this.logout();
      }
    },
    logout() {
      this.token = null;
      this.username = null;
      this.role = null;
      this.sections = [];
      this.readOnly = false;
      this.tenantName = null;
      this.subscriptionStatus = null;
      localStorage.removeItem(AUTH_STORAGE_KEY);
    },
  },
});
