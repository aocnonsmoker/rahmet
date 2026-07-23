<template>
  <div class="dtw-row">
    <span v-if="label" class="dtw-label">{{ label }}</span>
    <div class="dtw-wheels">
      <div class="dtw-highlight"></div>

      <div ref="dayCol" class="dtw-col dtw-col-day" @scroll="onScroll('day')" @mousedown="onDragStart('day', $event)">
        <div class="dtw-pad"></div>
        <div
          v-for="d in days"
          :key="d.value"
          class="dtw-item"
          :class="{ active: d.value === selectedDay }"
          @click="selectItem('day', d.value)"
        >{{ d.label }}</div>
        <div class="dtw-pad"></div>
      </div>

      <div ref="hourCol" class="dtw-col dtw-col-num" @scroll="onScroll('hour')" @mousedown="onDragStart('hour', $event)">
        <div class="dtw-pad"></div>
        <div
          v-for="h in hours"
          :key="h"
          class="dtw-item"
          :class="{ active: h === selectedHour }"
          @click="selectItem('hour', h)"
        >{{ pad(h) }}</div>
        <div class="dtw-pad"></div>
      </div>

      <div ref="minuteCol" class="dtw-col dtw-col-num" @scroll="onScroll('minute')" @mousedown="onDragStart('minute', $event)">
        <div class="dtw-pad"></div>
        <div
          v-for="m in minutes"
          :key="m"
          class="dtw-item"
          :class="{ active: m === selectedMinute }"
          @click="selectItem('minute', m)"
        >{{ pad(m) }}</div>
        <div class="dtw-pad"></div>
      </div>
    </div>
  </div>
</template>

<script>
import moment from 'moment';

const ITEM_HEIGHT = 36;

