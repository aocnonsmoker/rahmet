<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ curDate }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Blank</ion-title>
        </ion-toolbar>
      </ion-header>

      <div id="container">
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
		  timeCellHeight="80"
        >
          <template #split-label="{ split }">
            <strong :style="`color: ${split.color}`">{{ split.label }}</strong>
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
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                label-placement="stacked"
                label="Взрослые"
                type="number"
                placeholder="0"
              ></ion-input>
              <ion-input
                label-placement="stacked"
                label="Детские"
                type="number"
                placeholder="0"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-datetime-button datetime="datetime"></ion-datetime-button>
              <ion-modal :keep-contents-mounted="true">
                <ion-datetime
                  id="datetime"
                  presentation="date"
                  :value="datePicker"
                  :format-options="formatOptions"
                ></ion-datetime>
              </ion-modal>
            </ion-item>
            <ion-item>
              <ion-label>
                <h2>Баня 1</h2>
                <ion-row>
                  <ion-col v-for="i in 5" :key="i" size="4">
                    <ion-button color="medium">{{ `${i}0:00` }}</ion-button>
                  </ion-col>
                </ion-row>
              </ion-label>
            </ion-item>
			<ion-item>
              <ion-label>
                <h2>Баня 2</h2>
                <ion-row>
                  <ion-col v-for="i in 5" :key="i" size="4">
                    <ion-button color="medium">{{ `${i}0:00` }}</ion-button>
                  </ion-col>
                </ion-row>
              </ion-label>
            </ion-item>
			<ion-item>
              <ion-label>
                <h2>Баня 3</h2>
                <ion-row>
                  <ion-col v-for="i in 5" :key="i" size="4">
                    <ion-button color="medium">{{ `${i}0:00` }}</ion-button>
                  </ion-col>
                </ion-row>
              </ion-label>
            </ion-item>
			<ion-item>
              <ion-label>
                <h2>Баня 4</h2>
                <ion-row>
                  <ion-col v-for="i in 5" :key="i" size="4">
                    <ion-button color="medium">{{ `${i}0:00` }}</ion-button>
                  </ion-col>
                </ion-row>
              </ion-label>
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
  },
  data() {
    return {
      curDate: moment(new Date()).format("DD-MM-YYYY HH:mm"),
      datePicker: moment(new Date()).format("YYYY-MM-DD"),
      now: new Date(),
      events: [
        {
          start: "2024-10-25 23:00",
          end: "2024-10-26 00:00",
          title: "87074567894",
		  class: 'blue-event',
          split: 1,
        },
        {
          start: "2024-10-25 23:30",
          end: "2024-10-26 01:00",
          title: "87015468794",
		  class: 'green-event',
          split: 2,
        },
        {
          start: "2024-10-25 16:00",
          end: "2024-10-25 18:00",
          title: "Ербол",
		  class: 'blue-event',
          split: 1,
        },
        {
          start: "2024-10-25 16:00",
          end: "2024-10-25 18:00",
          title: "Анара кб",
		  class: 'green-event',
          split: 2,
        },
        {
          start: "2024-10-25 16:00",
          end: "2024-10-25 18:00",
          title: "870015654987",
		  class: 'orange-event',
          split: 3,
        },
        {
          start: "2024-10-25 15:00",
          end: "2024-10-25 16:00",
          title: "87471235478",
		  class: 'red-event',
          split: 4,
        },
      ],
      splitDays: [
        { id: 1, color: "blue", label: "Баня 1", class: "split1" },
        { id: 2, color: "green", label: "Баня 2", class: "split2" },
        { id: 3, color: "orange", label: "Баня 3", class: "split3" },
        { id: 4, color: "red", label: "Баня 4", class: "split4" },
      ],
      isOpen: false,
      formatOptions: {
        date: {
          weekday: "short",
          month: "long",
          day: "2-digit",
        },
      },
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
      this.isOpen = !this.isOpen;
    },
    confirm() {
      this.isOpen = !this.isOpen;
    },
    setOpen() {
      this.isOpen = !this.isOpen;
    },
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
.vuecal__body .split1 {background-color: rgba(226, 242, 253, 0.7);}
.vuecal__body .split2 {background-color: rgba(232, 245, 233, 0.7);}
.vuecal__body .split3 {background-color: rgba(255, 243, 224, 0.7);}
.vuecal__body .split4 {background-color: rgba(255, 235, 238, 0.7);}
.vuecal__no-event {
  display: none;
}
.vuecal__event.blue-event {background-color: rgba(112, 192, 245, 0.7);color: #000000;}
.vuecal__event.green-event {background-color: rgba(137, 243, 146, 0.7);color: #000000;}
.vuecal__event.orange-event {background-color: rgba(245, 207, 146, 0.7);color: #000000;}
.vuecal__event.red-event {background-color: rgba(247, 143, 158, 0.7);color: #000000;}
</style>
