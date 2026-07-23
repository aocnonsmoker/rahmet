import { defineStore } from 'pinia';

// Tablet-landscape/small-laptop cutoff — below this, phones and portrait
// tablets get the mobile (bottom-tabs) UI; at or above, the desktop sidebar UI.
const DESKTOP_BREAKPOINT = 1024;

let listenerAttached = false;

export const useViewportStore = defineStore('viewport', {
  state: () => ({
    width: window.innerWidth,
  }),
  getters: {
    isDesktop: (state) => state.width >= DESKTOP_BREAKPOINT,
  },
  actions: {
    init() {
      if (listenerAttached) return;
      listenerAttached = true;
      let timer;
      window.addEventListener('resize', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          this.width = window.innerWidth;
        }, 150);
      });
    },
  },
});
