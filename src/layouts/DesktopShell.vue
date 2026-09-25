<template>
  <ion-page class="shell">
    <aside class="sidebar">
      <div class="brand-row">
        <div class="brand">jmb</div>
        <button type="button" class="bell-btn" @click="openWarnings">
          <ion-icon :icon="bellIcon"></ion-icon>
          <span v-if="warnings.length" class="bell-badge">{{ warnings.length > 99 ? '99+' : warnings.length }}</span>
        </button>
      </div>

      <nav class="nav-list">
        <router-link
          v-for="s in visibleSections"
          :key="s.key"
          :to="`/tabs/${s.key}`"
          class="nav-item"
          :class="{ active: currentSectionKey === s.key }"
        >
          <span class="nav-dot" :style="{ background: s.color }"></span>
          {{ s.label }}
        </router-link>

        <router-link
          v-if="auth.isOwner"
          to="/tabs/cash"
          class="nav-item"
          :class="{ active: $route.path === '/tabs/cash' }"
        >
          <span class="nav-dot nav-dot-neutral"></span>
          Касса
        </router-link>

        <router-link
          v-if="auth.isOwner"
          to="/tabs/settings"
          class="nav-item"
          :class="{ active: $route.path === '/tabs/settings' }"
        >
          <span class="nav-dot nav-dot-neutral"></span>
          Настройки
        </router-link>

        <router-link
          v-if="auth.isOwner"
          to="/tabs/audit-log"
          class="nav-item"
          :class="{ active: $route.path === '/tabs/audit-log' }"
        >
          <span class="nav-dot nav-dot-neutral"></span>
          Журнал событий
        </router-link>
      </nav>

      <button type="button" class="user-chip" @click="onLogout">
        <span class="user-avatar">{{ userInitial }}</span>
        <span class="user-info">
          <span class="user-name">{{ auth.username }}</span>
          <span class="user-role">{{ auth.isOwner ? 'Владелец' : 'Сотрудник' }}</span>
        </span>
        <ion-icon class="logout-icon" :icon="logOutIcon"></ion-icon>
      </button>
    </aside>

    <main class="content">
      <ion-router-outlet></ion-router-outlet>
    </main>

    <DesktopModal v-model="showWarningsModal" title="Предупреждения по абонементам">
      <div v-if="warningsLoading" class="warn-empty">Загрузка…</div>
      <div v-else-if="!warnings.length" class="warn-empty">Предупреждений нет</div>
      <div v-else class="warn-list">
        <button
          v-for="w in warnings"
          :key="w.membership_id"
          type="button"
          class="warn-row"
          @click="goToWarning(w)"
        >
          <span class="warn-status-pill" :class="w.status">{{ w.status_label }}</span>
          <span class="warn-body">
            <span class="warn-name">{{ w.client_name }}</span>
            <span class="warn-meta">
              {{ w.section_label }}<span v-if="w.group_labels"> · {{ w.group_labels }}</span>
              <template v-if="w.status === 'expiring'"> · до {{ formatWarnDate(w.end_date) }}</template>
            </span>
          </span>
        </button>
      </div>
      <template #footer>
        <button type="button" class="warn-refresh-btn" @click="loadWarnings">Обновить</button>
      </template>
    </DesktopModal>
  </ion-page>
</template>

<script>
import moment from 'moment';
import { IonPage, IonRouterOutlet, IonIcon } from '@ionic/vue';
import { logOutOutline, notificationsOutline } from 'ionicons/icons';
import DesktopModal from '@/components/desktop/DesktopModal.vue';
import { apiFetch } from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { useSectionsStore } from '@/stores/sections';
import { showConfirm } from '@/services/dialogs';

// Sidebar nav-dot needs a per-section color; sections don't carry one of
// their own (that's a resource-level concept), so we cycle a fixed palette
// by position — same idea as CHART_PALETTE in Cash.vue.
const NAV_COLORS = ['#2196f3', '#4caf50', '#ff9800', '#e91e63', '#9c27b0', '#009688', '#795548'];

