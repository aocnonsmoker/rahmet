<template>
  <ion-page class="page">
    <div class="page-header">
      <h1 class="page-title">{{ label }}</h1>
      <div class="date-nav">
        <button class="nav-arrow" type="button" @click="prevDay">‹</button>
        <button class="date-pill" type="button" @click="showDateModal = true">{{ formattedDate }}</button>
        <button class="nav-arrow" type="button" @click="nextDay">›</button>
      </div>
      <button class="today-btn" type="button" @click="goToday">Сегодня</button>
      <button class="link-btn" type="button" @click="getRecords">
        <ion-icon :icon="refreshIcon"></ion-icon>
        Обновить
      </button>
      <button v-if="canWrite" class="primary-btn" type="button" @click="openAddModal">+ Добавить запись</button>
    </div>

    <div class="schedule-wrapper" ref="scheduleWrapper">
      <div class="schedule-scroll" ref="gridBody">
        <div class="grid-inner">
          <div class="room-headers">
            <div class="time-col-spacer"></div>
            <div
              v-for="resource in resources"
              :key="resource.id"
              class="room-header"
              :style="{ width: columnWidth + 'px', color: resource.color }"
            >
              <span class="dot" :style="`background: ${resource.color}`"></span>{{ resource.label }}
            </div>
          </div>

          <div class="grid-rows">
            <div class="time-col">
              <div v-for="slot in timeSlots" :key="slot.key" class="time-label" :style="{ height: slotHeight + 'px' }">{{ slot.label }}</div>
            </div>
            <div
              v-for="resource in resources"
              :key="resource.id"
              class="room-col"
              :style="{ width: columnWidth + 'px', height: timeSlots.length * slotHeight + 'px', backgroundColor: hexToRgba(resource.color, 0.08) }"
            >
              <div
                v-for="record in recordsForResource(resource.id)"
                :key="record.id"
                class="event-card"
                :style="recordCardStyle(record)"
                @click="onRecordClick(record)"
              >
                <div class="event-title">{{ record.title }}</div>
                <div class="event-time">{{ showTime(record.start) }}–{{ showTime(record.end) }}</div>
                <div v-if="guestFields === 'split' && (record.adult || record.child)" class="event-meta">Взр: {{ record.adult || 0 }} · Дети: {{ record.child || 0 }}</div>
                <div v-else-if="guestFields === 'single' && record.adult" class="event-meta">Кол-во: {{ record.adult }}</div>
                <div v-if="record.price" class="event-price">{{ record.price }} тг.</div>
              </div>
            </div>
            <div v-if="nowLineTop !== null" class="now-line" :style="{ top: nowLineTop + 'px' }"></div>
          </div>
        </div>
      </div>
    </div>

    <DesktopModal v-model="showDateModal" title="Выберите дату">
      <MonthCalendar :model-value="selectedDate" :events="records" @update:modelValue="onPickDate" />
    </DesktopModal>

    <DesktopModal v-model="isOpen" title="Новая запись">
      <FormInput label="Название записи" type="text" placeholder="Имя клиента или телефон" :model-value="newRecord.title" @update:modelValue="newRecord.title = $event" />
      <div v-if="guestFields === 'split'" class="form-row">
        <FormInput label="Взрослые" type="number" :model-value="newRecord.adult" @update:modelValue="newRecord.adult = $event" />
        <FormInput label="Детские" type="number" :model-value="newRecord.child" @update:modelValue="newRecord.child = $event" />
      </div>
      <FormInput
        v-else-if="guestFields === 'single'"
        label="Количество человек"
        type="number"
        :model-value="newRecord.adult"
        @update:modelValue="newRecord.adult = $event"
      />
      <button class="date-chip" type="button" @click="showAddDateModal = true">{{ addModalDateLabel }}</button>
      <DesktopModal v-model="showAddDateModal" title="Выберите дату">
        <MonthCalendar :model-value="selectedDate" :events="records" @update:modelValue="onPickDate" />
      </DesktopModal>
      <FormSelect label="Время" placeholder="Выберите время" :model-value="duration" :options="durationOptions" @update:modelValue="duration = $event" />
      <template v-if="duration">
        <div v-for="item in resources" :key="`${item.id}-${duration}`" class="slots-room">
          <div class="slots-room-title" :style="`color: ${item.color}`">
            <span class="dot" :style="`background: ${item.color}`"></span>{{ item.label }}
          </div>
          <div class="slots-grid">
            <button
              v-for="i in availableTime(item.id, duration)"
              :key="i.start"
              type="button"
              class="slot-btn"
              :style="slotStyle(item, item.id == newRecord.resource_id && i.start == newRecord.start)"
              @click="selectSlot(item.id, i)"
            >{{ i.start.split(' ')[1] }}–{{ i.end.split(' ')[1] }}</button>
          </div>
        </div>
      </template>
      <template #footer>
        <button class="pill-btn ghost" type="button" @click="isOpen = false">Отменить</button>
        <button class="pill-btn primary" type="button" @click="confirm">Записать</button>
      </template>
    </DesktopModal>

    <DesktopModal v-model="showRecord" title="Запись">
      <template v-if="selectedRecord">
        <FormInput label="Название записи" type="text" :model-value="selectedRecord.title" @update:modelValue="selectedRecord.title = $event" />
        <div v-if="guestFields === 'split'" class="form-row">
          <FormInput label="Взрослые" type="number" :model-value="selectedRecord.adult" @update:modelValue="selectedRecord.adult = $event" />
          <FormInput label="Детские" type="number" :model-value="selectedRecord.child" @update:modelValue="selectedRecord.child = $event" />
        </div>
        <FormInput
          v-else-if="guestFields === 'single'"
          label="Количество человек"
          type="number"
          :model-value="selectedRecord.adult"
          @update:modelValue="selectedRecord.adult = $event"
        />
        <FormInput label="Сумма" type="number" suffix="тг." :model-value="selectedRecord.price" @update:modelValue="selectedRecord.price = $event" />
        <FormSelect label="Объект" :model-value="selectedRecord.resource_id" :options="resourceOptions" @update:modelValue="selectedRecord.resource_id = $event" />
        <DateTimeWheel label="С" :model-value="timeStartDate" @update:modelValue="timeStartDate = $event" />
        <DateTimeWheel label="До" :model-value="timeEndDate" @update:modelValue="timeEndDate = $event" />
      </template>
      <template #footer>
        <button class="pill-btn danger" type="button" @click="deleteRecord">Удалить</button>
        <button class="pill-btn primary" type="button" @click="confirmEdit">Сохранить</button>
      </template>
    </DesktopModal>
  </ion-page>
