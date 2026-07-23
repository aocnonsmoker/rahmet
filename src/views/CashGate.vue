<template>
  <Cash v-if="!viewport.isDesktop" />
  <DesktopCash v-else />
</template>

<script>
import Cash from '@/views/Cash.vue';
import DesktopCash from '@/views/desktop/DesktopCash.vue';
import { useViewportStore } from '@/stores/viewport';

export default {
  name: 'CashGate',
  components: { Cash, DesktopCash },
  data() {
    return { viewport: useViewportStore() };
  },
};
</script>
