<template>
  <div class="schedule-calendar" :class="{ 'fill-height': fillHeight }">
    <div class="sc-nav">
      <button class="sc-nav-arrow" type="button" @click="navigate(-1)">‹</button>
      <button class="sc-nav-label" type="button" @click="resetView">{{ navLabel }}</button>
      <button class="sc-nav-arrow" type="button" @click="navigate(1)">›</button>
    </div>

    <vue-cal
      :key="calendarKey"
      class="sc-vuecal"
      :selected-date="viewDate"
      :active-view="activeView"
      :disable-views="['years', 'year', 'month']"
      :click-to-navigate="false"
      hide-view-selector
      hide-title-bar
      sticky-split-labels
      :locale="ruLocale"
      :split-days="splits"
      :time-step="30"
      :time-cell-height="timeCellHeight"
      :time-from="7 * 60"
      :time-to="23 * 60"
      :events="virtualEvents"
      @ready="onViewChange"
      @view-change="onViewChange"
      @event-click="onEventClick"
    >
      <template #event="{ event }">
        <div class="sc-event" :class="{ active: event.resourceId === selectedGroupId }" :style="eventStyle(event)">
          <div class="sc-event-title">{{ event.title }}</div>
          <div class="sc-event-time">{{ event.timeLabel }}</div>
        </div>
      </template>
    </vue-cal>

    <div v-if="!schedules.length" class="sc-empty">Расписание не задано</div>
  </div>
</template>

<script>
import moment from 'moment';
import VueCal from 'vue-cal';
import 'vue-cal/dist/vuecal.css';
import ruLocale from 'vue-cal/dist/i18n/ru.es.js';

export default {
  name: 'ScheduleCalendar',
  components: { VueCal },
  props: {
    schedules: { type: Array, required: true },
    groups: { type: Array, required: true },
    rooms: { type: Array, required: true },
    selectedGroupId: { type: Number, default: null },
    activeView: { type: String, default: 'week' }, // 'day' | 'week'
    timeCellHeight: { type: Number, default: 90 },
    fillHeight: { type: Boolean, default: false },
  },
  emits: ['edit-schedule'],
  data() {
    return {
      ruLocale,
      viewDate: moment().format('YYYY-MM-DD'),
      rangeStart: null,
      rangeEnd: null,
      calendarKey: 0,
    };
  },
  computed: {
    splits() {
      return this.rooms.map((r) => ({ id: r.id, label: r.label }));
    },
    navLabel() {
      const d = moment(this.viewDate, 'YYYY-MM-DD');
      if (this.activeView === 'day') {
        const str = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: '2-digit', month: 'long' }).format(d.toDate());
        return str.charAt(0).toUpperCase() + str.slice(1);
      }
      const start = d.clone().startOf('isoWeek');
      const end = start.clone().add(6, 'days');
      const fmt = (m) => new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long' }).format(m.toDate());
      return `${fmt(start)} – ${fmt(end)}`;
    },
    virtualEvents() {
      if (!this.rangeStart || !this.rangeEnd) return [];
      const events = [];
      const cursor = moment(this.rangeStart).startOf('day');
      const end = moment(this.rangeEnd).startOf('day');
      while (cursor.isSameOrBefore(end, 'day')) {
        const isoDay = cursor.isoWeekday() - 1; // our convention: 0=Пн..6=Вс
        const dateStr = cursor.format('YYYY-MM-DD');
        for (const s of this.schedules) {
          if (this.selectedGroupId && s.resource_id !== this.selectedGroupId) continue;
          const dayTime = s.day_times.find((dt) => dt.day === isoDay);
          if (!dayTime) continue;
          const startTime = dayTime.start_time.slice(0, 5);
          const endTime = dayTime.end_time.slice(0, 5);
          events.push({
            start: `${dateStr} ${startTime}`,
            end: `${dateStr} ${endTime}`,
            title: this.groupLabel(s.resource_id),
            split: s.room_id,
            resourceId: s.resource_id,
            timeLabel: `${startTime}–${endTime}`,
            scheduleRef: s,
          });
        }
        cursor.add(1, 'day');
      }
      return events;
    },
  },
  methods: {
    groupLabel(resourceId) {
      const g = this.groups.find((item) => item.id === resourceId);
      return g ? g.label : '—';
    },
    groupColor(resourceId) {
      const g = this.groups.find((item) => item.id === resourceId);
      return g ? g.color : '#9aa0a6';
    },
    hexToRgba(hex, alpha) {
      const h = hex.replace('#', '');
      const bigint = parseInt(h, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },
    eventStyle(event) {
      const color = this.groupColor(event.resourceId);
      return {
        backgroundColor: this.hexToRgba(color, 0.16),
        border: `1.5px solid ${this.hexToRgba(color, 0.55)}`,
      };
    },
    navigate(direction) {
      const unit = this.activeView === 'day' ? 1 : 7;
      this.viewDate = moment(this.viewDate, 'YYYY-MM-DD').add(direction * unit, 'days').format('YYYY-MM-DD');
    },
    resetView() {
      // Full remount — guarantees vue-cal comes back up on our intended
      // activeView (day/week), even if its internal state ever drifted.
      this.calendarKey += 1;
    },
    onViewChange(params) {
      this.rangeStart = params.startDate;
      this.rangeEnd = params.endDate;
    },
    onEventClick(event) {
      this.$emit('edit-schedule', event.scheduleRef);
    },
  },
};
</script>