</template>

<script>
import moment from 'moment';
import { IonPage, IonIcon } from '@ionic/vue';
import { refreshOutline } from 'ionicons/icons';
import DesktopModal from '@/components/desktop/DesktopModal.vue';
import DateTimeWheel from '@/components/desktop/DateTimeWheel.vue';
import FormInput from '@/components/FormInput.vue';
import FormSelect from '@/components/FormSelect.vue';
import MonthCalendar from '@/components/MonthCalendar.vue';
import { apiFetch } from '@/services/api';
import { showAlert, showConfirm } from '@/services/dialogs';
import { useAuthStore } from '@/stores/auth';

// Business day runs 06:00 to 06:00 next day — matches every other template's
// cutoff (TimeSlotBookingView.vue mobile, QueueListView.vue).
function computeBusinessDay(date) {
  const d = moment(date);
  if (d.hour() < 6) {
    return d.clone().subtract(1, 'day').format('YYYY-MM-DD');
  }
  return d.format('YYYY-MM-DD');
}

// Records are fetched in a window around the day being viewed instead of the whole
// section history (which only grows over time) — re-fetched when day navigation
// moves outside the currently loaded window.
const RECORDS_WINDOW_DAYS = 30;

export default {
  name: 'DesktopTimeSlotView',
  components: { IonPage, IonIcon, DesktopModal, DateTimeWheel, FormInput, FormSelect, MonthCalendar },
  props: {
    sectionKey: { type: String, required: true },
    label: { type: String, required: true },
    slotStepMinutes: { type: Number, default: 30 },
    guestFields: { type: String, default: 'split' },
  },
  data() {
    const now = new Date();
    const today = computeBusinessDay(now);
    return {
      refreshIcon: refreshOutline,
      timeStartDate: '',
      timeEndDate: '',
      selectedDate: today,
      today,
      now,
      records: [],
      loadedRangeStart: null,
      loadedRangeEnd: null,
      slotHeight: 90,
      columnWidth: 160,
      resources: [],
      durationOptions: [
        { value: 1, label: 'На 1 час' },
        { value: 1.5, label: 'На 1.5 часа' },
        { value: 2, label: 'На 2 часа' },
        { value: 3, label: 'На 3 часа' },
        { value: 4, label: 'На 4 часа' },
      ],
      isOpen: false,
      showDateModal: false,
      showAddDateModal: false,
      showRecord: false,
      selectedRecord: null,
      duration: null,
      min_hour: 6,
      max_hour: 30,
      newRecord: { title: '', adult: 0, child: 0, resource_id: null, price: null, start: '', end: '' },
    };
  },
  computed: {
    canWrite() {
      return useAuthStore().canWrite;
    },
    resourceOptions() {
      return this.resources.map((r) => ({ value: r.id, label: r.label }));
    },
    businessStart() {
      return moment(this.selectedDate, 'YYYY-MM-DD').startOf('day').add(this.min_hour, 'hours');
    },
    businessEnd() {
      return this.businessStart.clone().add(this.max_hour - this.min_hour, 'hours');
    },
    timeSlots() {
      const slots = [];
      for (let hour = this.min_hour; hour < this.max_hour; hour++) {
        for (const minute of [0, 30]) {
          const h = hour % 24;
          slots.push({ key: `${hour}-${minute}`, label: `${String(h).padStart(2, '0')}:${minute === 0 ? '00' : '30'}` });
        }
      }
      return slots;
    },
    // Booking-slot granularity (availableTime()) — distinct from timeSlots'
    // fixed 30-min background grid rows, which stay put regardless of step.
    minuteSteps() {
      const steps = [];
      for (let m = 0; m < 60; m += this.slotStepMinutes) steps.push(m);
      return steps;
    },
    formattedDate() {
      const date = new Date(`${this.selectedDate}T00:00:00`);
      const str = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
      return str.charAt(0).toUpperCase() + str.slice(1);
    },
    addModalDateLabel() {
      const date = new Date(`${this.selectedDate}T00:00:00`);
      return new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: '2-digit', month: 'long' }).format(date);
    },
    nowLineTop() {
      const start = this.businessStart;
      const end = this.businessEnd;
      const now = moment(this.now);
      if (now.isBefore(start) || !now.isBefore(end)) return null;
      return (now.diff(start, 'minutes') / 30) * this.slotHeight;
    },
  },
  async mounted() {
    await Promise.all([this.getRecords(), this.loadResources()]);
    this.updateColumnWidth();
    this.scrollToCurrentTime();
    window.addEventListener('resize', this.updateColumnWidth);
    this._nowTimer = setInterval(() => {
      this.now = new Date();
      this.today = computeBusinessDay(this.now);
    }, 60000);
  },
  updated() {
    if (this.selectedDate === this.today) {
      clearTimeout(this._scrollTimer);
      this._scrollTimer = setTimeout(() => this.scrollToCurrentTime());
    }
  },
  beforeUnmount() {
    clearInterval(this._nowTimer);
    window.removeEventListener('resize', this.updateColumnWidth);
  },
  watch: {
    selectedDate(newDate) {
      if (!this.isDateLoaded(newDate)) {
        this.getRecords();
      }
    },
  },
  methods: {
    async loadResources() {
      this.resources = await apiFetch(`/resources?section=${this.sectionKey}`);
    },
    updateColumnWidth() {
      const wrapper = this.$refs.scheduleWrapper;
      if (!wrapper || !this.resources.length) return;
      const available = wrapper.clientWidth - 6 - 56;
      this.columnWidth = Math.max(160, Math.floor(available / this.resources.length));
    },
    scrollToCurrentTime() {
      this.$nextTick(() => {
        const body = this.$refs.gridBody;
        if (!body) return;
        if (this.nowLineTop !== null) {
          body.scrollTo({ top: Math.max(this.nowLineTop - 150, 0), behavior: 'smooth' });
        }
      });
    },
    resourceForId(id) {
      return this.resources.find((r) => r.id === Number(id));
    },
    async getRecords() {
      const center = moment(this.selectedDate, 'YYYY-MM-DD');
      // Plain strings, not moment instances — see mobile TimeSlotBookingView.vue's
      // getRecords for why (Vue reactivity proxy breaks moment's comparison methods).
      const rangeStart = center.clone().subtract(RECORDS_WINDOW_DAYS, 'days').startOf('day').format('YYYY-MM-DD HH:mm:ss');
      const rangeEnd = center.clone().add(RECORDS_WINDOW_DAYS, 'days').startOf('day').format('YYYY-MM-DD HH:mm:ss');
      const params = new URLSearchParams({
        section: this.sectionKey,
        start: rangeStart,
        end: rangeEnd,
      });
      const result = await apiFetch(`/records?${params}`);
      this.records = result.map((r) => ({
        ...r,
        start: r.start.replace('T', ' ').slice(0, -3),
        end: r.end.replace('T', ' ').slice(0, -3),
      }));
      this.loadedRangeStart = rangeStart;
      this.loadedRangeEnd = rangeEnd;
    },
    isDateLoaded(date) {
      if (!this.loadedRangeStart || !this.loadedRangeEnd) return false;
      const d = moment(date, 'YYYY-MM-DD');
      const fmt = 'YYYY-MM-DD HH:mm:ss';
      return d.isSameOrAfter(moment(this.loadedRangeStart, fmt)) && d.isBefore(moment(this.loadedRangeEnd, fmt));
    },
    recordsForResource(resourceId) {
      const start = this.businessStart;
      const end = this.businessEnd;
      return this.records.filter((r) => {
        if (Number(r.resource_id) !== Number(resourceId)) return false;
        const s = moment(r.start);
        return s.isSameOrAfter(start) && s.isBefore(end);
      });
    },
    recordStyle(record) {
      const start = moment(record.start);
      const end = moment(record.end);
      const offsetMin = start.diff(this.businessStart, 'minutes');
      const durationMin = end.diff(start, 'minutes');
      const top = (offsetMin / 30) * this.slotHeight;
      const height = Math.max((durationMin / 30) * this.slotHeight - 6, 34);
      return { top: `${top}px`, height: `${height}px` };
    },
    recordCardStyle(record) {
      const resource = this.resourceForId(record.resource_id);
      const color = resource ? resource.color : '#9aa0a6';
      return { ...this.recordStyle(record), backgroundColor: this.hexToRgba(color, 0.14), border: `1.5px solid ${this.hexToRgba(color, 0.5)}` };
    },
    hexToRgba(hex, alpha) {
      const h = hex.replace('#', '');
      const bigint = parseInt(h, 16);
      return `rgba(${(bigint >> 16) & 255}, ${(bigint >> 8) & 255}, ${bigint & 255}, ${alpha})`;
    },
    showTime(date) {
      return moment(date).format('HH:mm');
    },
    prevDay() {
      this.selectedDate = moment(this.selectedDate).subtract(1, 'day').format('YYYY-MM-DD');
    },
    nextDay() {
      this.selectedDate = moment(this.selectedDate).add(1, 'day').format('YYYY-MM-DD');
    },
    goToday() {
      this.now = new Date();
      this.today = computeBusinessDay(this.now);
      this.selectedDate = this.today;
      this.$nextTick(() => this.scrollToCurrentTime());
    },
    onPickDate(date) {
      this.selectedDate = date;
      this.showDateModal = false;
      this.showAddDateModal = false;
    },
    openAddModal() {
      this.newRecord = { title: '', adult: 0, child: 0, resource_id: null, price: null, start: '', end: '' };
      this.duration = null;
      this.isOpen = true;
    },
    async confirm() {
      if (this.newRecord.title && this.newRecord.resource_id && this.newRecord.start && this.newRecord.end) {
        await apiFetch(`/records?section=${this.sectionKey}`, { method: 'POST', body: this.newRecord });
        await showAlert('Запись добавлена');
        await this.getRecords();
        this.isOpen = false;
      } else {
        await showAlert('Заполните "Название записи" и "Время"');
      }
    },
    availableTime(resourceId, duration) {
      const durationMin = Number(duration) * 60;
      const [year, monthStr, day] = this.selectedDate.split('-');
      const month = Number(monthStr) - 1;
      const isToday = this.selectedDate === this.today;
      const nowHour = this.now.getHours();
      const nowMin = this.now.getMinutes();
      const records = this.records
        .filter((r) => r.resource_id == resourceId && moment(r.start).format('YYYY-MM-DD') === this.selectedDate)
        .map((r) => ({ start: new Date(r.start), end: new Date(r.end) }));
      const overlaps = (s1, e1) => records.some((rec) => s1 < rec.end && rec.start < e1);
      const fmt = (d) => moment(d).format('YYYY-MM-DD HH:mm');
      const times = [];
      for (let hour = this.min_hour; hour < this.max_hour; hour++) {
        for (const minute of this.minuteSteps) {
          if (isToday) {
            const diff = nowHour * 60 + nowMin - (hour * 60 + minute);
            if (diff > this.slotStepMinutes) continue;
          }
          const start = new Date(year, month, day, hour, minute);
          const end = new Date(start.getTime() + durationMin * 60000);
          if (!overlaps(start, end)) times.push({ start: fmt(start), end: fmt(end) });
        }
      }
      return times;
    },
    slotStyle(item, isSelected) {
      if (isSelected) return { background: item.color, color: '#fff' };
      return { background: this.hexToRgba(item.color, 0.15), color: item.color };
    },
    selectSlot(resourceId, date) {
      const newItem = { ...this.newRecord, resource_id: resourceId, start: date.start, end: date.end };
      if (newItem.start === this.newRecord.start) {
        this.newRecord.start = '';
      } else {
        this.newRecord = newItem;
      }
    },
    onRecordClick(record) {
      if (!this.canWrite) return;
      this.selectedRecord = { ...this.records.find((item) => item.id === record.id) };
      this.timeStartDate = this.selectedRecord.start;
      this.timeEndDate = this.selectedRecord.end;
      this.showRecord = true;
    },
    async confirmEdit() {
      this.selectedRecord.start = this.timeStartDate;
      this.selectedRecord.end = this.timeEndDate;
      await apiFetch(`/records/${this.selectedRecord.id}?section=${this.sectionKey}`, { method: 'PUT', body: this.selectedRecord });
      await showAlert('Запись обновлена');
      await this.getRecords();
      this.showRecord = false;
    },
    async deleteRecord() {
      const ok = await showConfirm('Вы точно хотите удалить запись?', { header: 'Удаление', confirmText: 'Удалить' });
      if (!ok) return;
      await apiFetch(`/records/${this.selectedRecord.id}?section=${this.sectionKey}`, { method: 'DELETE' });
      await showAlert('Запись удалена');
      await this.getRecords();
      this.showRecord = false;
    },
  },
};
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding: 24px 28px;
  box-sizing: border-box;
  background: #f4f5f7;
}

