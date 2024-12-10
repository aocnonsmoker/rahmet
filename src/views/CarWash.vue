<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-title>Касса</ion-title>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button @click="getCar" color="secondary">Обновить</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <ion-item>
            <ion-datetime-button datetime="datetimes"></ion-datetime-button>
            <ion-modal :keep-contents-mounted="true">
              <ion-datetime
                id="datetimes"
                :first-day-of-week="1"
                presentation="date"
                :format-options="formatOptions"
                v-model="today"
              ></ion-datetime>
            </ion-modal>
          </ion-item>
      <div>
        <ion-button expand="block" @click="addItem"
          >Добавить запись</ion-button
        >
        <div v-for="car in cars" :key="car.id">
          <p style="margin: 10px 20px;" @click="onEventClick(car)">
            <ion-text>{{car.start.split(' ')[1]}} / {{car.title}} / Сумма: {{car.price}}</ion-text>
          </p>
        </div>
      </div>
    </ion-content>
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
                label="Сумма"
                type="number"
                placeholder="тг"
                :value="selectedEvent.price"
                @ionInput="selectedEvent.price = $event.target.value;"
            ></ion-input>
        </ion-item>
        <ion-item>
            <ion-datetime v-model="timeStartDate" presentation="date-time" :prefer-wheel="true"></ion-datetime>
        </ion-item>
        <ion-item>
          <ion-button @click="deleteEvent" color="danger">Удалить</ion-button>
        </ion-item>
      </ion-content>
    </ion-modal>
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
  IonDatetimeButton,
  IonText
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
    IonDatetimeButton,
    IonText
  },
  data() {
    return {
      curDate: moment(new Date()).format("YYYY-MM-DD HH:mm"),
      cars: [],
      formatOptions: {
        date: {
          weekday: "short",
          month: "long",
          day: "2-digit",
        }
      },
      today: moment(new Date()).format("YYYY-MM-DD"),
      showEvent: false,
      selectedEvent: null,
      timeStartDate: null,
    }
  },
  async mounted() {
    await this.getCar();
    this.$watch('today', this.getCar)
  },
  methods: {
    async getCar() {
      this.cars = [];
      const response = await fetch('http://127.0.0.1:8000/car');
      const result = await response.json();
      for (const r of result) {
        r.start = r.start.replace("T", " ").slice(0, -3);
        this.cars.push(r)
      }
      this.cars = this.cars.filter(a => a.start.split(' ')[0] == this.today).sort((a, b) => b.start.localeCompare(a.start));
    },
    async addItem() {
      const response = await fetch('http://127.0.0.1:8000/record-car', {
        method: 'post',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({title: '', price: 1500, start: `${this.today} ${this.curDate.split(' ')[1]}`})
      });
      const result = await response.json();
      alert(result)
      await this.getCar();
    },
    onEventClick(event) {
        this.selectedEvent = this.cars.find(item => item.id == event.id);
        this.timeStartDate = `${this.selectedEvent.start.split(' ')[0]}T${this.selectedEvent.start.split(' ')[1]}`
        if (this.selectedEvent) {
            this.showEvent = true;
        }
    },
    cancel() {
      this.showEvent = false;
    },
    async confirmEdit() {

        this.selectedEvent.start = `${this.timeStartDate.split('T')[0]} ${this.timeStartDate.split('T')[1]}`
        const response = await fetch('http://127.0.0.1:8000/car/' + this.selectedEvent.id, {
          method: 'put',
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(this.selectedEvent)
        });
        const result = await response.json();
        alert(result)
        await this.getCar();
        this.showEvent = false;
    },
    async deleteEvent() {
      const apply = confirm('Вы точно хотите удалить запись?')
      if (apply) {
        const response = await fetch('http://127.0.0.1:8000/car/' + this.selectedEvent.id, {
          method: 'delete',
          headers: {
            "Content-Type": "application/json"
          }
        });
        const result = await response.json();
        alert(result)
        await this.getCar();
        this.showEvent = false; 
      }
    }
  }
}
</script>