export default {
  name: 'DesktopShell',
  components: { IonPage, IonRouterOutlet, IonIcon, DesktopModal },
  data() {
    return {
      auth: useAuthStore(),
      logOutIcon: logOutOutline,
      bellIcon: notificationsOutline,
      showWarningsModal: false,
      warningsLoading: false,
      warnings: [],
    };
  },
  computed: {
    visibleSections() {
      const sections = useSectionsStore();
      return sections.items
        .filter((s) => s.enabled && this.auth.hasSection(s.key))
        .map((s, i) => ({ ...s, color: NAV_COLORS[i % NAV_COLORS.length] }));
    },
    currentSectionKey() {
      return this.$route.params.sectionKey || null;
    },
    userInitial() {
      return (this.auth.username || '?').charAt(0).toUpperCase();
    },
  },
  async created() {
    await useSectionsStore().load();
    await this.loadWarnings();
  },
  methods: {
    async onLogout() {
      const ok = await showConfirm('Вы точно хотите выйти?', { header: 'Выход', confirmText: 'Выйти' });
      if (ok) {
        this.auth.logout();
        this.$router.replace('/login');
      }
    },
    async loadWarnings() {
      this.warningsLoading = true;
      try {
        this.warnings = await apiFetch('/membership_warnings');
      } finally {
        this.warningsLoading = false;
      }
    },
    openWarnings() {
      this.showWarningsModal = true;
      this.loadWarnings();
    },
    formatWarnDate(date) {
      return moment(date).format('DD.MM.YYYY');
    },
    goToWarning(w) {
      this.showWarningsModal = false;
      this.$router.push(`/tabs/${w.section_key}`);
    },
  },
};
</script>

<style scoped>
.shell {
  display: flex;
  flex-direction: row;
  background: #f4f5f7;
}

.sidebar {
  width: 248px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-right: 1px solid #eceef0;
  padding: 20px 16px;
}

.brand-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px 20px;
}

.brand {
  font-size: 1.2rem;
  font-weight: 800;
  color: #1c1c1e;
}

.bell-btn {
  position: relative;
  border: none;
  background: #f4f5f7;
  color: #6a6f75;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.bell-btn:hover {
  background: #eceef0;
  color: #1c1c1e;
}

.bell-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border-radius: 999px;
  background: #e11d48;
  color: #ffffff;
  font-size: 0.62rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  border: 2px solid #ffffff;
}

.nav-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 0.92rem;
  font-weight: 600;
  color: #4a4f55;
  text-decoration: none;
}

.nav-item:hover {
  background: #f4f5f7;
}

.nav-item.active {
  background: rgba(33, 150, 243, 0.12);
  color: #2196f3;
}

.nav-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.nav-dot-neutral {
  background: #c4c8cc;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: #f4f5f7;
  border-radius: 14px;
  padding: 10px 12px;
  cursor: pointer;
  text-align: left;
}

.logout-icon {
  flex-shrink: 0;
  font-size: 18px;
  color: #9aa0a6;
}

.user-chip:hover .logout-icon {
  color: #d32f2f;
}

.user-avatar {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 50%;
  background: rgba(33, 150, 243, 0.16);
  color: #2196f3;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-name {
  font-weight: 700;
  font-size: 0.88rem;
  color: #1c1c1e;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-role {
  font-size: 0.76rem;
  color: #9aa0a6;
}

.content {
  flex: 1;
  min-width: 0;
  position: relative;
}

.warn-empty {
  text-align: center;
  color: #9aa0a6;
  padding: 12px 0;
}

.warn-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.warn-row {
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: #f8fafc;
  border-radius: 12px;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
}

.warn-row:hover {
  background: #f1f5f9;
}

.warn-status-pill {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 3px 9px;
  font-size: 0.68rem;
  font-weight: 700;
  white-space: nowrap;
  border: 1px solid transparent;
}

.warn-status-pill.debt {
  background: rgba(225, 29, 72, 0.08);
  color: #e11d48;
  border-color: rgba(225, 29, 72, 0.35);
}

.warn-status-pill.frozen {
  background: rgba(14, 165, 233, 0.08);
  color: #0284c7;
  border-color: rgba(14, 165, 233, 0.35);
}

.warn-status-pill.expiring {
  background: rgba(245, 158, 11, 0.1);
  color: #b45309;
  border-color: rgba(245, 158, 11, 0.4);
}

.warn-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
}

.warn-name {
  font-weight: 700;
  font-size: 0.9rem;
  color: #1c1c1e;
}

.warn-meta {
  font-size: 0.76rem;
  color: #9aa0a6;
}

.warn-refresh-btn {
  border: none;
  background: #f4f5f7;
  color: #4a4f55;
  border-radius: 10px;
  padding: 8px 14px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
}
</style>