.page-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.page-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: #1c1c1e;
  margin: 0;
}

.today-btn {
  border: none;
  background: rgba(33, 150, 243, 0.1);
  color: #2196f3;
  font-weight: 700;
  font-size: 0.8rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  padding: 8px 14px;
  border-radius: 10px;
  cursor: pointer;
}

.link-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  color: #9aa0a6;
  font-weight: 700;
  font-size: 0.8rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  cursor: pointer;
}

.link-btn ion-icon {
  font-size: 16px;
}

.primary-btn {
  border: none;
  background: #2196f3;
  color: #fff;
  font-weight: 700;
  font-size: 0.8rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  padding: 12px 20px;
  border-radius: 12px;
  cursor: pointer;
}

.date-nav {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-arrow {
  border: none;
  background: transparent;
  color: #9aa0a6;
  font-size: 22px;
  line-height: 1;
  padding: 4px 10px;
  cursor: pointer;
}

.date-pill {
  border: none;
  background: #eef0f3;
  border-radius: 18px;
  padding: 8px 18px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #2b2f33;
  cursor: pointer;
  width: 300px;
  box-sizing: border-box;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.schedule-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  padding: 10px 4px;
  overflow: hidden;
}

/* Single scroll container for both axes — sticky header row and sticky time
   column both resolve unambiguously against this one element. Splitting x/y
   scroll across nested containers makes overflow-x/overflow-y's computed
   value quirk (one auto forces the other from visible to auto too) turn an
   inner container into an accidental second scroll container, which breaks
   sticky positioning for anything nested inside it. */
.schedule-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  position: relative;
}

