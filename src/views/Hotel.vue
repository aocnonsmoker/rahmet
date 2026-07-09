<template>
  <ion-page>
    <ion-header :translucent="true" class="hotel-header">
      <ion-toolbar class="hotel-toolbar">
        <div class="header-card">
          <button class="header-btn today" type="button" @click="goToday">Сегодня</button>
          <div class="header-title">Гостиница</div>
          <button class="header-btn refresh" type="button" @click="getEvents">
            <ion-icon :icon="refreshIcon"></ion-icon>
            Обновить
          </button>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :scroll-y="true">
      <div class="page-root">
        <ion-button expand="block" class="add-btn" @click="setOpen(true)">+ Добавить запись</ion-button>

        <div class="date-nav">
          <button class="nav-arrow" type="button" @click="prevDay">‹</button>
          <button id="hotel-date-trigger" class="date-pill" type="button">{{ formattedDate }}</button>
          <button class="nav-arrow" type="button" @click="nextDay">›</button>
        </div>
        <ion-modal :keep-contents-mounted="true" trigger="hotel-date-trigger" ref="dateModal">
          <MonthCalendar
            :model-value="selectedDate"
            :events="events"
            @update:modelValue="onPickDate"
          />
        </ion-modal>

        <!-- Rooms list -->
        <div class="rooms-list">
          <div
            v-for="room in splitDays"
            :key="room.id"
            class="room-pill"
            :style="{ background: hexToRgba(room.color, 0.12) }"
          >
            <div class="room-title" :style="{ color: room.color }">{{ room.label }}</div>
            <div v-if="getEventsForRoom(room.id).length" class="room-events">
              <div
                v-for="event in getEventsForRoom(room.id)"
                :key="event.id"
                class="room-event"
                :style="{ background: hexToRgba(room.color, 0.22), borderColor: hexToRgba(room.color, 0.55) }"
                @click="onEventClick(event)"
              >
                <div class="event-title" v-html="event.title"></div>
                <div class="event-dates">{{ showDate(event.start) }} – {{ showDate(event.end) }}</div>
                <div v-if="event.price" class="event-price">{{ event.price }} тг.</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Модальное окно добавления -->
        <ion-modal class="hotel-modal" :is-open="isOpen">
          <ion-header class="hotel-modal-header ion-no-border">
            <ion-toolbar class="hotel-modal-toolbar">
              <ion-buttons slot="start">
                <ion-button fill="clear" color="medium" @click="cancel()">Отменить</ion-button>
              </ion-buttons>
              <ion-buttons slot="end">
                <ion-button fill="clear" color="primary" :strong="true" @click="confirm()">Записать</ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            <FormInput
              label="Название записи"
              type="text"
              placeholder="Имя клиента или телефон"
              :model-value="newEvent.title"
              @update:modelValue="newEvent.title = $event"
            />
            <FormInput
              label="Сумма"
              type="number"
              suffix="тг."
              :model-value="newEvent.price"
              @update:modelValue="newEvent.price = $event"
            />
            <FormSelect
              label="Номер"
              placeholder="Выберите номер"
              :model-value="newEvent.split"
              :options="roomOptions"
              @update:modelValue="newEvent.split = $event"
            />

            <div class="date-field">
              <label class="date-field-label">Заезд</label>
              <button id="hotel-add-start-trigger" class="date-field-btn" type="button">{{ formatShort(newEvent.start) }}</button>
            </div>
            <ion-modal :keep-contents-mounted="true" trigger="hotel-add-start-trigger" ref="addStartModal">
              <MonthCalendar :model-value="newEvent.start || today" :events="events" @update:modelValue="onPickStart" />
            </ion-modal>

            <div class="date-field">
              <label class="date-field-label">Выезд</label>
              <button id="hotel-add-end-trigger" class="date-field-btn" type="button">{{ formatShort(newEvent.end) }}</button>
            </div>
            <ion-modal :keep-contents-mounted="true" trigger="hotel-add-end-trigger" ref="addEndModal">
              <MonthCalendar :model-value="newEvent.end || today" :events="events" @update:modelValue="onPickEnd" />
            </ion-modal>
          </ion-content>
        </ion-modal>

        <!-- Модальное окно события -->
        <ion-modal class="hotel-modal" :is-open="showEvent">
          <ion-header class="hotel-modal-header ion-no-border">
            <ion-toolbar class="hotel-modal-toolbar">
              <ion-buttons slot="start">
                <ion-button fill="clear" color="medium" @click="cancel()">Отменить</ion-button>
              </ion-buttons>
              <ion-buttons slot="end">
                <ion-button fill="clear" color="primary" :strong="true" @click="confirmEdit()">Записать</ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            <FormInput
              v-if="selectedEvent"
              label="Название записи"
              type="text"
              placeholder="Имя клиента или телефон"
              :model-value="selectedEvent.title"
              @update:modelValue="selectedEvent.title = $event"
            />
            <FormInput
              v-if="selectedEvent"
              label="Сумма"
              type="number"
              suffix="тг."
              :model-value="selectedEvent.price"
              @update:modelValue="selectedEvent.price = $event"
            />
            <FormSelect
              v-if="selectedEvent"
              label="Номер"
              :model-value="selectedEvent.split"
              :options="roomOptions"
              @update:modelValue="selectedEvent.split = $event"
            />

            <div class="date-field">
              <label class="date-field-label">Заезд</label>
              <button id="hotel-edit-start-trigger" class="date-field-btn" type="button">{{ formatShort(timeStartDate) }}</button>
            </div>
            <ion-modal :keep-contents-mounted="true" trigger="hotel-edit-start-trigger" ref="editStartModal">
              <MonthCalendar :model-value="timeStartDate" :events="events" @update:modelValue="onPickEditStart" />
            </ion-modal>

            <div class="date-field">
              <label class="date-field-label">Выезд</label>
              <button id="hotel-edit-end-trigger" class="date-field-btn" type="button">{{ formatShort(timeEndDate) }}</button>
            </div>
            <ion-modal :keep-contents-mounted="true" trigger="hotel-edit-end-trigger" ref="editEndModal">
              <MonthCalendar :model-value="timeEndDate" :events="events" @update:modelValue="onPickEditEnd" />
            </ion-modal>

            <ion-button expand="block" class="delete-btn" color="danger" @click="deleteEvent">Удалить</ion-button>
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
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  IonButton,
  IonModal,
  IonIcon,
} from "@ionic/vue";
import { refreshOutline } from "ionicons/icons";

