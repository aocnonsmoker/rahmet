<template>
  <ion-page>
    <ion-header :translucent="true" class="spa-header">
      <ion-toolbar class="spa-toolbar">
        <div class="header-card">
          <button class="header-btn today" type="button" @click="goToday">Сегодня</button>
          <div class="header-title">{{ label }}</div>
          <button class="header-btn refresh" type="button" @click="getRecords">
            <ion-icon :icon="refreshIcon"></ion-icon>
            Обновить
          </button>
          <HeaderMenuButton />
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :scroll-y="false">
      <div class="page-root">
        <ion-button v-if="canWrite" expand="block" class="add-btn" @click="setOpen(true)"
          >+ Добавить запись</ion-button
        >

        <div class="date-nav">
          <button class="nav-arrow" type="button" @click="prevDay">‹</button>
          <button class="date-pill" type="button" @click="showDateModal = true">{{ formattedDate }}</button>
          <button class="nav-arrow" type="button" @click="nextDay">›</button>
        </div>
        <ion-modal :keep-contents-mounted="true" :is-open="showDateModal" @didDismiss="showDateModal = false">
          <MonthCalendar
            :model-value="selectedDate"
            :events="records"
            @update:modelValue="onPickDate"
          />
        </ion-modal>

        <div class="schedule-wrapper" ref="scheduleWrapper">
          <div class="schedule-scroll">
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

            <div class="grid-body" ref="gridBody">
              <div class="time-col">
                <div
                  v-for="slot in timeSlots"
                  :key="slot.key"
                  class="time-label"
                  :style="{ height: slotHeight + 'px' }"
                >{{ slot.label }}</div>
              </div>
              <div
                v-for="resource in resources"
                :key="resource.id"
                class="room-col"
                :style="{ width: columnWidth + 'px', height: timeSlots.length * slotHeight + 'px', backgroundColor: hexToRgba(resource.color, 0.10) }"
              >
                <div
                  v-for="record in recordsForResource(resource.id)"
                  :key="record.id"
                  class="event-card"
                  :style="recordCardStyle(record)"
                  @click="onRecordClick(record)"
                >
                  <div class="event-title" v-html="record.title" />
                  <div class="event-time">{{ showTime(record.start) }}–{{ showTime(record.end) }}</div>
                  <div v-if="isLateNight(record)">
                    <div v-if="record.price" class="event-price">{{ record.price }} тг.</div>
                  </div>
                  <div v-else>
                    <div v-if="record.adult || record.child" class="event-meta">В: {{ record.adult }} · Д: {{ record.child }}</div>
                    <div v-if="record.price" class="event-price">{{ record.price }} тг.</div>
                  </div>
                </div>
              </div>
              <div v-if="nowLineTop !== null" class="now-line" :style="{ top: nowLineTop + 'px' }"></div>
            </div>
          </div>
        </div>

        <!-- Модальное окно -->
        <ion-modal class="add-modal" :is-open="isOpen">
          <ion-header class="add-modal-header ion-no-border">
            <ion-toolbar class="add-modal-toolbar">
              <ion-buttons slot="start">
                <ion-button fill="clear" color="medium" @click="cancel()">Отменить</ion-button>
              </ion-buttons>
              <ion-buttons slot="end">
                <ion-button fill="clear" color="primary" :strong="true" @click="confirm()"
                  >Записать</ion-button
                >
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding add-modal-content">
            <FormInput
              label="Название записи"
              type="text"
              placeholder="Имя клиента или телефон"
              :model-value="newRecord.title"
              @update:modelValue="newRecord.title = $event"
            />

            <div class="form-row">
              <FormInput
                label="Взрослые"
                type="number"
                :model-value="newRecord.adult"
                @update:modelValue="newRecord.adult = $event"
              />
              <FormInput
                label="Детские"
                type="number"
                :model-value="newRecord.child"
                @update:modelValue="newRecord.child = $event"
              />
            </div>

            <button class="date-chip" type="button" @click="showAddDateModal = true">{{ addModalDateLabel }}</button>
            <ion-modal :keep-contents-mounted="true" :is-open="showAddDateModal" @didDismiss="showAddDateModal = false">
              <MonthCalendar
                :model-value="selectedDate"
                :events="records"
                @update:modelValue="onPickDate"
              />
            </ion-modal>

            <FormSelect
              label="Время"
              placeholder="Выберите время"
              :model-value="duration"
              :options="durationOptions"
              @update:modelValue="duration = $event"
            />

            <div class="form-row" v-if="duration == 0">
              <FormInput
                label="Введите свое время (час)"
                type="number"
                placeholder="0"
                :model-value="ownHour"
                @update:modelValue="ownHour = $event"
              />
              <FormSelect
                v-if="minuteOptions.length > 1"
                label="Минут"
                :model-value="ownMinut"
                :options="minuteOptions"
                @update:modelValue="ownMinut = $event"
              />
            </div>
            <template v-if="duration || ownHour || ownMinut">
              <div class="slots-scroll">
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
                    >{{ i.start.split(" ")[1] }}–{{ i.end.split(" ")[1] }}</button>
                  </div>
                </div>
              </div>
            </template>
          </ion-content>
        </ion-modal>
        <!-- Модальное окно записи -->
        <ion-modal class="add-modal" :is-open="showRecord">
          <ion-header class="add-modal-header ion-no-border">
            <ion-toolbar class="add-modal-toolbar">
              <ion-buttons slot="start">
                <ion-button fill="clear" color="medium" @click="cancel()">Отменить</ion-button>
              </ion-buttons>
              <ion-buttons slot="end">
                <ion-button fill="clear" color="primary" :strong="true" @click="confirmEdit()"
                  >Записать</ion-button
                >
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding add-modal-content">
            <FormInput
              label="Название записи"
              type="text"
              placeholder="Имя клиента или телефон"
              :model-value="selectedRecord.title"
              @update:modelValue="selectedRecord.title = $event"
            />

            <div class="form-row">
              <FormInput
                label="Взрослые"
                type="number"
                :model-value="selectedRecord.adult"
                @update:modelValue="selectedRecord.adult = $event"
              />
              <FormInput
                label="Детские"
                type="number"
                :model-value="selectedRecord.child"
                @update:modelValue="selectedRecord.child = $event"
              />
            </div>

            <FormInput
              label="Сумма"
              type="number"
              placeholder="0"
              suffix="тг."
              :model-value="selectedRecord.price"
              @update:modelValue="selectedRecord.price = $event"
            />

            <FormSelect
              label="Объект"
              :model-value="selectedRecord.resource_id"
              :options="resourceOptions"
              @update:modelValue="selectedRecord.resource_id = $event"
            />

            <div class="wheel-row">
              <span class="wheel-label">С</span>
              <ion-datetime v-model="timeStartDate" presentation="date-time" :prefer-wheel="true" :minute-values="minuteValuesAttr"></ion-datetime>
            </div>
            <div class="wheel-row">
              <span class="wheel-label">До</span>
              <ion-datetime v-model="timeEndDate" presentation="date-time" :prefer-wheel="true" :minute-values="minuteValuesAttr"></ion-datetime>
            </div>

            <ion-button expand="block" class="delete-btn" color="danger" @click="deleteRecord">Удалить</ion-button>
          </ion-content>
        </ion-modal>
      </div>
    </ion-content>
  </ion-page>
