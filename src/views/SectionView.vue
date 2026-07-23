<template>
  <component
    v-if="section"
    :is="templateComponent"
    :key="section.key"
    :section-key="section.key"
    :label="section.label"
    v-bind="extraProps"
  />
</template>

<script>
import TimeSlotBookingView from './TimeSlotBookingView.vue';
import DateRangeBookingView from './DateRangeBookingView.vue';
import QueueListView from './QueueListView.vue';
import DesktopTimeSlotView from './desktop/DesktopTimeSlotView.vue';
import DesktopDateRangeView from './desktop/DesktopDateRangeView.vue';
import DesktopQueueView from './desktop/DesktopQueueView.vue';
import { useSectionsStore } from '@/stores/sections';
import { useViewportStore } from '@/stores/viewport';

const MOBILE_TEMPLATES = {
  time_slot: TimeSlotBookingView,
  date_range: DateRangeBookingView,
  queue: QueueListView,
};

const DESKTOP_TEMPLATES = {
  time_slot: DesktopTimeSlotView,
  date_range: DesktopDateRangeView,
  queue: DesktopQueueView,
};

export default {
  name: 'SectionView',
  computed: {
    section() {
      return useSectionsStore().byKey(this.$route.params.sectionKey);
    },
    templateComponent() {
      if (!this.section) return null;
      const map = useViewportStore().isDesktop ? DESKTOP_TEMPLATES : MOBILE_TEMPLATES;
      return map[this.section.template];
    },
    extraProps() {
      if (this.section && this.section.template === 'time_slot') {
        return { slotStepMinutes: this.section.slot_step_minutes, guestFields: this.section.guest_fields };
      }
      return {};
    },
  },
  async created() {
    await useSectionsStore().load();
  },
};
</script>
