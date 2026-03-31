<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="() => { idx++; selectedDate = today; }" color="secondary">Сегодня</ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button @click="getEvents" color="secondary">Обновить</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :scroll-y="true">
      <div class="page-root">
        <ion-button expand="block" @click="setOpen(true)">Добавить запись</ion-button>

        <!-- Vue-cal date navigator -->
        <div :class="['date-nav-wrap', calView === 'day' ? 'date-nav-wrap--collapsed' : '']">
          <vue-cal
            ref="dateCal"
            :key="idx"
            class="date-nav-cal"
            locale="ru"
            active-view="day"
            :disable-views="['years', 'year', 'week']"
            :time="false"
            :events="[]"
            @view-change="onViewChange"
            @cell-click="onCellClick"
          />
          <div v-if="calView === 'month'" class="title-overlay" @click="backToDay"></div>
        </div>

        <!-- Rooms list -->
        <div class="rooms-grid">
          <div v-for="room in splitDays" :key="room.id" class="room-row" :class="room.class">
            <div class="room-label" :style="`color: ${room.color}`">
              <strong>{{ room.label }}</strong>
            </div>
            <div class="room-events">
              <div
                v-for="event in getEventsForRoom(room.id)"
                :key="event.id"
                class="event-card"
                :class="event.class"
                @click="onEventClick(event)"
              >
                <div class="event-title" v-html="event.title"></div>
                <div class="event-dates">{{ showDate(event.start) }} – {{ showDate(event.end) }}</div>
                <div class="event-price">{{ event.price }} тг.</div>
              </div>
              <div v-if="getEventsForRoom(room.id).length === 0" class="empty-room"></div>
            </div>
          </div>
        </div>

        <!-- Модальное окно добавления -->
        <ion-modal :is-open="isOpen">
          <ion-header>
            <ion-toolbar>
              <ion-buttons slot="start">
                <ion-button @click="cancel()">Отменить</ion-button>
              </ion-buttons>
              <ion-buttons slot="end">
                <ion-button :strong="true" @click="confirm()">Записать</ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            <ion-item>
              <ion-input
                label="Название записи"
                label-placement="stacked"
                ref="input"
                type="text"
                placeholder="Имя клиента или телефон"
                @ionChange="newEvent.title = $event.target.value;"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                label="Сумма"
                label-placement="stacked"
                type="number"
                placeholder="тг"
                @ionInput="newEvent.price = $event.target.value;"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-select
                @ionChange="newEvent.split = $event.target.value;"
                label="Номер"
                label-placement="stacked"
              >
                <ion-select-option v-for="room in splitDays" :key="room.id" :value="room.id">
                  {{ room.label }}
                </ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item>
              <h3>Заезд</h3>
              <ion-datetime
                v-model="newEvent.start"
                presentation="date"
                :first-day-of-week="1"
                :prefer-wheel="true"
                @ionChange="onStartChange"
              ></ion-datetime>
            </ion-item>
            <ion-item>
              <h3>Выезд</h3>
              <ion-datetime
                v-model="newEvent.end"
                presentation="date"
                :first-day-of-week="1"
                :prefer-wheel="true"
              ></ion-datetime>
            </ion-item>
          </ion-content>
        </ion-modal>

        <!-- Модальное окно события -->
        <ion-modal :is-open="showEvent">
          <ion-header>
            <ion-toolbar>
              <ion-buttons slot="start">
                <ion-button @click="cancel()">Отменить</ion-button>
              </ion-buttons>
              <ion-buttons slot="end">
                <ion-button :strong="true" @click="confirmEdit()">Записать</ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            <ion-item>
              <ion-input
                v-model="selectedEvent.title"
                label="Название записи"
                label-placement="stacked"
                type="text"
                placeholder="Имя клиента или телефон"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                label="Сумма"
                label-placement="stacked"
                type="number"
                placeholder="тг"
                :value="selectedEvent.price"
                @ionInput="selectedEvent.price = $event.target.value;"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-select
                v-model="selectedEvent.split"
                @ionChange="selectedEvent.split = $event.target.value;"
                label="Номер"
                label-placement="stacked"
              >
                <ion-select-option v-for="room in splitDays" :key="room.id" :value="room.id">
                  {{ room.label }}
                </ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item>
              <h3>Заезд</h3>
              <ion-datetime v-model="timeStartDate" presentation="date" :prefer-wheel="true"></ion-datetime>
            </ion-item>
            <ion-item>
              <h3>Выезд</h3>
              <ion-datetime v-model="timeEndDate" presentation="date" :prefer-wheel="true"></ion-datetime>
            </ion-item>
            <ion-item>
              <ion-button @click="deleteEvent" color="danger">Удалить</ion-button>
            </ion-item>
          </ion-content>
        </ion-modal>
      </div>
    </ion-content>
  </ion-page>
</template>

<script>
import moment from "moment";
import "moment/locale/ru";
import VueCal from "vue-cal";
import "vue-cal/dist/vuecal.css";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  IonButton,
  IonModal,
  IonDatetime,
  IonRow,
  IonCol,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonText,
  IonButtons,
  IonItem,
} from "@ionic/vue";

