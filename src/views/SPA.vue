<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <!-- <ion-button @click="() => { this.tab = 1 }" color="secondary">Календарь</ion-button> -->
          <ion-button @click="() => { this.idx += 1 }" color="secondary">Сегодня</ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <!-- <ion-button @click="() => { this.tab = 2 }" color="secondary">Таблица  </ion-button> -->
          <ion-button @click="getEvents" color="secondary">Обновить</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div>
        <ion-button expand="block" @click="setOpen(true)"
          >Добавить запись</ion-button
        >
        <div :key="idx" v-if="tab == 1">
          <vue-cal
            id="vuecal"
            locale="ru"
            style="height: 83vh"
            active-view="day"
            :disable-views="['years', 'year', 'week']"
            :time-step="30"
            :events="events"
            :split-days="splitDays"
            sticky-split-labels
            @ready="scrollToCurrentTime"
            :timeCellHeight="80"
            :on-event-click="onEventClick"
            :watchRealTime="true"
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
        </div>
        <div v-else>
          <ion-item>
            <ion-datetime-button datetime="datetime"></ion-datetime-button>
            <ion-modal :keep-contents-mounted="true">
              <ion-datetime
                id="datetime"
                :first-day-of-week="1"
                presentation="date"
                :format-options="formatOptions"
                v-model="today"
              ></ion-datetime>
            </ion-modal>
          </ion-item>
          <div v-for="i in 4" :key="i">
            <ion-item>
              <ion-label>Баня {{i}}</ion-label>
            </ion-item>
            <div v-for="item in tableList.filter(list => list.split == i)" :key="item.id">
              <p style="margin: 10px 20px;" @click="onEventClick(item)">
                <ion-text>{{item.start.split(' ')[1]}} - {{item.end.split(' ')[1]}} / {{item.title}} / Взр: {{item.adult}}, Дет: {{item.child}} <br> Сумма: {{item.price}}</ion-text>
              </p>
            </div>
          </div>
        </div>
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
            <template v-if="duration || (ownHour)">
              <div style="overflow-y: scroll; height:600px;">
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
                      <ion-button @click="selectDate(item.id, i)" :color="item.id == newEvent.split && i.start == newEvent.start ? 'selected' : 'new'" 
                        >{{ i.start.split(" ")[1] }}-{{
                          i.end.split(" ")[1]
                        }}</ion-button
                      >
                    </ion-col>
                  </ion-row>
                </ion-label>
              </ion-item>
              </div>
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
              <ion-select
                v-model="selectedEvent.split"
                @ionChange="selectedEvent.split=$event.target.value;"
                label="Баня"
                label-placement="stacked"
              >
                <ion-select-option :value="1">Баня 1</ion-select-option>
                <ion-select-option :value="2">Баня 2</ion-select-option>
                <ion-select-option :value="3">Баня 3</ion-select-option>
                <ion-select-option :value="4">Баня 4</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item>
                <h3>С</h3>
                <ion-datetime v-model="timeStartDate" presentation="date-time" :prefer-wheel="true" minuteValues="0,30"></ion-datetime>
            </ion-item>
            <ion-item>
                <h3>До</h3>
                <ion-datetime v-model="timeEndDate" presentation="date-time" :prefer-wheel="true" minuteValues="0,30"></ion-datetime>
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
  IonSelectOption,
  IonDatetimeButton,
  IonText
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
    IonSelectOption,
    IonDatetimeButton,
    IonText
  },
  data() {
    return {
      timeStartDate: null,
      timeEndDate: null,
      curDate: moment(new Date()).format("DD-MM-YYYY HH:mm"),
      datePicker: moment(new Date()).format("YYYY-MM-DD"),
      selectedDate: moment(new Date()).format("YYYY-MM-DD"),
      today: moment(new Date()).format("YYYY-MM-DD"),
      now: new Date(),
      events: [],
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
      min_hour: 9,
      max_hour: 27,
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
      ownMinut: null,
      classes: ['blue-event', 'green-event', 'orange-event', 'red-event'],
      tab: 1,
      tableList: [],
      idx: 0
    };
  },
  async mounted() {
    await this.getEvents();
    this.$watch('today', this.getEvents)
  },
  updated() {
    setTimeout(() => {
      this.scrollToCurrentTime();
    })

  },
  methods: {
    async getEvents() {
        this.events = [];
        const response = await fetch('http://3.121.29.84/events');
        const result = await response.json();
        for (const r of result) {
          r.start = r.start.replace("T", " ").slice(0, -3);
          r.end = r.end.replace("T", " ").slice(0, -3);
          r.class = this.classes[Number(r.split) - 1] || ''
          this.events.push(r)
        }
        this.tableList = this.events.filter(a => a.start.split(' ')[0] == this.today).sort((a, b) => a.start.localeCompare(b.start));
    },
    scrollToCurrentTime () {
      const calendar = document.querySelector('#vuecal .vuecal__bg')
      const hours = this.now.getHours() + this.now.getMinutes() / 60
      calendar.scrollTo({ top: hours * 155, behavior: 'smooth' })
    },
    cancel() {
      this.isOpen = false;
      this.showEvent = false;
      this.duration = null;
      this.ownHour = null;
      this.ownMinut = null;
      this.selectedDate = this.today;
      this.newEvent = {
        title: '',
        adult: null,
        child: null,
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
          const response = await fetch('http://3.121.29.84/record', {
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
        const response = await fetch('http://3.121.29.84/events/' + this.selectedEvent.id, {
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
        const response = await fetch('http://3.121.29.84/events/' + this.selectedEvent.id, {
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
.vuecal__menu {
  display: none !important;
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
  --ion-color-selected: #104bc9;
}

.ion-color-new {
  --ion-color-base: var(--ion-color-new);
  --ion-color-base-rgb: var(--ion-color-new-rgb);
  --ion-color-contrast: var(--ion-color-new-contrast);
  --ion-color-contrast-rgb: var(--ion-color-new-contrast-rgb);
  --ion-color-shade: var(--ion-color-new-shade);
  --ion-color-tint: var(--ion-color-new-tint);
}
.ion-color-selected {
  --ion-color-base: var(--ion-color-selected);
}
</style>
