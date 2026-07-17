<template>
  <ion-page>
    <ion-header :translucent="true" class="cw-header">
      <ion-toolbar class="cw-toolbar">
        <div class="header-card">
          <div class="header-title">Автомойка</div>
          <button class="header-btn refresh" type="button" @click="getCar">
            <ion-icon :icon="refreshIcon"></ion-icon>
            Обновить
          </button>
        </div>
      </ion-toolbar>
    </ion-header>
    <ion-content :scrollY="false">
      <div class="page-root">
        <div class="date-row">
          <button id="cw-date-trigger" class="date-pill" type="button">{{ formattedDate }}</button>
          <div class="record-count">Записей: <span>{{ cars.length }}</span></div>
        </div>
        <ion-modal :keep-contents-mounted="true" trigger="cw-date-trigger" ref="dateModal">
          <MonthCalendar
            :model-value="today"
            :events="allCars"
            @update:modelValue="onPickDate"
          />
        </ion-modal>

        <ion-button expand="block" class="add-btn" @click="addItem">+ Добавить запись</ion-button>

        <div class="list-wrapper">
          <div class="records-scroll">
            <div
              v-for="car in cars"
              :key="car.id"
              class="record-card"
              @click="onEventClick(car)"
            >
              <div class="record-bar"></div>
              <div class="record-body">
                <div class="record-time">{{ car.start.split(' ')[1] }}</div>
                <div v-if="car.title" class="record-title">{{ car.title }}</div>
                <div class="record-price">Сумма: {{ car.price }} тг.</div>
              </div>
            </div>
            <div v-if="!cars.length" class="empty-state">Нет записей на этот день</div>
          </div>
        </div>
      </div>
    </ion-content>
    <ion-modal class="cw-modal" :is-open="showEvent">
      <ion-header class="cw-modal-header ion-no-border">
        <ion-toolbar class="cw-modal-toolbar">
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
        <ion-item>
            <ion-datetime v-model="timeStartDate" presentation="date-time" :prefer-wheel="true"></ion-datetime>
        </ion-item>
        <ion-button expand="block" class="delete-btn" color="danger" @click="deleteEvent">Удалить</ion-button>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script>
import moment from "moment";
import FormInput from "@/components/FormInput.vue";
import MonthCalendar from "@/components/MonthCalendar.vue";
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

// Business day runs 06:00 to 06:00 next day, so before 6am still belongs to yesterday's schedule.
function computeBusinessDay(date) {
  const d = moment(date);
  if (d.hour() < 6) {
    return d.clone().subtract(1, "day").format("YYYY-MM-DD");
  }
  return d.format("YYYY-MM-DD");
}

export default {
  name: 'Car Wash',
  components: {
    IonContent,
    IonHeader,
    IonPage,
    IonToolbar,
    IonButton,
    IonModal,
    IonDatetime,
    IonIcon,
    FormInput,
    MonthCalendar,
  },
  data() {
    return {
      refreshIcon: refreshOutline,
      curDate: moment(new Date()).format("YYYY-MM-DD HH:mm"),
      cars: [],
      allCars: [],
      today: computeBusinessDay(new Date()),
      showEvent: false,
      selectedEvent: null,
      timeStartDate: null,
    }
  },
  computed: {
    formattedDate() {
      const date = new Date(`${this.today}T00:00:00`);
      return new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
    },
  },
  async mounted() {
    await this.getCar();
    this.$watch('today', this.getCar)
  },
  methods: {
    async getCar() {
      const response = await fetch('http://79.76.52.210:8000/car');
      const result = await response.json();
      const all = [];
      for (const r of result) {
        r.start = r.start.replace("T", " ").slice(0, -3);
        all.push(r)
      }
      this.allCars = all;
      const dayStart = moment(this.today, "YYYY-MM-DD").add(6, "hours");
      const dayEnd = dayStart.clone().add(24, "hours");
      this.cars = all.filter(a => {
        const s = moment(a.start, "YYYY-MM-DD HH:mm");
        return s.isSameOrAfter(dayStart) && s.isBefore(dayEnd);
      }).sort((a, b) => b.start.localeCompare(a.start));
    },
    onPickDate(date) {
      this.today = date;
      if (this.$refs.dateModal) this.$refs.dateModal.$el.dismiss();
    },
    async addItem() {
      const start = moment(new Date()).format("YYYY-MM-DD HH:mm")
      const response = await fetch('http://79.76.52.210:8000/record-car', {
        method: 'post',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({title: '', price: 1500, start})
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
        const response = await fetch('http://79.76.52.210:8000/car/' + this.selectedEvent.id, {
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
        const response = await fetch('http://79.76.52.210:8000/car/' + this.selectedEvent.id, {
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

<style scoped>
.cw-toolbar {
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
  padding: 10px 10px 4px;
  background: #f4f5f7;
}

.date-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
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
}

.record-count {
  font-size: 0.88rem;
  font-weight: 600;
  color: #6a6f75;
  white-space: nowrap;
}

.record-count span {
  color: #2196f3;
  font-weight: 700;
}

.add-btn {
  --border-radius: 12px;
  font-weight: 700;
  margin: 0 2px 14px;
}

.list-wrapper {
  flex: 1;
  min-height: 0;
}

.records-scroll {
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.record-card {
  display: flex;
  align-items: stretch;
  gap: 12px;
  background: #f2ede3;
  border-radius: 14px;
  padding: 12px 14px;
  cursor: pointer;
}

.record-bar {
  width: 3px;
  border-radius: 2px;
  background: #2196f3;
  flex-shrink: 0;
}

.record-time {
  font-weight: 700;
  font-size: 1.05rem;
  color: #1c1c1e;
}

.record-title {
  font-size: 0.85rem;
  color: #5b5f66;
  margin-top: 2px;
}

.record-price {
  font-size: 0.85rem;
  color: #6a6f75;
  margin-top: 2px;
}

.empty-state {
  text-align: center;
  color: #9aa0a6;
  padding: 24px 0;
}

.cw-modal {
  --border-radius: 20px;
}

.cw-modal-toolbar {
  --border-color: transparent;
}

.delete-btn {
  --border-radius: 24px;
  font-weight: 700;
  margin-top: 12px;
}
</style>
