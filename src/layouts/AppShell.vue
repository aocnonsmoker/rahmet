<template>
  <TabsPage v-if="!viewport.isDesktop" />
  <DesktopShell v-else />
</template>

<script>
import TabsPage from '@/views/TabsPage.vue';
import DesktopShell from '@/layouts/DesktopShell.vue';
import { useViewportStore } from '@/stores/viewport';

export default {
  name: 'AppShell',
  components: { TabsPage, DesktopShell },
  data() {
    return { viewport: useViewportStore() };
  },
  created() {
    this.viewport.init();
  },
};
</script>