</template>

<script>
import moment from "moment";
import MonthCalendar from "@/components/MonthCalendar.vue";
import FormInput from "@/components/FormInput.vue";
import FormSelect from "@/components/FormSelect.vue";
import HeaderMenuButton from "@/components/HeaderMenuButton.vue";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  IonButton,
  IonModal,
  IonDatetime,
  IonIcon,
} from "@ionic/vue";
import { refreshOutline } from "ionicons/icons";
import { apiFetch } from "@/services/api";
import { showAlert, showConfirm } from "@/services/dialogs";
import { useAuthStore } from "@/stores/auth";

// Business day runs ~9:00 to 3:00 next day, so before 3am still belongs to yesterday's schedule.
function computeBusinessDay(date) {
  const d = moment(date);
  if (d.hour() < 3) {
    return d.clone().subtract(1, "day").format("YYYY-MM-DD");
  }
  return d.format("YYYY-MM-DD");
}

export default {
  name: "TimeSlotBookingView",
  components: {
    IonContent,
    IonHeader,
    IonPage,
    IonToolbar,
    IonButton,
    IonModal,
    IonDatetime,
    IonIcon,
    MonthCalendar,
    FormInput,
    FormSelect,
    HeaderMenuButton,
  },
  props: {
    sectionKey: { type: String, required: true },
    label: { type: String, required: true },
    slotStepMinutes: { type: Number, default: 30 },
  },
  data() {
    const now = new Date();
    const today = computeBusinessDay(now);
    return {
      refreshIcon: refreshOutline,
      timeStartDate: null,
      timeEndDate: null,
      selectedDate: today,
      today,
      now,
      records: [],
      slotHeight: 50,
      columnWidth: 90,
      resources: [],
      durationOptions: [
        { value: 1, label: "На 1 час" },
        { value: 1.5, label: "На 1.5 часа" },
        { value: 2, label: "На 2 часа" },
        { value: 3, label: "На 3 часа" },
        { value: 4, label: "На 4 часа" },
        { value: 0, label: "Свое время" },
      ],
      isOpen: false,
      showDateModal: false,
      showAddDateModal: false,
      showRecord: false,
      selectedRecord: null,
      duration: null,
      min_hour: 3,
      max_hour: 27,
      newRecord: {
        title: '',
        adult: 0,
        child: 0,
        resource_id: null,
        price: null,
        start: '',
        end: ''
      },
      ownHour: null,
      ownMinut: null,
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
      return moment(this.selectedDate, "YYYY-MM-DD").startOf("day").add(this.min_hour, "hours");
    },
    businessEnd() {
      return this.businessStart.clone().add(this.max_hour - this.min_hour, "hours");
    },
    timeSlots() {
      const slots = [];
      for (let hour = this.min_hour; hour < this.max_hour; hour++) {
        for (const minute of [0, 30]) {
          const h = hour % 24;
          slots.push({
            key: `${hour}-${minute}`,
            label: `${String(h).padStart(2, "0")}:${minute === 0 ? "00" : "30"}`,
          });
        }
      }
      return slots;
    },
    formattedDate() {
      const date = new Date(`${this.selectedDate}T00:00:00`);
      const str = new Intl.DateTimeFormat("ru-RU", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(date);
      return str.charAt(0).toUpperCase() + str.slice(1);
    },
    addModalDateLabel() {
      const date = new Date(`${this.selectedDate}T00:00:00`);
      return new Intl.DateTimeFormat("ru-RU", {
        weekday: "short",
        day: "2-digit",
        month: "long",
      }).format(date);
    },
    nowLineTop() {
      const start = this.businessStart;
      const end = this.businessEnd;
      const now = moment(this.now);
      if (now.isBefore(start) || !now.isBefore(end)) return null;
      const minutes = now.diff(start, "minutes");
      return (minutes / 30) * this.slotHeight;
    },
    minuteSteps() {
      const steps = [];
      for (let m = 0; m < 60; m += this.slotStepMinutes) steps.push(m);
      return steps;
    },
    minuteValuesAttr() {
      return this.minuteSteps.join(",");
    },
    minuteOptions() {
      return this.minuteSteps.map((m) => ({ value: m, label: String(m) }));
    },
  },
  async mounted() {
    await Promise.all([this.getRecords(), this.loadResources()]);
    this.scrollToCurrentTime();
    this._nowTimer = setInterval(this.updateNow, 60000);
    this.updateColumnWidth();
    window.addEventListener('resize', this.updateColumnWidth);
  },
  beforeUnmount() {
    clearInterval(this._nowTimer);
    window.removeEventListener('resize', this.updateColumnWidth);
  },
  updated() {
    if (this.selectedDate === this.today) {
      clearTimeout(this._scrollTimer);
      this._scrollTimer = setTimeout(() => {
        this.scrollToCurrentTime();
      });
    }
  },
  methods: {
    async loadResources() {
      this.resources = await apiFetch(`/resources?section=${this.sectionKey}`);
    },
    // Fit exactly 4 room columns in the visible width — beyond 4 rooms the
    // grid scrolls horizontally instead of squeezing every column narrower.
    updateColumnWidth() {
      const wrapper = this.$refs.scheduleWrapper;
      if (!wrapper) return;
      const available = wrapper.clientWidth - 6 /* padding */ - 30 /* time-col-spacer */;
      this.columnWidth = Math.max(70, Math.floor(available / 4));
    },
    resourceForId(id) {
      return this.resources.find((r) => r.id === Number(id));
    },
    async getRecords() {
        this.records = [];
        const result = await apiFetch(`/records?section=${this.sectionKey}`);
        for (const r of result) {
          r.start = r.start.replace("T", " ").slice(0, -3);
          r.end = r.end.replace("T", " ").slice(0, -3);
          this.records.push(r)
        }
    },
    recordsForResource(resourceId) {
      const start = this.businessStart;
      const end = this.businessEnd;
      return this.records.filter(r => {
        if (Number(r.resource_id) !== Number(resourceId)) return false;
        const s = moment(r.start);
        return s.isSameOrAfter(start) && s.isBefore(end);
      });
    },
    recordStyle(record) {
      const start = moment(record.start);
      const end = moment(record.end);
      const offsetMin = start.diff(this.businessStart, "minutes");
      const durationMin = end.diff(start, "minutes");
      const top = (offsetMin / 30) * this.slotHeight;
      const height = Math.max((durationMin / 30) * this.slotHeight - 6, 34);
      return { top: `${top}px`, height: `${height}px` };
    },
    recordCardStyle(record) {
      const resource = this.resourceForId(record.resource_id);
      const color = resource ? resource.color : '#9aa0a6';
      return {
        ...this.recordStyle(record),
        backgroundColor: this.hexToRgba(color, 0.16),
        border: `1.5px solid ${this.hexToRgba(color, 0.55)}`,
      };
    },
    scrollToCurrentTime () {
      this.$nextTick(() => {
        const body = this.$refs.gridBody;
        if (!body) return;
        if (this.nowLineTop !== null) {
          body.scrollTo({ top: Math.max(this.nowLineTop - 150, 0), behavior: 'smooth' });
        }
      });
    },
    updateNow() {
      this.now = new Date();
      this.today = computeBusinessDay(this.now);
    },
    goToday() {
      this.updateNow();
      this.selectedDate = this.today;
      this.$nextTick(() => {
        this.scrollToCurrentTime();
      });
    },
    prevDay() {
      const now = Date.now();
      if (now - (this._lastNavClick || 0) < 120) return;
      this._lastNavClick = now;
      this.selectedDate = moment(this.selectedDate).subtract(1, 'day').format('YYYY-MM-DD');
    },
    nextDay() {
      const now = Date.now();
      if (now - (this._lastNavClick || 0) < 120) return;
      this._lastNavClick = now;
      this.selectedDate = moment(this.selectedDate).add(1, 'day').format('YYYY-MM-DD');
    },
    onPickDate(date) {
      this.selectedDate = date;
      this.showDateModal = false;
      this.showAddDateModal = false;
    },
    cancel() {
      this.isOpen = false;
      this.showRecord = false;
      this.duration = null;
      this.ownHour = null;
      this.ownMinut = null;
      this.newRecord = {
        title: '',
        adult: 0,
        child: 0,
        resource_id: null,
        price: null,
        start: '',
        end: ''
      }
    },
    async confirm() {
        if (this.newRecord.title && this.newRecord.resource_id && this.newRecord.start && this.newRecord.end) {
          await apiFetch(`/records?section=${this.sectionKey}`, { method: 'POST', body: this.newRecord });
          await showAlert('Запись добавлена')
          await this.getRecords();
          this.isOpen = !this.isOpen;
          this.cancel();
        } else {
          await showAlert('Заполните "Название записи" и "Время"')
        }
    },
    async confirmEdit() {
        this.selectedRecord.start = `${this.timeStartDate.split('T')[0]} ${this.timeStartDate.split('T')[1]}`
        this.selectedRecord.end = `${this.timeEndDate.split('T')[0]} ${this.timeEndDate.split('T')[1]}`
        await apiFetch(`/records/${this.selectedRecord.id}?section=${this.sectionKey}`, { method: 'PUT', body: this.selectedRecord });
        await showAlert('Запись обновлена')
        await this.getRecords();
        this.showRecord = false;
    },
    setOpen() {
      this.isOpen = !this.isOpen;
    },
    availableTime(resourceId, duration) {
        // Переводим длительность в минуты
        if (this.ownHour !== null || this.ownMinut !== null) {
            duration = (Number(this.ownHour || 0) * 60) + Number(this.ownMinut || 0);
        } else {
            duration = Number(duration) * 60; // duration в часах
        }

        const [year, monthStr, day] = this.selectedDate.split('-');
        const month = Number(monthStr) - 1;

        const isToday = this.selectedDate === this.today;
        const nowHour = this.now.getHours();
        const nowMin = this.now.getMinutes();

        // Список записей на этот день и ресурс
        const records = this.records
            .filter(r => r.resource_id == resourceId && moment(r.start).format("YYYY-MM-DD") === this.selectedDate)
            .map(r => ({
                start: new Date(r.start),
                end: new Date(r.end)
            }));

        // Проверка пересечения слот → запись
        const overlaps = (s1, e1) => records.some(rec => s1 < rec.end && rec.start < e1);

        // Формат даты
        const fmt = d => moment(d).format("YYYY-MM-DD HH:mm");

        const times = [];

        // Идём по рабочим часам
        for (let hour = this.min_hour; hour < this.max_hour; hour++) {

            // Варианты минут по шагу раздела (15/30/60)
            for (let minute of this.minuteSteps) {

                // Пропускаем прошлое время
                if (isToday) {
                    const slotTime = hour * 60 + minute;
                    const nowTime  = nowHour * 60 + nowMin;

                    const diff = nowTime - slotTime;

                    // если слот в прошлом и больше чем на один шаг — пропускаем
                    if (diff > this.slotStepMinutes) continue;
                }

                const start = new Date(year, month, day, hour, minute);
                const end   = new Date(start.getTime() + duration * 60000);

                // Проверка пересечения с записями
                if (!overlaps(start, end)) {
                    times.push({
                        start: fmt(start),
                        end: fmt(end),
                    });
                }
            }
        }

        return times;
    },
    showTime(date) {
        return moment(date).format("HH:mm");
    },
    hexToRgba(hex, alpha) {
      const h = hex.replace('#', '');
      const bigint = parseInt(h, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },
    slotStyle(item, isSelected) {
      if (isSelected) {
        return { background: item.color, color: '#fff' };
      }
      return { background: this.hexToRgba(item.color, 0.15), color: item.color };
    },
    selectSlot(resourceId, date) {
        const newItem = {...this.newRecord, resource_id: resourceId, start: date.start, end: date.end}
        if (newItem.start == this.newRecord.start) {
          this.newRecord.start = ''
        } else {
          this.newRecord = newItem;
        }
    },
    onRecordClick(record) {
        if (!this.canWrite) return;
        this.selectedRecord = this.records.find(item => item.id == record.id);
        this.timeStartDate = `${this.selectedRecord.start.split(' ')[0]}T${this.selectedRecord.start.split(' ')[1]}`
        this.timeEndDate = `${this.selectedRecord.end.split(' ')[0]}T${this.selectedRecord.end.split(' ')[1]}`
        if (this.selectedRecord) {
            this.showRecord = true;
        }
    },
    async deleteRecord() {
      const apply = await showConfirm('Вы точно хотите удалить запись?', { header: 'Удаление', confirmText: 'Удалить' })
      if (apply) {
        await apiFetch(`/records/${this.selectedRecord.id}?section=${this.sectionKey}`, { method: 'DELETE' });
        await showAlert('Запись удалена')
        await this.getRecords();
        this.showRecord = false;
      }
    },
    isLateNight(record) {
      const end = new Date(record.end);
      const hour = end.getHours();
      const minute = end.getMinutes();
      return hour === 0 && minute === 30;
    },
  },
};
</script>

<style>
ion-content::part(scroll) {
  overscroll-behavior: none;
}

ion-page {
  overscroll-behavior: none;
}
</style>

<style scoped>
.spa-toolbar {
  --background: transparent;
  --border-color: transparent;
  --min-height: auto;
  --padding-start: 0;
  --padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 0;
}

.header-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  padding: 14px 16px;
  margin: 6px 10px 0;
}

.header-title {
  font-weight: 700;
  font-size: 1rem;
  color: #1c1c1e;
}

.header-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  padding: 0;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.header-btn.today {
  color: #2196f3;
}

.header-btn.refresh {
  color: #9aa0a6;
}

.header-btn ion-icon {
  font-size: 16px;
}

.page-root {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 8px 4px 4px;
  background: #f4f5f7;
}

.add-btn {
  --border-radius: 12px;
  font-weight: 700;
  margin: 4px 2px 10px;
}

.date-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 0 2px 12px;
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
  font-size: 0.95rem;
  font-weight: 600;
  color: #2b2f33;
  cursor: pointer;
  width: 270px;
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
  border-radius: 18px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  padding: 10px 3px 8px 3px;
  overflow: hidden;
}

