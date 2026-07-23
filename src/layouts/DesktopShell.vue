<template>
  <ion-page class="shell">
    <aside class="sidebar">
      <div class="brand">Рахмет</div>

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
  </ion-page>
</template>

<script>
import { IonPage, IonRouterOutlet, IonIcon } from '@ionic/vue';
import { logOutOutline } from 'ionicons/icons';
import { useAuthStore } from '@/stores/auth';
import { useSectionsStore } from '@/stores/sections';
import { showConfirm } from '@/services/dialogs';

// Sidebar nav-dot needs a per-section color; sections don't carry one of
// their own (that's a resource-level concept), so we cycle a fixed palette
// by position — same idea as CHART_PALETTE in Cash.vue.
const NAV_COLORS = ['#2196f3', '#4caf50', '#ff9800', '#e91e63', '#9c27b0', '#009688', '#795548'];

export default {
  name: 'DesktopShell',
  components: { IonPage, IonRouterOutlet, IonIcon },
  data() {
    return {
      auth: useAuthStore(),
      logOutIcon: logOutOutline,
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
  },
  methods: {
    async onLogout() {
      const ok = await showConfirm('Вы точно хотите выйти?', { header: 'Выход', confirmText: 'Выйти' });
      if (ok) {
        this.auth.logout();
        this.$router.replace('/login');
      }
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

.brand {
  font-size: 1.2rem;
  font-weight: 800;
  color: #1c1c1e;
  padding: 4px 12px 20px;
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
</style>