.grid-inner {
  width: max-content;
  min-width: 100%;
}

.room-headers {
  position: sticky;
  top: 0;
  z-index: 4;
  display: flex;
  background: #fff;
}

.time-col-spacer {
  width: 56px;
  flex-shrink: 0;
  position: sticky;
  left: 0;
  z-index: 5;
  background: #fff;
}

.room-header {
  flex-shrink: 0;
  margin: 0 2px;
  font-size: 0.88rem;
  font-weight: 700;
  padding-bottom: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.room-header .dot,
.slots-room-title .dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-right: 6px;
}

.grid-rows {
  display: flex;
  position: relative;
}

.time-col {
  flex-shrink: 0;
  width: 56px;
  position: sticky;
  left: 0;
  z-index: 2;
  background: #fff;
}

.time-label {
  font-size: 0.7rem;
  color: #9aa0a6;
  text-align: right;
  padding-right: 8px;
  box-sizing: border-box;
}

.room-col {
  flex-shrink: 0;
  position: relative;
  margin: 0 2px;
  border-radius: 12px;
}

.now-line {
  position: absolute;
  left: 56px;
  right: 0;
  height: 2px;
  background: #ea4335;
  z-index: 2;
}

.event-card {
  position: absolute;
  left: 4px;
  right: 4px;
  border-radius: 10px;
  padding: 6px 8px;
  cursor: pointer;
  font-size: 0.76rem;
  box-sizing: border-box;
  overflow: hidden;
}

