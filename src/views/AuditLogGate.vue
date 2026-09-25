<template>
  <AuditLog v-if="!viewport.isDesktop" />
  <DesktopAuditLog v-else />
</template>

<script>
import AuditLog from '@/views/AuditLog.vue';
import DesktopAuditLog from '@/views/desktop/DesktopAuditLog.vue';
import { useViewportStore } from '@/stores/viewport';

export default {
  name: 'AuditLogGate',
  components: { AuditLog, DesktopAuditLog },
  data() {
    return { viewport: useViewportStore() };
  },
};
</script>