export default {
  name: 'DateTimeWheel',
  props: {
    modelValue: { type: String, required: true }, // 'YYYY-MM-DD HH:mm'
    label: { type: String, default: '' },
    minuteStep: { type: Number, default: 30 },
    daysBefore: { type: Number, default: 3 },
    daysAfter: { type: Number, default: 60 },
  },
  emits: ['update:modelValue'],
  data() {
    const [datePart, timePart] = this.modelValue.split(' ');
    const [h, m] = (timePart || '00:00').split(':').map(Number);
    // Day range is anchored once to the initial value, not recomputed from
    // selectedDay — otherwise every click/scroll re-centers the window and
    // the list shifts out from under the item you just picked.
    let start = moment(datePart).subtract(this.daysBefore, 'days');
    const today = moment().startOf('day');
    if (today.isBefore(start)) start = today.clone();
    const end = moment(datePart).add(this.daysAfter, 'days');
    return {
      selectedDay: datePart,
      selectedHour: h,
      selectedMinute: this.nearestStep(m, this.minuteStep),
      rangeStart: start.format('YYYY-MM-DD'),
      rangeEnd: end.format('YYYY-MM-DD'),
    };
  },
  computed: {
    days() {
      const arr = [];
      const cur = moment(this.rangeStart);
      const end = moment(this.rangeEnd);
      while (cur.isSameOrBefore(end)) {
        arr.push({ value: cur.format('YYYY-MM-DD'), label: this.formatDayLabel(cur) });
        cur.add(1, 'days');
      }
      return arr;
    },
    hours() {
      return Array.from({ length: 24 }, (_, i) => i);
    },
    minutes() {
      const steps = [];
      for (let m = 0; m < 60; m += this.minuteStep) steps.push(m);
      return steps;
    },
  },
  mounted() {
    this.$nextTick(() => {
      this.scrollToIndex(this.$refs.dayCol, this.days.findIndex((d) => d.value === this.selectedDay));
      this.scrollToIndex(this.$refs.hourCol, this.hours.indexOf(this.selectedHour));
      this.scrollToIndex(this.$refs.minuteCol, this.minutes.indexOf(this.selectedMinute));
    });
  },
  beforeUnmount() {
    window.removeEventListener('mousemove', this.onDragMove);
    window.removeEventListener('mouseup', this.onDragEnd);
  },
  methods: {
    pad(n) {
      return String(n).padStart(2, '0');
    },
    nearestStep(value, step) {
      return Math.round((value || 0) / step) * step % 60;
    },
    formatDayLabel(momentDate) {
      if (momentDate.isSame(moment(), 'day')) return 'Сегодня';
      const str = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' }).format(momentDate.toDate());
      return str;
    },
    scrollToIndex(el, index) {
      if (!el || index < 0) return;
      el.scrollTop = index * ITEM_HEIGHT;
    },
    selectItem(type, value) {
      if (this._suppressClick) {
        this._suppressClick = false;
        return;
      }
      const refMap = { day: 'dayCol', hour: 'hourCol', minute: 'minuteCol' };
      const listMap = { day: this.days.map((d) => d.value), hour: this.hours, minute: this.minutes };
      const index = listMap[type].indexOf(value);
      const el = this.$refs[refMap[type]];
      if (el) el.scrollTo({ top: index * ITEM_HEIGHT, behavior: 'smooth' });
      this.applySelection(type, value);
    },
    // overflow-y:auto lets you scroll with the wheel/scrollbar, but not by
    // grabbing the content itself — add that as a drag gesture, since a
    // mouse without a working wheel has no other way to move these lists.
    onDragStart(type, e) {
      const refMap = { day: 'dayCol', hour: 'hourCol', minute: 'minuteCol' };
      const el = this.$refs[refMap[type]];
      if (!el) return;
      e.preventDefault();
      this._drag = { type, el, startY: e.clientY, startScrollTop: el.scrollTop, moved: 0 };
      window.addEventListener('mousemove', this.onDragMove);
      window.addEventListener('mouseup', this.onDragEnd);
    },
    onDragMove(e) {
      if (!this._drag) return;
      const delta = this._drag.startY - e.clientY;
      this._drag.el.scrollTop = this._drag.startScrollTop + delta;
      this._drag.moved = Math.max(this._drag.moved, Math.abs(delta));
    },
    onDragEnd() {
      window.removeEventListener('mousemove', this.onDragMove);
      window.removeEventListener('mouseup', this.onDragEnd);
      if (this._drag && this._drag.moved > 4) {
        this._suppressClick = true;
      }
      this._drag = null;
    },
    onScroll(type) {
      clearTimeout(this._scrollTimers?.[type]);
      this._scrollTimers = this._scrollTimers || {};
      this._scrollTimers[type] = setTimeout(() => {
        const refMap = { day: 'dayCol', hour: 'hourCol', minute: 'minuteCol' };
        const listMap = { day: this.days.map((d) => d.value), hour: this.hours, minute: this.minutes };
        const el = this.$refs[refMap[type]];
        if (!el) return;
        const index = Math.round(el.scrollTop / ITEM_HEIGHT);
        const clamped = Math.max(0, Math.min(listMap[type].length - 1, index));
        this.applySelection(type, listMap[type][clamped]);
      }, 80);
    },
    applySelection(type, value) {
      if (type === 'day') this.selectedDay = value;
      if (type === 'hour') this.selectedHour = value;
      if (type === 'minute') this.selectedMinute = value;
      this.$emit('update:modelValue', `${this.selectedDay} ${this.pad(this.selectedHour)}:${this.pad(this.selectedMinute)}`);
    },
  },
};
</script>

<style scoped>
.dtw-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.dtw-label {
  width: 28px;
  flex-shrink: 0;
  font-weight: 700;
  color: #1c1c1e;
  white-space: nowrap;
}

.dtw-wheels {
  position: relative;
  display: flex;
  flex: 1;
  gap: 6px;
  height: 180px;
}

.dtw-highlight {
  position: absolute;
  top: 72px;
  left: 0;
  right: 0;
  height: 36px;
  background: rgba(33, 150, 243, 0.08);
  border-top: 1px solid rgba(33, 150, 243, 0.25);
  border-bottom: 1px solid rgba(33, 150, 243, 0.25);
  pointer-events: none;
}

.dtw-col {
  flex: 1;
  min-width: 0;
  height: 180px;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
  cursor: grab;
  user-select: none;
}

.dtw-col:active {
  cursor: grabbing;
}

.dtw-col::-webkit-scrollbar {
  display: none;
}

.dtw-col-num {
  flex: 0 0 60px;
}

.dtw-pad {
  height: 72px;
  flex-shrink: 0;
}

.dtw-item {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  scroll-snap-align: center;
  font-size: 0.86rem;
  color: #9aa0a6;
  cursor: pointer;
  white-space: nowrap;
}

.dtw-item.active {
  color: #2196f3;
  font-weight: 700;
}
</style>
