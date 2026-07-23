<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        <ion-tab-button v-for="tabItem in visibleTabs" :key="tabItem.key" :tab="tabItem.key" :href="tabItem.path">
          <span class="tab-emoji">{{ tabItem.icon }}</span>
          <ion-label>{{ tabItem.label }}</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script>
import { IonTabBar, IonTabButton, IonTabs, IonLabel, IonPage, IonRouterOutlet } from '@ionic/vue';
import { useAuthStore } from '@/stores/auth';
import { useSectionsStore } from '@/stores/sections';

export default {
  name: 'Tabs',
  components: { IonTabBar, IonTabButton, IonTabs, IonLabel, IonPage, IonRouterOutlet },
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
  async mounted() {
    await useSectionsStore().load();
  },
}
</script>

<style scoped>
.tab-emoji {
  font-size: 22px;
  line-height: 1;
}
</style>