<style scoped>
.schedule-calendar {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sc-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: #eef0f0;
  border-radius: 14px;
  padding: 10px 14px;
}

.sc-nav-label {
  border: none;
  background: transparent;
  font: inherit;
  font-weight: 700;
  color: #1c1c1e;
  text-align: center;
  white-space: nowrap;
  cursor: pointer;
}

.sc-nav-arrow {
  border: none;
  background: transparent;
  color: #6a6f75;
  font-size: 20px;
  line-height: 1;
  padding: 2px 6px;
  cursor: pointer;
}

.sc-empty {
  text-align: center;
  color: #9aa0a6;
  padding: 24px 0;
}

.sc-event {
  position: relative;
  height: 100%;
  border-radius: 10px;
  padding: 3px 6px;
  overflow: hidden;
  cursor: pointer;
}

.sc-event.active {
  outline: 2px solid #2196f3;
  outline-offset: -1px;
}

.sc-event-title {
  font-weight: 700;
  font-size: 0.78rem;
  color: #1c1c1e;
  line-height: 1.15;
}

.sc-event-time {
  color: #6a6f75;
  font-size: 0.66rem;
  margin-top: 1px;
}

.schedule-calendar :deep(.vuecal) {
  height: 72vh;
  min-height: 420px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  font-family: inherit;
  border: none;
}

/* Fills whatever space its (flex, real-height) parent gives it instead of a
   fixed vh guess — used where the page itself must not scroll and the
   calendar's own internal scroll (.vuecal__bg) should handle overflow. */
.schedule-calendar.fill-height {
  flex: 1;
  min-height: 0;
}

.schedule-calendar.fill-height :deep(.vuecal) {
  flex: 1;
  min-height: 0;
  height: auto;
}

.schedule-calendar :deep(.vuecal__bg) {
  background: #ffffff;
  scrollbar-width: thin;
}

.schedule-calendar :deep(.vuecal__bg)::-webkit-scrollbar {
  width: 8px;
}

.schedule-calendar :deep(.vuecal__bg)::-webkit-scrollbar-thumb {
  background: #d0d3d7;
  border-radius: 4px;
}

/* vue-cal measures the real scrollbar width via this separate hidden probe
   element and injects its own padding-right onto .vuecal__weekdays-headings
   to match — has to see the same forced 8px, or its measurement (OS default,
   usually much wider) won't agree with what .vuecal__bg actually reserves. */
.schedule-calendar :deep(.vuecal__scrollbar-check) {
  scrollbar-width: thin;
}

.schedule-calendar :deep(.vuecal__scrollbar-check)::-webkit-scrollbar {
  width: 8px;
}

/* Our own split-days room row never gets vue-cal's built-in compensation at
   all (see above), so it needs the same fixed padding-right applied here. */
.schedule-calendar :deep(.vuecal__weekdays-headings),
.schedule-calendar :deep(.vuecal__split-days-headers) {
  padding-right: 8px;
  box-sizing: border-box;
}

.schedule-calendar :deep(.vuecal__heading) {
  font-weight: 700;
  font-size: 0.8rem;
  color: #1c1c1e;
}

.schedule-calendar :deep(.vuecal__time-cell-line.hours .vuecal__time-cell-label) {
  font-size: 0.7rem;
  color: #9aa0a6;
}

.schedule-calendar :deep(.vuecal__cell-split) {
  background: transparent;
  box-shadow: inset -1px 0 0 #eceef0;
}

.schedule-calendar :deep(.vuecal__cell-split .split-label) {
  font-weight: 700;
  font-size: 0.78rem;
  color: #2b2f33;
}

.schedule-calendar :deep(.vuecal__event) {
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 0;
}
</style>
