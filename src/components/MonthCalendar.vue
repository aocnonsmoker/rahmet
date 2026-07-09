<template>
  <div class="month-calendar">
    <div class="cal-header">
      <button class="cal-nav" type="button" @click="prevMonth">‹</button>
      <div class="cal-title">{{ monthLabel }}</div>
      <button class="cal-nav" type="button" @click="nextMonth">›</button>
    </div>
    <div class="cal-weekdays">
      <div v-for="d in weekdayLabels" :key="d" class="cal-weekday">{{ d }}</div>
    </div>
    <div class="cal-grid">
      <button
        v-for="cell in cells"
        :key="cell.date"
        type="button"
        class="cal-day"
        :class="{ 'is-other-month': !cell.inMonth, 'is-selected': cell.date === modelValue, 'is-today': cell.date === todayStr }"
        @click="selectDay(cell)"
      >
        <span class="cal-daynum">{{ cell.day }}</span>
        <span v-if="cell.total" class="cal-badge">{{ cell.total }}</span>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: "MonthCalendar",
  props: {
    modelValue: {
      type: String,
      required: true,
    },
    events: {
      type: Array,
      default: () => [],
    },
  },
  emits: ["update:modelValue"],
  data() {
    const [y, m] = this.modelValue.split("-").map(Number);
    return {
      viewYear: y,
      viewMonth: m - 1,
      weekdayLabels: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
      todayStr: (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      })(),
    };
  },
  computed: {
    monthLabel() {
      const date = new Date(this.viewYear, this.viewMonth, 1);
      const str = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(date);
      return str.charAt(0).toUpperCase() + str.slice(1);
    },
    eventCountsByDay() {
      const map = {};
      for (const e of this.events) {
        const day = String(e.start).slice(0, 10);
        map[day] = (map[day] || 0) + 1;
      }
      return map;
    },
    cells() {
      const firstOfMonth = new Date(this.viewYear, this.viewMonth, 1);
      const startWeekday = (firstOfMonth.getDay() + 6) % 7;
      const daysInMonth = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();
      const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
      const result = [];
      for (let i = 0; i < totalCells; i++) {
        const cellDate = new Date(this.viewYear, this.viewMonth, 1 + (i - startWeekday));
        const dateStr = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, "0")}-${String(cellDate.getDate()).padStart(2, "0")}`;
        result.push({
          date: dateStr,
          day: cellDate.getDate(),
          inMonth: cellDate.getMonth() === this.viewMonth,
          total: this.eventCountsByDay[dateStr] || 0,
        });
      }
      return result;
    },
  },
  methods: {
    prevMonth() {
      const now = Date.now();
      if (now - (this._lastNavClick || 0) < 120) return;
      this._lastNavClick = now;
      this.viewMonth -= 1;
      if (this.viewMonth < 0) {
        this.viewMonth = 11;
        this.viewYear -= 1;
      }
    },
    nextMonth() {
      const now = Date.now();
      if (now - (this._lastNavClick || 0) < 120) return;
      this._lastNavClick = now;
      this.viewMonth += 1;
      if (this.viewMonth > 11) {
        this.viewMonth = 0;
        this.viewYear += 1;
      }
    },
    selectDay(cell) {
      this.$emit("update:modelValue", cell.date);
    },
  },
};
</script>

<style scoped>
.month-calendar {
  padding: 14px 10px 18px;
  background: #fff;
}

.cal-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 10px;
}

.cal-nav {
  border: none;
  background: #f1f2f4;
  color: #6a6f75;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.cal-title {
  font-weight: 700;
  font-size: 1.05rem;
  color: #1c1c1e;
  min-width: 150px;
  text-align: center;
}

.cal-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 4px;
}

.cal-weekday {
  text-align: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: #8a6d3b;
  padding: 4px 0;
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.cal-day {
  border: none;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 2px;
  padding: 6px 2px 8px;
  border-radius: 12px;
  cursor: pointer;
  min-height: 56px;
}

.cal-daynum {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1c1c1e;
}

.cal-day.is-other-month .cal-daynum {
  color: #c7c9cc;
}

.cal-day.is-today .cal-daynum {
  color: #2196f3;
}

.cal-day.is-selected {
  background: rgba(33, 150, 243, 0.15);
}

.cal-day.is-selected .cal-daynum {
  color: #1565c0;
}

.cal-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 3px;
  border-radius: 50%;
  background: #2196f3;
  color: #fff;
  font-size: 0.62rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
