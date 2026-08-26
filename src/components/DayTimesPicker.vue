<template>
  <div class="dtp">
    <label v-if="label" class="dtp-label">{{ label }}</label>
    <div class="dtp-row" v-for="(dayLabel, day) in WEEKDAY_LABELS" :key="day">
      <label class="dtp-toggle">
        <input type="checkbox" :checked="isChecked(day)" @change="toggleDay(day, $event.target.checked)" />
        <span>{{ dayLabel }}</span>
      </label>
      <div v-if="isChecked(day)" class="dtp-times">
        <input
          type="time"
          class="dtp-time-input"
          :value="timeFor(day, 'start_time')"
          @input="setTime(day, 'start_time', $event.target.value)"
        />
        <span class="dtp-sep">–</span>
        <input
          type="time"
          class="dtp-time-input"
          :value="timeFor(day, 'end_time')"
          @input="setTime(day, 'end_time', $event.target.value)"
        />
      </div>
    </div>
  </div>
</template>

<script>
const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default {
  name: 'DayTimesPicker',
  props: {
    modelValue: { type: Array, required: true }, // [{ day, start_time, end_time }]
    label: { type: String, default: '' },
  },
  emits: ['update:modelValue'],
  data() {
    return { WEEKDAY_LABELS };
  },
  methods: {
    entryFor(day) {
      return this.modelValue.find((dt) => dt.day === day);
    },
    isChecked(day) {
      return !!this.entryFor(day);
    },
    timeFor(day, field) {
      const entry = this.entryFor(day);
      return entry ? entry[field] : '';
    },
    toggleDay(day, checked) {
      if (checked) {
        const next = [...this.modelValue, { day, start_time: '', end_time: '' }].sort((a, b) => a.day - b.day);
        this.$emit('update:modelValue', next);
      } else {
        this.$emit('update:modelValue', this.modelValue.filter((dt) => dt.day !== day));
      }
    },
    setTime(day, field, value) {
      const next = this.modelValue.map((dt) => (dt.day === day ? { ...dt, [field]: value } : dt));
      this.$emit('update:modelValue', next);
    },
  },
};
</script>

<style scoped>
.dtp {
  margin-bottom: 14px;
}

.dtp-label {
  display: block;
  font-weight: 700;
  font-size: 0.8rem;
  color: #1c1c1e;
  margin-bottom: 6px;
}

.dtp-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 6px 0;
}

.dtp-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 52px;
  flex-shrink: 0;
  font-weight: 700;
  font-size: 0.85rem;
  color: #1c1c1e;
  cursor: pointer;
}

.dtp-toggle input[type='checkbox'] {
  width: 18px;
  height: 18px;
  accent-color: #2196f3;
  cursor: pointer;
}

.dtp-times {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 180px;
}

.dtp-time-input {
  flex: 1;
  border: none;
  outline: none;
  background: #eef0f0;
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #1c1c1e;
  font-family: inherit;
}

.dtp-sep {
  color: #9aa0a6;
  font-weight: 600;
}
</style>
