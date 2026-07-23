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
import { useSectionsStore } from '@/stores/sections';

const TEMPLATE_COMPONENTS = {
  time_slot: TimeSlotBookingView,
  date_range: DateRangeBookingView,
  queue: QueueListView,
};

export default {
  name: 'SectionView',
  computed: {
    section() {
      return useSectionsStore().byKey(this.$route.params.sectionKey);
    },
    templateComponent() {
      return this.section ? TEMPLATE_COMPONENTS[this.section.template] : null;
    },
    extraProps() {
      if (this.section && this.section.template === 'time_slot') {
        return { slotStepMinutes: this.section.slot_step_minutes };
      }
      return {};
    },
  },
  async created() {
    await useSectionsStore().load();
  },
};
</script>
