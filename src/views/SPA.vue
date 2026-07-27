<template>
  <ion-page>
    <ion-header :translucent="true" class="spa-header">
      <ion-toolbar class="spa-toolbar">
        <div class="header-card">
          <button class="header-btn today" type="button" @click="goToday">Сегодня</button>
          <div class="header-title">Расписание</div>
          <button class="header-btn refresh" type="button" @click="getEvents">
            <ion-icon :icon="refreshIcon"></ion-icon>
            Обновить
          </button>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :scroll-y="false">
      <div class="page-root">
        <ion-button expand="block" class="add-btn" @click="setOpen(true)"
          >+ Добавить запись</ion-button
        >

        <div class="date-nav">
          <button class="nav-arrow" type="button" @click="prevDay">‹</button>
          <button id="date-trigger" class="date-pill" type="button">{{ formattedDate }}</button>
          <button class="nav-arrow" type="button" @click="nextDay">›</button>
        </div>
        <ion-modal :keep-contents-mounted="true" trigger="date-trigger" ref="dateModal">
          <MonthCalendar
            :model-value="selectedDate"
            :events="events"
            @update:modelValue="onPickDate"
          />
        </ion-modal>

        <div class="schedule-wrapper">
          <div class="room-headers">
            <div class="time-col-spacer"></div>
            <div
              v-for="room in splitDays"
              :key="room.id"
              class="room-header"
              :style="`color: ${room.color}`"
            >
              <span class="dot" :style="`background: ${room.color}`"></span>{{ room.label }}
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
              v-for="room in splitDays"
              :key="room.id"
              class="room-col"
              :class="room.class"
              :style="{ height: timeSlots.length * slotHeight + 'px' }"
            >
              <div
                v-for="event in eventsForRoom(room.id)"
                :key="event.id"
                class="event-card"
                :class="event.class"
                :style="eventStyle(event)"
                @click="onEventClick(event)"
              >
                <div class="event-title" v-html="event.title" />
                <div class="event-time">{{ showDate(event.start) }}–{{ showDate(event.end) }}</div>
                <div v-if="isLateNight(event)">
                  <div v-if="event.price" class="event-price">{{ event.price }} тг.</div>
                </div>
                <div v-else>
                  <div v-if="event.adult || event.child" class="event-meta">В: {{ event.adult }} · Д: {{ event.child }}</div>
                  <div v-if="event.price" class="event-price">{{ event.price }} тг.</div>
                </div>
              </div>
            </div>
            <div v-if="nowLineTop !== null" class="now-line" :style="{ top: nowLineTop + 'px' }"></div>
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
              :model-value="newEvent.title"
              @update:modelValue="newEvent.title = $event"
            />

            <div class="form-row">
              <FormInput
                label="Взрослые"
                type="number"
                :model-value="newEvent.adult"
                @update:modelValue="newEvent.adult = $event"
              />
              <FormInput
                label="Детские"
                type="number"
                :model-value="newEvent.child"
                @update:modelValue="newEvent.child = $event"
              />
            </div>

            <button id="add-date-trigger" class="date-chip" type="button">{{ addModalDateLabel }}</button>
            <ion-modal :keep-contents-mounted="true" trigger="add-date-trigger" ref="addDateModal">
              <MonthCalendar
                :model-value="selectedDate"
                :events="events"
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
                placeholder="000"
                :model-value="ownHour"
                @update:modelValue="ownHour = $event"
              />
              <FormSelect
                label="Минут"
                :model-value="ownMinut"
                :options="minuteOptions"
                @update:modelValue="ownMinut = $event"
              />
            </div>
            <template v-if="duration || (ownHour)">
              <div class="slots-scroll">
                <div v-for="item in splitDays" :key="`${item.id}-${duration}`" class="slots-room">
                  <div class="slots-room-title" :style="`color: ${item.color}`">
                    <span class="dot" :style="`background: ${item.color}`"></span>{{ item.label }}
                  </div>
                  <div class="slots-grid">
                    <button
                      v-for="i in availableTime(item.id, duration)"
                      :key="i.start"
                      type="button"
                      class="slot-btn"
                      :style="slotStyle(item, item.id == newEvent.split && i.start == newEvent.start)"
                      @click="selectDate(item.id, i)"
                    >{{ i.start.split(" ")[1] }}–{{ i.end.split(" ")[1] }}</button>
                  </div>
                </div>
              </div>
            </template>
          </ion-content>
        </ion-modal>
        <!-- Модальное окно события -->
        <ion-modal class="add-modal" :is-open="showEvent">
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
              :model-value="selectedEvent.title"
              @update:modelValue="selectedEvent.title = $event"
            />

            <div class="form-row">
              <FormInput
                label="Взрослые"
                type="number"
                :model-value="selectedEvent.adult"
                @update:modelValue="selectedEvent.adult = $event"
              />
              <FormInput
                label="Детские"
                type="number"
                :model-value="selectedEvent.child"
                @update:modelValue="selectedEvent.child = $event"
              />
            </div>

            <FormInput
              label="Сумма"
              type="number"
              placeholder="0"
              suffix="тг."
              :model-value="selectedEvent.price"
              @update:modelValue="selectedEvent.price = $event"
            />

            <FormSelect
              label="Баня"
              :model-value="selectedEvent.split"
              :options="roomOptions"
              @update:modelValue="selectedEvent.split = $event"
            />

            <div class="wheel-row">
              <span class="wheel-label">С</span>
              <ion-datetime v-model="timeStartDate" presentation="date-time" :prefer-wheel="true" minuteValues="0,30"></ion-datetime>
            </div>
            <div class="wheel-row">
              <span class="wheel-label">До</span>
              <ion-datetime v-model="timeEndDate" presentation="date-time" :prefer-wheel="true" minuteValues="0,30"></ion-datetime>
            </div>

            <ion-button expand="block" class="delete-btn" color="danger" @click="deleteEvent">Удалить</ion-button>
          </ion-content>
        </ion-modal>
      </div>
    </ion-content>
  </ion-page>
