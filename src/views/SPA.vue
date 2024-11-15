<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ curDate }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div>
        <ion-button expand="block" @click="setOpen(true)"
          >Добавить запись</ion-button
        >
        <vue-cal
          id="vuecal"
          locale="ru"
          style="height: 75vh"
          active-view="day"
          :disable-views="['years', 'year', 'week']"
          :time-step="30"
          :events="events"
          :split-days="splitDays"
          :watchRealTime="true"
          sticky-split-labels
          @ready="scrollToCurrentTime"
          :timeCellHeight="80"
          :on-event-click="onEventClick"
        >
          <template #split-label="{ split }">
            <strong :style="`color: ${split.color}`">{{ split.label }}</strong>
          </template>
          <template #event="{ event }">
            <div v-html="event.title" />
            {{ showDate(event.start) }}-{{ showDate(event.end) }}
            <div>Взр: {{ event.adult }}</div>
            <div>Дети: {{ event.child }}</div>
            <div>
              Сумма: <br />
              {{ event.price }}тг.
            </div>
          </template>
        </vue-cal>
        <!-- Модальное окно -->
        <ion-modal :is-open="isOpen">
          <ion-header>
            <ion-toolbar>
              <ion-buttons slot="start">
                <ion-button @click="cancel()">Отменить</ion-button>
              </ion-buttons>
              <ion-buttons slot="end">
                <ion-button :strong="true" @click="confirm()"
                  >Записать</ion-button
                >
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
                label-placement="stacked"
                label="Взрослые"
                type="number"
                placeholder="0"
                @ionInput="newEvent.adult = $event.target.value;"
              ></ion-input>
              <ion-input
                label-placement="stacked"
                label="Детские"
                type="number"
                placeholder="0"
                @ionInput="newEvent.child = $event.target.value;"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-datetime-button datetime="datetime"></ion-datetime-button>
              <ion-modal :keep-contents-mounted="true">
                <ion-datetime
                  id="datetime"
                  :first-day-of-week="1"
                  presentation="date"
                  :format-options="formatOptions"
                  v-model="selectedDate"
                ></ion-datetime>
              </ion-modal>
            </ion-item>
            <ion-item>
              <ion-select
                @ionChange="duration=$event.target.value;"
                label="Время"
                label-placement="stacked"
              >
                <ion-select-option :value="1">На 1 час</ion-select-option>
                <ion-select-option :value="1.5">На 1.5 часа</ion-select-option>
                <ion-select-option :value="2">На 2 часа</ion-select-option>
                <ion-select-option :value="3">На 3 часа</ion-select-option>
                <ion-select-option :value="4">На 4 часа</ion-select-option>
                <ion-select-option :value="0">Свое время</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item v-if="duration == 0">
              <ion-input
                label="Введите свое время (час)"
                type="number"
                placeholder="000"
                @ionChange="ownHour = $event.target.value"
              ></ion-input>
            </ion-item>
            <ion-item v-if="duration == 0">
              <ion-select
                label="Минут"
                label-placement="stacked"
                @ionChange="ownMinut = $event.target.value"
              >
                <ion-select-option :value="0">0</ion-select-option>
                <ion-select-option :value="0.5">30</ion-select-option>
              </ion-select>
            </ion-item>
            <template v-if="duration || (ownHour && ownMinut)">
              <ion-item
                v-for="item in splitDays"
                :key="`${item.id}-${duration}`"
              >
                <ion-label>
                  <h2>Баня {{ item.id }}</h2>
                  <ion-row>
                    <ion-col
                      v-for="i in availableTime(item.id, duration)"
                      :key="i"
                      size="4"
                    >
                      <ion-button @click="selectDate(item.id, i)" color="new"
                        >{{ i.start.split(" ")[1] }}-{{
                          i.end.split(" ")[1]
                        }}</ion-button
                      >
                    </ion-col>
                  </ion-row>
                </ion-label>
              </ion-item>
            </template>
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
                <ion-button :strong="true" @click="confirmEdit()"
                  >Записать</ion-button
                >
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            <ion-item>
              <ion-input
                v-model="selectedEvent.title"
                label="Название записи"
                label-placement="stacked"
                ref="input"
                type="text"
                placeholder="Имя клиента или телефон"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                label-placement="stacked"
                label="Взрослые"
                type="number"
                placeholder="0"
                :value="selectedEvent.adult"
                @ionInput="selectedEvent.adult = $event.target.value;"
              ></ion-input>
              <ion-input
                label-placement="stacked"
                label="Детские"
                type="number"
                placeholder="0"
                :value="selectedEvent.child"
                @ionInput="selectedEvent.child = $event.target.value;"
              ></ion-input>
            </ion-item>
            <ion-item>
                <ion-input
                    label="Сумма"
                    type="number"
                    placeholder="тг"
                    :value="selectedEvent.price"
                    @ionInput="selectedEvent.price = $event.target.value;"
                ></ion-input>
            </ion-item>
            <ion-item>
                <h1>С</h1>
                <ion-datetime v-model="timeStartDate" presentation="date-time" :prefer-wheel="true" minuteValues="0,30"></ion-datetime>
            </ion-item>
            <ion-item>
                <h1>До</h1>
                <ion-datetime v-model="timeEndDate" presentation="date-time" :prefer-wheel="true" minuteValues="0,30"></ion-datetime>
            </ion-item>
          </ion-content>
        </ion-modal>
      </div>
    </ion-content>
  </ion-page>