export default {
  name: "HotelPage",
  components: {
    IonContent,
    IonHeader,
    IonPage,
    IonToolbar,
    IonButton,
    IonModal,
    IonIcon,
    MonthCalendar,
    FormInput,
    FormSelect,
  },
  data() {
    return {
      refreshIcon: refreshOutline,
      timeStartDate: null,
      timeEndDate: null,
      selectedDate: moment().format("YYYY-MM-DD"),
      today: moment().format("YYYY-MM-DD"),
      events: [],
      splitDays: [
        { id: 1,  color: "#2196f3", label: "Номер 1" },
        { id: 2,  color: "#4caf50", label: "Номер 2" },
        { id: 3,  color: "#ff9800", label: "Номер 3" },
        { id: 4,  color: "#f44336", label: "Номер 4" },
        { id: 5,  color: "#9c27b0", label: "Номер 5" },
        { id: 6,  color: "#009688", label: "Номер 6" },
        { id: 7,  color: "#795548", label: "Номер 7" },
        { id: 8,  color: "#3f51b5", label: "Номер 8" },
        { id: 9,  color: "#827717", label: "Номер 9" },
        { id: 10, color: "#d32f2f", label: "Номер 10" },
      ],
      isOpen: false,
      showEvent: false,
      selectedEvent: null,
      newEvent: {
        title: '',
        adult: null,
        child: null,
        split: null,
        class: '',
        price: null,
        start: '',
        end: '',
      },
      classes: ['blue-event', 'green-event', 'orange-event', 'red-event', 'purple-event', 'teal-event', 'brown-event', 'navy-event', 'olive-event', 'crimson-event'],
    };
  },
  computed: {
    roomOptions() {
      return this.splitDays.map((room) => ({ value: room.id, label: room.label }));
    },
    formattedDate() {
      const date = new Date(`${this.selectedDate}T00:00:00`);
      const str = new Intl.DateTimeFormat("ru-RU", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
      return str.charAt(0).toUpperCase() + str.slice(1);
    },
  },
  async mounted() {
    await this.getEvents();
  },
  methods: {
    hexToRgba(hex, alpha) {
      const h = hex.replace('#', '');
      const bigint = parseInt(h, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },
    formatShort(date) {
      if (!date) return 'Выберите дату';
      const d = new Date(`${date}T00:00:00`);
      return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(d);
    },
    goToday() {
      this.selectedDate = this.today;
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
    },
    onPickStart(date) {
      this.newEvent.start = date;
      this.newEvent.end = moment(date).add(1, 'days').format('YYYY-MM-DD');
      if (this.$refs.addStartModal) this.$refs.addStartModal.$el.dismiss();
    },
    onPickEnd(date) {
      this.newEvent.end = date;
      if (this.$refs.addEndModal) this.$refs.addEndModal.$el.dismiss();
    },
    onPickEditStart(date) {
      this.timeStartDate = date;
      if (this.$refs.editStartModal) this.$refs.editStartModal.$el.dismiss();
    },
    onPickEditEnd(date) {
      this.timeEndDate = date;
      if (this.$refs.editEndModal) this.$refs.editEndModal.$el.dismiss();
    },
    getEventsForRoom(roomId) {
      return this.events.filter(e => {
        const start = e.start.split(' ')[0];
        const end = e.end.split(' ')[0];
        return e.split === roomId && this.selectedDate >= start && this.selectedDate < end;
      });
    },
    async getEvents() {
      this.events = [];
      const response = await fetch('http://79.76.52.210:8000/hotel');
      const result = await response.json();
      for (const r of result) {
        r.start = r.start.replace("T", " ").slice(0, -3);
        r.end = r.end.replace("T", " ").slice(0, -3);
        r.class = this.classes[Number(r.split) - 1] || '';
        this.events.push(r);
      }
    },
    cancel() {
      this.isOpen = false;
      this.showEvent = false;
      this.newEvent = {
        title: '',
        adult: null,
        child: null,
        split: null,
        class: '',
        price: null,
        start: '',
        end: '',
      };
    },
    isRoomBusy(split, start, end, excludeId = null) {
      return this.events.some(e => {
        if (e.split !== Number(split)) return false;
        if (excludeId && e.id === excludeId) return false;
        const eStart = e.start.split(' ')[0];
        const eEnd = e.end.split(' ')[0];
        return start < eEnd && eStart < end;
      });
    },
    async confirm() {
      if (this.newEvent.title && this.newEvent.split && this.newEvent.start && this.newEvent.end) {
        const start = this.newEvent.start.split('T')[0];
        const end = this.newEvent.end.split('T')[0];
        if (this.isRoomBusy(this.newEvent.split, start, end)) {
          alert('Эти даты уже заняты для выбранного номера');
          return;
        }
        this.newEvent.class = this.classes[Number(this.newEvent.split) - 1] || '';
        const response = await fetch('http://79.76.52.210:8000/record-hotel', {
          method: 'post',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(this.newEvent),
        });
        const result = await response.json();
        alert(result);
        await this.getEvents();
        this.cancel();
      } else {
        alert('Заполните "Название записи", "Номер" и "Даты"');
      }
    },
    async confirmEdit() {
      this.selectedEvent.start = this.timeStartDate.split('T')[0];
      this.selectedEvent.end = this.timeEndDate.split('T')[0];
      if (this.isRoomBusy(this.selectedEvent.split, this.selectedEvent.start, this.selectedEvent.end, this.selectedEvent.id)) {
        alert('Эти даты уже заняты для выбранного номера');
        return;
      }
      const response = await fetch('http://79.76.52.210:8000/hotel/' + this.selectedEvent.id, {
        method: 'put',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.selectedEvent),
      });
      const result = await response.json();
      alert(result);
      await this.getEvents();
      this.showEvent = false;
    },
    setOpen() {
      this.newEvent.start = this.selectedDate;
      this.newEvent.end = moment(this.selectedDate).add(1, 'days').format('YYYY-MM-DD');
      this.isOpen = true;
    },
    showDate(date) {
      return moment(date).format("DD.MM");
    },
    onEventClick(event) {
      this.selectedEvent = this.events.find(item => item.id == event.id);
      this.timeStartDate = this.selectedEvent.start.split(' ')[0];
      this.timeEndDate = this.selectedEvent.end.split(' ')[0];
      if (this.selectedEvent) {
        this.showEvent = true;
      }
    },
    async deleteEvent() {
      const apply = confirm('Вы точно хотите удалить запись?');
      if (apply) {
        const response = await fetch('http://79.76.52.210:8000/hotel/' + this.selectedEvent.id, {
          method: 'delete',
          headers: { "Content-Type": "application/json" },
        });
        const result = await response.json();
        alert(result);
        await this.getEvents();
        this.showEvent = false;
      }
    },
  },
};
</script>

<style scoped>
.hotel-toolbar {
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
  display: flex;
  flex-direction: column;
  padding: 10px 10px 4px;
  background: #f4f5f7;
}

.add-btn {
  --border-radius: 12px;
  font-weight: 700;
  margin: 0 2px 14px;
}

.date-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 0 2px 14px;
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
  width: 270px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rooms-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.room-pill {
  border-radius: 14px;
  padding: 14px 16px;
}

.room-title {
  font-weight: 700;
  font-size: 0.95rem;
}

.room-events {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.room-event {
  border-radius: 10px;
  border: 1.5px solid;
  padding: 8px 10px;
  cursor: pointer;
  font-size: 0.82rem;
}

.event-title { font-weight: 700; }
.event-dates { color: #5b5f66; font-size: 0.75rem; margin-top: 1px; }
.event-price { font-weight: 700; font-size: 0.78rem; margin-top: 1px; }

.hotel-modal {
  --border-radius: 20px;
}

.hotel-modal-toolbar {
  --border-color: transparent;
}

.date-field {
  margin-bottom: 6px;
}

.date-field-label {
  display: block;
  font-weight: 700;
  font-size: 0.8rem;
  color: #1c1c1e;
  margin-bottom: 6px;
}

.date-field-btn {
  width: 100%;
  box-sizing: border-box;
  border: none;
  background: #eef0f0;
  border-radius: 14px;
  padding: 14px 16px;
  font-size: 1rem;
  font-weight: 600;
  color: #2196f3;
  text-align: left;
  cursor: pointer;
  margin-bottom: 14px;
}

.delete-btn {
  --border-radius: 24px;
  font-weight: 700;
  margin-top: 12px;
}
</style>
