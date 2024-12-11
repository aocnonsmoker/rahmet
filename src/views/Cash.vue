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
      formatOptions: {
        date: {
          weekday: "short",
          month: "long",
          day: "2-digit",
        }
      },
      today: moment(new Date()).format("YYYY-MM-DD"),
      totalSpa: 0,
      totalCar: 0
    }
  },
  async mounted() {
    await this.getCar();
    await this.getEvents();
    this.$watch('today', this.sumTotal)
  },
  methods: {
    sumTotal() {
        this.totalCar = 0;
        this.totalSpa = 0;
        const spa = this.events.filter(a => a.start.split(' ')[0] == this.today);
        const car = this.cars.filter(a => a.start.split(' ')[0] == this.today);
        for (const c of car) {
            if (c.price) {
                this.totalCar += c.price;
            }
        }
        for (const s of spa) {
            if (s.price) {
                this.totalSpa += s.price;
            }
        }
    },
    async getCar() {
      this.cars = [];
      const response = await fetch('http://3.121.29.84/car');
      const result = await response.json();
      for (const r of result) {
        r.start = r.start.replace("T", " ").slice(0, -3);
        this.cars.push(r)
      }
      this.sumTotal();
    },
    async getEvents() {
        this.events = [];
        const response = await fetch('http://3.121.29.84/events');
        const result = await response.json();
        for (const r of result) {
          r.start = r.start.replace("T", " ").slice(0, -3);
          r.end = r.end.replace("T", " ").slice(0, -3);
          this.events.push(r)
        }
        this.sumTotal();
    },
  }
}
</script>
