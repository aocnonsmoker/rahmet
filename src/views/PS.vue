<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-title>PlayStation</ion-title>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button @click="getPS" color="secondary">Обновить</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content :scrollY="false">
  <div class="page">

    <ion-item>
      <ion-datetime-button datetime="datetimes" />
      <ion-modal :keep-contents-mounted="true">
        <ion-datetime
          id="datetimes"
          presentation="date"
          v-model="today"
        />
      </ion-modal>
    </ion-item>

    <ion-button expand="block" @click="setOpen(true)">Добавить запись</ion-button>

    <!-- Модальное окно -->
        <ion-modal :is-open="isOpen">
          <ion-header>
            <ion-toolbar>
              <ion-buttons slot="start">
                <ion-button @click="cancel()">Отменить</ion-button>
              </ion-buttons>
              <ion-buttons slot="end">
                <ion-button :strong="true" @click="addItem()"
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
                @ionChange="eventTitle = $event.target.value;"
              ></ion-input>
            </ion-item>
            <ion-item>
                <ion-datetime v-model="selectedDate" presentation="date-time" :prefer-wheel="true"></ion-datetime>
            </ion-item>
          </ion-content>
        </ion-modal>

    <!-- ВАЖНО: wrapper -->
    <div class="list-wrapper">
      <div class="records-scroll">
        <div v-for="ps in pss" :key="ps.id">
          <p class="record" @click="onEventClick(ps)">
            <ion-text>
              {{ ps.start.split(' ')[1] }} / {{ ps.title }} / Сумма: {{ ps.price }}
            </ion-text>
          </p>
        </div>
      </div>
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
  name: 'PS',
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
      pss: [],
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
      isOpen: false,
      eventTitle: '',
      selectedDate: moment(new Date()).format("YYYY-MM-DDTHH:mm"),
    }
  },
  async mounted() {
    await this.getPS();
    this.$watch('today', this.getPS)
  },
  methods: {
    async getPS() {
      this.pss = [];
      const response = await fetch('http://3.72.68.148/ps');
      const result = await response.json();
      for (const r of result) {
        r.start = r.start.replace("T", " ").slice(0, -3);
        this.pss.push(r)
      }
      this.pss = this.pss.filter(a => a.start.split(' ')[0] == this.today).sort((a, b) => b.start.localeCompare(a.start));
      this.selectedDate = `${this.today}T${this.selectedDate.split('T')[1]}`
    },
    async addItem() {

        const response = await fetch('http://3.72.68.148/record-ps', {
          method: 'post',
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({title: this.eventTitle, price: null, start: `${this.today} ${this.selectedDate.split('T')[1]}`})
        });
        const result = await response.json();
        alert(result)
        this.eventTitle = '';
        this.isOpen = false;
        await this.getPS();
    },
    onEventClick(event) {
        this.selectedEvent = this.pss.find(item => item.id == event.id);
        this.timeStartDate = `${this.selectedEvent.start.split(' ')[0]}T${this.selectedEvent.start.split(' ')[1]}`
        if (this.selectedEvent) {
            this.showEvent = true;
        }
    },
    cancel() {
      this.showEvent = false;
      this.isOpen = false;
      this.eventTitle = '';
    },
    async confirmEdit() {

        this.selectedEvent.start = `${this.timeStartDate.split('T')[0]} ${this.timeStartDate.split('T')[1]}`
        const response = await fetch('http://3.72.68.148/ps/' + this.selectedEvent.id, {
          method: 'put',
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(this.selectedEvent)
        });
        const result = await response.json();
        alert(result)
        await this.getPS();
        this.showEvent = false;
    },
    async deleteEvent() {
      const apply = confirm('Вы точно хотите удалить запись?')
      if (apply) {
        const response = await fetch('http://3.72.68.148/ps/' + this.selectedEvent.id, {
          method: 'delete',
          headers: {
            "Content-Type": "application/json"
          }
        });
        const result = await response.json();
        alert(result)
        await this.getPS();
        this.showEvent = false; 
      }
    },
    setOpen() {
      this.isOpen = !this.isOpen;
    },
  }
}
</script>

<style>
.page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.list-wrapper {
  flex: 1;
  min-height: 0;
}

.records-scroll {
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.record {
  margin: 20px;
  font-size: 20px;
}

</style>
