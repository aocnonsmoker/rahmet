import { defineStore } from 'pinia';
import { apiFetch } from '@/services/api';

export const useSectionsStore = defineStore('sections', {
  state: () => ({
    items: [],
    loaded: false,
  }),
  getters: {
    byKey: (state) => (key) => state.items.find((s) => s.key === key),
    enabledSections: (state) => state.items.filter((s) => s.enabled),
  },
  actions: {
    async load(force = false) {
      if (this.loaded && !force) return;
      this.items = await apiFetch('/sections');
      this.loaded = true;
    },
    async refresh() {
      return this.load(true);
    },
  },
});