</template>

<script>
import moment from "moment";
import VueCal from "vue-cal";
import "vue-cal/dist/vuecal.css";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonModal,
  IonDatetime,
  IonRow,
  IonCol,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption
} from "@ionic/vue";

export default {
  name: "HomePage",
  components: {
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar,
    VueCal,
    IonButton,
    IonModal,
    IonDatetime,
    IonRow,
    IonCol,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption
  },
  data() {
    return {
      timeStartDate: null,
      timeEndDate: null,
      curDate: moment(new Date()).format("DD-MM-YYYY HH:mm"),
      datePicker: moment(new Date()).format("YYYY-MM-DD"),
      selectedDate: moment(new Date()).format("YYYY-MM-DD"),
      now: new Date(),
      events: [
        {
            id: 1,
            start: "2024-11-02 23:00",
            end: "2024-11-03 00:00",
            title: "87074567894",
            adult: 2,
            child: 1,
            class: "blue-event",
            split: 1,
            price: 2700,
            duration: 1
        },
        {
            id: 2,
            start: "2024-11-02 23:30",
            end: "2024-11-03 01:00",
            title: "87015468794",
            adult: 2,
            child: 0,
            class: "green-event",
            split: 2,
            price: 3000,
            duration: 1.5
        },
        {
            id: 3,
            start: "2024-11-02 16:00",
            end: "2024-11-02 19:00",
            title: "Ербол",
            adult: 3,
            child: 0,
            class: "blue-event",
            split: 1,
            price: 6000,
            duration: 3
        },
        {
            id: 4,
            start: "2024-11-02 20:00",
            end: "2024-11-02 21:30",
            title: "Ербол",
            adult: 3,
            child: 0,
            class: "blue-event",
            split: 1,
            price: 6000,
            duration: 1.5
        },
        {
            id: 5,
            start: "2024-11-02 16:00",
            end: "2024-11-02 18:00",
            title: "Анара кб",
            adult: 2,
            child: 0,
            class: "green-event",
            split: 2,
            price: 4000,
            duration: 2
        },
        {
            id: 6,
            start: "2024-11-02 16:00",
            end: "2024-11-02 18:00",
            title: "870015654987",
            adult: 1,
            child: 2,
            class: "orange-event",
            split: 3,
            price: 4800,
            duration: 2
        },
        {
            id: 7,
            start: "2024-11-02 15:00",
            end: "2024-11-02 16:00",
            title: "87471235478",
            adult: 4,
            child: 0,
            class: "red-event",
            split: 4,
            price: 4000,
            duration: 1
        },
      ],
      splitDays: [
        { id: 1, color: "blue", label: "Баня 1", class: "split1" },
        { id: 2, color: "green", label: "Баня 2", class: "split2" },
        { id: 3, color: "orange", label: "Баня 3", class: "split3" },
        { id: 4, color: "red", label: "Баня 4", class: "split4" },
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
      min_hour: 1,
      max_hour: 9,
      newEvent: {
        title: '',
        adult: null,
        child: null,
        split: null,
        class: '',
        price: null,
        start: '',
        end: ''

      },
      ownHour: null,
      ownMinut: null
    };
  },
  mounted() {
    this.scrollToCurrentTime();
  },
  methods: {
    scrollToCurrentTime() {
      const calendar = document.querySelector("#vuecal .vuecal__bg");
      const hours = this.now.getHours() + this.now.getMinutes() / 60;
      calendar.scrollTo({
        top: hours * this.timeCellHeight,
        behavior: "smooth",
      });
    },
    cancel() {
      this.isOpen = false;
      this.showEvent = false;
      this.duration = null;
    },
    confirm() {
        this.newEvent.id = this.events.length + 1;
        this.events.push(this.newEvent)
        this.isOpen = !this.isOpen;
    },
    confirmEdit() {
        this.selectedEvent.start = `${this.timeStartDate.split('T')[0]} ${this.timeStartDate.split('T')[1]}`
        this.selectedEvent.end = `${this.timeEndDate.split('T')[0]} ${this.timeEndDate.split('T')[1]}`
        this.showEvent = false;
    },
    setOpen() {
      this.isOpen = !this.isOpen;
    },
    availableTime(split, duration) {
        if (this.ownHour && this.ownMinut) {
            duration = Number(this.ownHour) + this.ownMinut;
        }
        const now = this.selectedDate.split('-');
        const year = Number(now[0]);
        const month = Number(now[1]) - 1;
        const day = Number(now[2]);
        const dates = this.events.filter((event) => (event.split == split) && (event.start.split(' ')[0] == this.selectedDate));
        const times = [];
        let i = 0;
        while (i < 24) {
            if (i <= this.min_hour || i >= this.max_hour) {
                let minut = 0;
                let minutHalf = 30;
                if (!Number.isInteger(duration)) {
                    minut = 30;
                    minutHalf = 0;
                }
                const d = {
                    start: moment(new Date(year, month, day, i, 0)).format("YYYY-MM-DD HH:mm"),
                    end: moment(new Date(year, month, day, i + Math.trunc(duration), minut)).format("YYYY-MM-DD HH:mm"),
                };
                const dHalf = {
                    start: moment(new Date(year, month, day, i, 30)).format("YYYY-MM-DD HH:mm"),
                    end: moment(new Date(year, month, day, i + Math.round(duration), minutHalf)).format("YYYY-MM-DD HH:mm"),
                };
                const match = dates.find((item) => (item.start == d.start) || (item.end == d.end) || (item.start < d.end && item.start > d.start) || (item.end > d.start && item.end < d.end) || (item.start < d.start && item.end > d.end));
                const matchHalf = dates.find((item) => (item.start == dHalf.start) || (item.end == dHalf.end) || (item.start < dHalf.end && item.start > dHalf.start) || (item.end > dHalf.start && item.end < dHalf.end) || (item.start < dHalf.start && item.end > dHalf.end));
                if (!match) {
                  times.push(d);
                }
                if (!matchHalf) {
                  times.push(dHalf); 
                }
                i += 1;
            } else {
                i += 1;
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
    selectDate(split, date) {
        const classes = ['blue-event', 'green-event', 'orange-event', 'red-event']
        const newItem = {...this.newEvent, split: split, start: date.start, end: date.end, class: classes[split - 1]}
        this.newEvent = newItem;
    },
    onEventClick(event) {
        this.selectedEvent = this.events.find(item => item.id == event.id);
        this.timeStartDate = `${this.selectedEvent.start.split(' ')[0]}T${this.selectedEvent.start.split(' ')[1]}`
        this.timeEndDate = `${this.selectedEvent.end.split(' ')[0]}T${this.selectedEvent.end.split(' ')[1]}`
        if (this.selectedEvent) {
            this.showEvent = true;
        }
    }
  },
};
</script>

<style>
#container {
  text-align: center;
}

#container strong {
  font-size: 20px;
  line-height: 26px;
}

#container p {
  font-size: 16px;
  line-height: 22px;
  color: #8c8c8c;
  margin: 0;
}

#container a {
  text-decoration: none;
}
.vuecal__now-line {
  color: #06c;
}
.vuecal .day-split-header {
  font-size: 11px;
}
.vuecal__body .split1 {
  background-color: rgba(226, 242, 253, 0.7);
}
.vuecal__body .split2 {
  background-color: rgba(232, 245, 233, 0.7);
}
.vuecal__body .split3 {
  background-color: rgba(255, 243, 224, 0.7);
}
.vuecal__body .split4 {
  background-color: rgba(255, 235, 238, 0.7);
}
.vuecal__no-event {
  display: none;
}
.vuecal__event.blue-event {
  background-color: rgba(112, 192, 245, 0.7);
  color: #000000;
  border: 2px solid black;
}
.vuecal__event.green-event {
  background-color: rgba(137, 243, 146, 0.7);
  color: #000000;
  border: 2px solid black;
}
.vuecal__event.orange-event {
  background-color: rgba(245, 207, 146, 0.7);
  color: #000000;
  border: 2px solid black;
}
.vuecal__event.red-event {
  background-color: rgba(247, 143, 158, 0.7);
  color: #000000;
  border: 2px solid black;
}
:root {
  --ion-color-new: #69bb7b;
  --ion-color-new-rgb: 105, 187, 123;
  --ion-color-new-contrast: #000000;
  --ion-color-new-contrast-rgb: 0, 0, 0;
  --ion-color-new-shade: #5ca56c;
  --ion-color-new-tint: #78c288;
}

.ion-color-new {
  --ion-color-base: var(--ion-color-new);
  --ion-color-base-rgb: var(--ion-color-new-rgb);
  --ion-color-contrast: var(--ion-color-new-contrast);
  --ion-color-contrast-rgb: var(--ion-color-new-contrast-rgb);
  --ion-color-shade: var(--ion-color-new-shade);
  --ion-color-tint: var(--ion-color-new-tint);
}
</style>