export default {
  name: "HotelPage",
  components: {
    VueCal,
    IonContent,
    IonHeader,
    IonPage,
    IonToolbar,
    IonButton,
    IonModal,
    IonDatetime,
    IonRow,
    IonCol,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonText,
    IonButtons,
    IonItem,
  },
  data() {
    return {
      timeStartDate: null,
      timeEndDate: null,
      selectedDate: moment().format("YYYY-MM-DD"),
      today: moment().format("YYYY-MM-DD"),
      idx: 0,
      events: [],
      splitDays: [
        { id: 1, color: "blue",   label: "Номер 1", class: "split1" },
        { id: 2, color: "green",  label: "Номер 2", class: "split2" },
        { id: 3, color: "orange", label: "Номер 3", class: "split3" },
        { id: 4, color: "red",    label: "Номер 4", class: "split4" },
        { id: 5, color: "purple", label: "Номер 5", class: "split5" },
      ],
      isOpen: false,
      showEvent: false,
      calView: 'day',
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
      classes: ['blue-event', 'green-event', 'orange-event', 'red-event', 'purple-event'],
    };
  },
  async mounted() {
    await this.getEvents();
  },
  methods: {
    onViewChange({ startDate, view }) {
      this.calView = view;
      if (view === 'day') {
        this.selectedDate = moment(startDate).format('YYYY-MM-DD');
      }
    },
    onCellClick(date) {
      if (this.calView === 'month') {
        this.$refs.dateCal.switchView('day', date);
      }
    },
    onNavWrapClick(e) {
      if (this.calView === 'month' && e.target.closest('.vuecal__title button')) {
        e.stopPropagation();
        this.$refs.dateCal.switchView('day', new Date(this.selectedDate));
      }
    },
    getEventsForRoom(roomId) {
      return this.events.filter(e => {
        const start = e.start.split(' ')[0];
        const end = e.end.split(' ')[0];
        return e.split === roomId && this.selectedDate >= start && this.selectedDate < end;
      });
    },
    onStartChange() {
      const start = this.newEvent.start ? this.newEvent.start.split('T')[0] : null;
      if (start) {
        this.newEvent.end = moment(start).add(1, 'days').format('YYYY-MM-DD');
      }
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

<style>
.date-nav-cal .vuecal__menu {
  display: none !important;
}
/* Day view: collapse to title bar only */
.date-nav-wrap--collapsed .vuecal__body,
.date-nav-wrap--collapsed .vuecal__split-days-headers {
  display: none !important;
}
.date-nav-wrap--collapsed .date-nav-cal {
  height: auto !important;
  min-height: 0 !important;
}
.date-nav-wrap--collapsed {
  height: 40px;
  overflow: hidden;
}
/* Month view: show full calendar */
.date-nav-wrap:not(.date-nav-wrap--collapsed) .date-nav-cal {
  height: 380px;
}
.date-nav-cal {
  box-shadow: none;
}
.date-nav-cal .vuecal__title-bar {
  font-size: 1.1em;
  color: black !important;
}
</style>

<style scoped>
.page-root {
  display: flex;
  flex-direction: column;
}

.rooms-grid {
  display: flex;
  flex-direction: column;
}

.room-row {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid #e0e0e0;
  min-height: 64px;
}

.room-label {
  width: 80px;
  min-width: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  border-right: 1px solid #e0e0e0;
  padding: 8px 4px;
  text-align: center;
}

.room-row.split1 .room-label { background-color: rgba(226, 242, 253, 0.7); }
.room-row.split2 .room-label { background-color: rgba(232, 245, 233, 0.7); }
.room-row.split3 .room-label { background-color: rgba(255, 243, 224, 0.7); }
.room-row.split4 .room-label { background-color: rgba(255, 235, 238, 0.7); }
.room-row.split5 .room-label { background-color: rgba(237, 231, 246, 0.7); }

.room-events {
  flex: 1;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  justify-content: center;
}

.room-row.split1 { background-color: rgba(226, 242, 253, 0.4); }
.room-row.split2 { background-color: rgba(232, 245, 233, 0.4); }
.room-row.split3 { background-color: rgba(255, 243, 224, 0.4); }
.room-row.split4 { background-color: rgba(255, 235, 238, 0.4); }
.room-row.split5 { background-color: rgba(237, 231, 246, 0.4); }

.empty-room {
  height: 40px;
}

.event-card {
  border-radius: 6px;
  padding: 6px 10px;
  border: 1.5px solid rgba(0,0,0,0.15);
  cursor: pointer;
  font-size: 0.85rem;
}

.event-title { font-weight: 600; }
.event-dates { font-size: 0.75rem; opacity: 0.8; }
.event-price { font-size: 0.75rem; }

.blue-event   { background-color: rgba(112, 192, 245, 0.7); }
.green-event  { background-color: rgba(137, 243, 146, 0.7); }
.orange-event { background-color: rgba(245, 207, 146, 0.7); }
.red-event    { background-color: rgba(247, 143, 158, 0.7); }
.purple-event { background-color: rgba(186, 104, 200, 0.7); }
</style>