</template>

<script>
import moment from "moment";
import { layoutOverlaps } from "@/utils/eventLayout";
import MonthCalendar from "@/components/MonthCalendar.vue";
import FormInput from "@/components/FormInput.vue";
import FormSelect from "@/components/FormSelect.vue";
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

// Business day runs ~9:00 to 3:00 next day, so before 3am still belongs to yesterday's schedule.
function computeBusinessDay(date) {
  const d = moment(date);
  if (d.hour() < 3) {
    return d.clone().subtract(1, "day").format("YYYY-MM-DD");
  }
  return d.format("YYYY-MM-DD");
}

export default {
  name: "HomePage",
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
  },
  data() {
    const now = new Date();
    const today = computeBusinessDay(now);
    return {
      refreshIcon: refreshOutline,
      timeStartDate: null,
      timeEndDate: null,
      curDate: moment(new Date()).format("DD-MM-YYYY HH:mm"),
      datePicker: moment(new Date()).format("YYYY-MM-DD"),
      selectedDate: today,
      today,
      now,
      events: [],
      slotHeight: 50,
      splitDays: [
        { id: 1, color: "#2196f3", label: "Баня 1", class: "split1" },
        { id: 2, color: "#4caf50", label: "Баня 2", class: "split2" },
        { id: 3, color: "#ff9800", label: "Баня 3", class: "split3" },
        { id: 4, color: "#f44336", label: "Баня 4", class: "split4" },
      ],
      durationOptions: [
        { value: 1, label: "На 1 час" },
        { value: 1.5, label: "На 1.5 часа" },
        { value: 2, label: "На 2 часа" },
        { value: 3, label: "На 3 часа" },
        { value: 4, label: "На 4 часа" },
        { value: 0, label: "Свое время" },
      ],
      minuteOptions: [
        { value: 0, label: "0" },
        { value: 0.5, label: "30" },
      ],
      roomOptions: [
        { value: 1, label: "Баня 1" },
        { value: 2, label: "Баня 2" },
        { value: 3, label: "Баня 3" },
        { value: 4, label: "Баня 4" },
      ],
      isOpen: false,
      showEvent: false,
      selectedEvent: null,
      formatOptions: {
        date: {
          weekday: "short",
          month: "long",
          day: "2-digit",
        },
      },
      duration: null,
      min_hour: 3,
      max_hour: 27,
      newEvent: {
        title: '',
        adult: 0,
        child: 0,
        split: null,
        class: '',
        price: null,
        start: '',
        end: ''
      },
      ownHour: null,
      ownMinut: null,
      classes: ['blue-event', 'green-event', 'orange-event', 'red-event'],
    };
  },
  computed: {
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
  },
  async mounted() {
    await this.getEvents();
    this.scrollToCurrentTime();
    this._nowTimer = setInterval(this.updateNow, 60000);
  },
  beforeUnmount() {
    clearInterval(this._nowTimer);
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
    async getEvents() {
        this.events = [];
        const response = await fetch('http://79.76.52.210:8000/events');
        const result = await response.json();
        for (const r of result) {
          r.start = r.start.replace("T", " ").slice(0, -3);
          r.end = r.end.replace("T", " ").slice(0, -3);
          r.class = this.classes[Number(r.split) - 1] || ''
          this.events.push(r)
        }
    },
    eventsForRoom(roomId) {
      const start = this.businessStart;
      const end = this.businessEnd;
      return this.events.filter(e => {
        if (Number(e.split) !== Number(roomId)) return false;
        const s = moment(e.start);
        return s.isSameOrAfter(start) && s.isBefore(end);
      });
    },
    eventStyle(event) {
      const start = moment(event.start);
      const end = moment(event.end);
      const offsetMin = start.diff(this.businessStart, "minutes");
      const durationMin = end.diff(start, "minutes");
      const top = (offsetMin / 30) * this.slotHeight;
      const height = Math.max((durationMin / 30) * this.slotHeight - 6, 34);
      const layout = layoutOverlaps(this.eventsForRoom(event.split));
      const { col, cols } = layout.get(event.id) || { col: 0, cols: 1 };
      const widthPct = 100 / cols;
      return {
        top: `${top}px`,
        height: `${height}px`,
        left: `calc(${col * widthPct}% + 2px)`,
        right: 'auto',
        width: `calc(${widthPct}% - 4px)`,
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
      if (this.$refs.dateModal) this.$refs.dateModal.$el.dismiss();
      if (this.$refs.addDateModal) this.$refs.addDateModal.$el.dismiss();
    },
    cancel() {
      this.isOpen = false;
      this.showEvent = false;
      this.duration = null;
      this.ownHour = null;
      this.ownMinut = null;
      this.newEvent = {
        title: '',
        adult: 0,
        child: 0,
        split: null,
        class: '',
        price: null,
        start: '',
        end: ''
      }
    },
    async confirm() {
        this.newEvent.duration = this.duration;
        if (this.newEvent.title && this.newEvent.split && this.newEvent.start && this.newEvent.end) {
          const response = await fetch('http://79.76.52.210:8000/record', {
            method: 'post',
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(this.newEvent)
          });
          const result = await response.json();
          alert(result)
          await this.getEvents();
          this.isOpen = !this.isOpen;
          this.cancel();
        } else {
          alert('Заполните "Название записи" и "Время"')
        }
    },
    async confirmEdit() {
        this.selectedEvent.start = `${this.timeStartDate.split('T')[0]} ${this.timeStartDate.split('T')[1]}`
        this.selectedEvent.end = `${this.timeEndDate.split('T')[0]} ${this.timeEndDate.split('T')[1]}`
        const response = await fetch('http://79.76.52.210:8000/events/' + this.selectedEvent.id, {
          method: 'put',
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(this.selectedEvent)
        });
        const result = await response.json();
        alert(result)
        await this.getEvents();
        this.showEvent = false;
    },
    setOpen() {
      this.isOpen = !this.isOpen;
    },
    availableTime(split, duration) {
        // Переводим длительность в минуты
        if (this.ownHour !== null && this.ownMinut !== null) {
            duration = (Number(this.ownHour || 0) * 60) + Number(this.ownMinut || 0);
        } else {
            duration = Number(duration) * 60; // duration в часах
        }

        const [year, monthStr, day] = this.selectedDate.split('-');
        const month = Number(monthStr) - 1;

        const isToday = this.selectedDate === this.today;
        const nowHour = this.now.getHours();
        const nowMin = this.now.getMinutes();

        // Список событий на этот день и split
        const events = this.events
            .filter(e => e.split == split && moment(e.start).format("YYYY-MM-DD") === this.selectedDate)
            .map(e => ({
                start: new Date(e.start),
                end: new Date(e.end)
            }));

        // Проверка пересечения слот → событие
        const overlaps = (s1, e1) => events.some(ev => s1 < ev.end && ev.start < e1);

        // Формат даты
        const fmt = d => moment(d).format("YYYY-MM-DD HH:mm");

        const times = [];

        // Идём по рабочим часам
        for (let hour = this.min_hour; hour < this.max_hour; hour++) {

            // Только варианты 00 и 30 минут
            for (let minute of [0, 30]) {

                // Пропускаем прошлое время
                if (isToday) {
                    const slotTime = hour * 60 + minute;
                    const nowTime  = nowHour * 60 + nowMin;

                    const diff = nowTime - slotTime;

                    // если слот в прошлом и больше чем на 30 минут — пропускаем
                    if (diff > 30) continue;
                }

                const start = new Date(year, month, day, hour, minute);
                const end   = new Date(start.getTime() + duration * 60000);

                // Проверка пересечения с событиями
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
    getHour(date) {
        return date.split(' ')[1].split(':')[0]
    },
    getDate(date) {
        const d = date.split(' ')[0].split('-');
        const year = Number(d[0]);
        const month = Number(d[1]) - 1;
        const day = Number(d[2]);
        return new Date(year, month, day);
    },
    showDate(date) {
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
    selectDate(split, date) {
        const classes = ['blue-event', 'green-event', 'orange-event', 'red-event']
        const newItem = {...this.newEvent, split: split, start: date.start, end: date.end, class: classes[split - 1]}
        if (newItem.start == this.newEvent.start) {
          this.newEvent.start = ''
        } else {
          this.newEvent = newItem;
        }
    },
    onEventClick(event) {
        this.selectedEvent = this.events.find(item => item.id == event.id);
        this.timeStartDate = `${this.selectedEvent.start.split(' ')[0]}T${this.selectedEvent.start.split(' ')[1]}`
        this.timeEndDate = `${this.selectedEvent.end.split(' ')[0]}T${this.selectedEvent.end.split(' ')[1]}`
        if (this.selectedEvent) {
            this.showEvent = true;
        }
    },
    async deleteEvent() {
      const apply = confirm('Вы точно хотите удалить запись?')
      if (apply) {
        const response = await fetch('http://79.76.52.210:8000/events/' + this.selectedEvent.id, {
          method: 'delete',
          headers: {
            "Content-Type": "application/json"
          }
        });
        const result = await response.json();
        alert(result)
        await this.getEvents();
        this.showEvent = false;
      }
    },
    isLateNight(event) {
      const end = new Date(event.end); // убедимся, что это Date
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
}

.room-headers {
  display: flex;
}

.time-col-spacer {
  width: 30px;
  flex-shrink: 0;
}

.room-header {
  flex: 1;
  min-width: 0;
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
}

.time-col {
  flex-shrink: 0;
}

.time-label {
  font-size: 0.62rem;
  color: #9aa0a6;
  text-align: right;
  padding-right: 2px;
  box-sizing: border-box;
}

.room-col {
  flex: 1;
  min-width: 0;
  position: relative;
  margin: 0 2px;
  border-radius: 14px;
}

.room-col.split1 { background-color: rgba(33, 150, 243, 0.10); }
.room-col.split2 { background-color: rgba(76, 175, 80, 0.10); }
.room-col.split3 { background-color: rgba(255, 152, 0, 0.10); }
.room-col.split4 { background-color: rgba(244, 67, 54, 0.10); }

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

.event-card.blue-event   { background-color: rgba(33, 150, 243, 0.16); border: 1.5px solid rgba(33, 150, 243, 0.55); }
.event-card.green-event  { background-color: rgba(76, 175, 80, 0.16); border: 1.5px solid rgba(76, 175, 80, 0.55); }
.event-card.orange-event { background-color: rgba(255, 152, 0, 0.16); border: 1.5px solid rgba(255, 152, 0, 0.55); }
.event-card.red-event    { background-color: rgba(244, 67, 54, 0.16); border: 1.5px solid rgba(244, 67, 54, 0.55); }

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