.schedule-scroll {
  flex: 1;
  min-height: 0;
  overflow-x: auto;
  display: flex;
  flex-direction: column;
}

.room-headers {
  display: flex;
  width: max-content;
  min-width: 100%;
}

.time-col-spacer {
  width: 30px;
  flex-shrink: 0;
  position: sticky;
  left: 0;
  z-index: 3;
  background: #fff;
}

.room-header {
  flex-shrink: 0;
  margin: 0 2px;
  text-align: center;
  font-size: 0.8rem;
  font-weight: 700;
  padding-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-header .dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-right: 4px;
}

.grid-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  position: relative;
  width: max-content;
  min-width: 100%;
}

.time-col {
  flex-shrink: 0;
  position: sticky;
  left: 0;
  z-index: 2;
  background: #fff;
}

.time-label {
  font-size: 0.62rem;
  color: #9aa0a6;
  text-align: right;
  padding-right: 2px;
  box-sizing: border-box;
}

.room-col {
  flex-shrink: 0;
  min-width: 0;
  position: relative;
  margin: 0 2px;
  border-radius: 14px;
}

.now-line {
  position: absolute;
  left: 30px;
  right: 0;
  height: 2px;
  background: #ea4335;
  z-index: 2;
}

.event-card {
  position: absolute;
  left: 2px;
  right: 2px;
  border-radius: 10px;
  padding: 3px 3px;
  cursor: pointer;
  font-size: 0.74rem;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.event-card > div:not(.event-title) {
  flex-shrink: 0;
}

.event-title {
  flex-shrink: 1;
  min-height: 0;
  font-weight: 700;
  font-size: 0.78rem;
  line-height: 1.15;
  white-space: normal;
  overflow: hidden;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
}
.event-time {
  color: #6a6f75;
  font-size: 0.6rem;
  margin: 1px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.event-meta {
  color: #2e7d32;
  font-size: 0.58rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.event-price { font-weight: 700; font-size: 0.72rem; }

.add-modal {
  --border-radius: 20px;
}

.add-modal-toolbar {
  --border-color: transparent;
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

.wheel-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.wheel-label {
  font-weight: 700;
  color: #1c1c1e;
  min-width: 24px;
}

.delete-btn {
  --border-radius: 24px;
  font-weight: 700;
  margin-top: 12px;
}

.slots-scroll {
  max-height: 420px;
  overflow-y: auto;
  margin-top: 4px;
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

.slots-room-title .dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-right: 6px;
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
</style>
