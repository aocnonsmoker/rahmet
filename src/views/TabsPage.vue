<template>
  <ion-page>
    <ion-router-outlet></ion-router-outlet>
    <div class="tab-bar">
      <button
        v-for="tabItem in visibleTabs"
        :key="tabItem.key"
        type="button"
        class="tab-btn"
        :class="{ active: $route.path === tabItem.path }"
        @click="$router.push(tabItem.path)"
      >
        <span class="tab-emoji">{{ tabItem.icon }}</span>
        <span class="tab-label">{{ tabItem.label }}</span>
      </button>
    </div>
  </ion-page>
</template>

<script>
import { IonPage, IonRouterOutlet } from '@ionic/vue';
import { useAuthStore } from '@/stores/auth';
import { useSectionsStore } from '@/stores/sections';

export default {
  name: 'Tabs',
  components: { IonPage, IonRouterOutlet },
  computed: {
    // Bottom bar holds only the day-to-day business sections. Owner-only admin
    // screens (Касса/Настройки) and logout live in each page's header menu
    // (HeaderMenuButton) instead — otherwise the bar overflows once a
    // business enables several sections.
    visibleTabs() {
      const auth = useAuthStore();
      const sections = useSectionsStore();
      return sections.items
        .filter((s) => s.enabled && auth.hasSection(s.key))
        .map((s) => ({ key: s.key, path: `/tabs/${s.key}`, icon: s.icon, label: s.label }));
    },
  },
}
</script>

<style scoped>
/* ion-router-outlet defaults to position:absolute; inset:0 (it expects to be
   the sole content of its parent) — override so it only fills the space
   above the tab bar instead of covering it. */
ion-router-outlet {
  position: relative;
  flex: 1;
}

.tab-bar {
  display: flex;
  border-top: 1px solid #e0e2e5;
  background: #fff;
  padding-bottom: env(safe-area-inset-bottom, 0);
  flex-shrink: 0;
}

.tab-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  border: none;
  background: transparent;
  padding: 6px 4px 8px;
  color: #9aa0a6;
}

.tab-btn.active {
  color: #2196f3;
}

.tab-emoji {
  font-size: 22px;
  line-height: 1;
}

.tab-label {
  font-size: 0.7rem;
  font-weight: 600;
}
</style>