.event-title {
  font-weight: 700;
  font-size: 0.8rem;
  color: #1c1c1e;
  line-height: 1.2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.event-time {
  color: #6a6f75;
  font-size: 0.7rem;
  margin-top: 2px;
}

.event-meta {
  color: #2e7d32;
  font-size: 0.68rem;
  margin-top: 2px;
}

.event-price {
  font-weight: 700;
  font-size: 0.76rem;
  margin-top: 2px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-row > * {
  flex: 1;
  min-width: 0;
}

.date-chip {
  display: inline-block;
  border: none;
  background: rgba(33, 150, 243, 0.12);
  color: #2196f3;
  font-weight: 600;
  font-size: 0.9rem;
  border-radius: 14px;
  padding: 10px 16px;
  margin-bottom: 14px;
  cursor: pointer;
}

.slots-room {
  margin-bottom: 16px;
}

.slots-room-title {
  display: flex;
  align-items: center;
  font-weight: 700;
  font-size: 0.9rem;
  margin-bottom: 8px;
}

.slots-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.slot-btn {
  border: none;
  font-weight: 600;
  font-size: 0.8rem;
  padding: 10px 4px;
  border-radius: 14px;
  cursor: pointer;
}

.pill-btn {
  border: none;
  border-radius: 12px;
  padding: 10px 20px;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
}

.pill-btn.ghost {
  background: #f4f5f7;
  color: #4a4f55;
}

.pill-btn.primary {
  background: #2196f3;
  color: #fff;
}

.pill-btn.danger {
  background: rgba(244, 67, 54, 0.12);
  color: #d32f2f;
  margin-right: auto;
}
</style>
