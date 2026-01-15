<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-title>Касса</ion-title>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-title>Итого: {{ totalSpa + totalCar }} тг.</ion-title>
          <ion-button @click="() => { this.getCar(); this.getEvents(); }" color="secondary">Обновить</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <ion-item>
            <ion-datetime-button datetime="datetiming"></ion-datetime-button>
            <ion-modal :keep-contents-mounted="true">
              <ion-datetime
                id="datetiming"
                :first-day-of-week="1"
                presentation="date"
                :format-options="formatOptions"
                v-model="today"
              ></ion-datetime>
            </ion-modal>
          </ion-item>
      <div>
        <ion-item>
            <ion-label>Баня</ion-label>
            <ion-label>{{ totalSpa }} тг.</ion-label>
        </ion-item>
        <ion-item>
            <ion-label>Автомойка</ion-label>
            <ion-label>{{ totalCar }} тг.</ion-label>
        </ion-item>
        <!-- <ion-item>
            <ion-label>Гостиница</ion-label>
            <ion-label>{{ totalCar }} тг.</ion-label>
        </ion-item> -->
        <ion-item>
            <ion-label>PS</ion-label>
            <ion-label>{{ totalPS }} тг.</ion-label>
        </ion-item>
        <!-- <ion-item>
            <ion-label>Караоке</ion-label>
            <ion-label>{{ totalCar }} тг.</ion-label>
        </ion-item> -->
      </div>
    </ion-content>
  </ion-page>
</template>

<script>
import moment from "moment";
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
  IonDatetimeButton
} from "@ionic/vue";

export default {
  name: 'Car Wash',
  components: {
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
    IonDatetimeButton
  },
  data() {
    return {
      cars: [],
      events: [],
      pss: [],
      formatOptions: {
        date: {
          weekday: "short",
          month: "long",
          day: "2-digit",
        }
      },
      today: moment(new Date()).format("YYYY-MM-DD"),
      totalSpa: 0,
      totalCar: 0,
      totalPS: 0
    }
  },
  async mounted() {
    await this.getCar();
    await this.getEvents();
    this.$watch('today', this.sumTotal)
  },
  methods: {
    formatDate(dt) {
        return dt.replace("T", " ").slice(0, -3);
    },

    getDayRange(dateStr) {
        const start = new Date(`${dateStr}T06:00:00`);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return { start, end };
    },

    isInRange(startStr, range) {
        const dt = new Date(startStr.replace(" ", "T"));
        return dt >= range.start && dt < range.end;
    },

    sumTotal() {
        const range = this.getDayRange(this.today);

        this.totalCar = this.cars
            .filter(c => c.price && this.isInRange(c.start, range))
            .reduce((sum, c) => sum + c.price, 0);

        this.totalPS = this.pss
            .filter(c => c.price && this.isInRange(c.start, range))
            .reduce((sum, c) => sum + c.price, 0);

        this.totalSpa = this.events
            .filter(e => e.price && this.isInRange(e.start, range))
            .reduce((sum, e) => sum + e.price, 0);
    },

    async getCar() {
        const res = await fetch('http://3.121.29.84/car');
        const data = await res.json();
        this.cars = data.map(r => ({ ...r, start: this.formatDate(r.start) }));
        this.sumTotal();
    },

    async getPS() {
        const res = await fetch('http://3.121.29.84/ps');
        const data = await res.json();
        this.pss = data.map(r => ({ ...r, start: this.formatDate(r.start) }));
        this.sumTotal();
    },

    async getEvents() {
        const res = await fetch('http://3.121.29.84/events');
        const data = await res.json();
        this.events = data.map(r => ({
            ...r,
            start: this.formatDate(r.start),
            end: this.formatDate(r.end)
        }));
        this.sumTotal();
    }
  }
}
</script>
