<template>
  <ion-page>
    <ion-header :translucent="true" class="cw-header">
      <ion-toolbar class="cw-toolbar">
        <div class="header-card">
          <div class="header-title">{{ label }}</div>
          <button class="header-btn refresh" type="button" @click="getRecords">
            <ion-icon :icon="refreshIcon"></ion-icon>
            Обновить
          </button>
          <HeaderMenuButton />
        </div>
      </ion-toolbar>
    </ion-header>
    <ion-content :scrollY="false">
      <div class="page-root">
        <div class="date-row">
          <button class="date-pill" type="button" @click="showDateModal = true">{{ formattedDate }}</button>
          <div class="record-count">Записей: <span>{{ todayRecords.length }}</span></div>
        </div>
        <ion-modal :keep-contents-mounted="true" :is-open="showDateModal" @didDismiss="showDateModal = false">
          <MonthCalendar
            :model-value="today"
            :events="allRecords"
            @update:modelValue="onPickDate"
          />
        </ion-modal>

        <ion-button v-if="canWrite" expand="block" class="add-btn" @click="openAddModal">+ Добавить запись</ion-button>

        <div class="list-wrapper">
          <div class="records-scroll">
            <div
              v-for="record in todayRecords"
              :key="record.id"
              class="record-card"
              @click="onRecordClick(record)"
            >
              <div class="record-bar"></div>
              <div class="record-body">
                <div class="record-time">{{ record.start.split(' ')[1] }}</div>
                <div v-if="record.title" class="record-title">{{ record.title }}</div>
                <div class="record-price">Сумма: {{ record.price }} тг.</div>
              </div>
            </div>
            <div v-if="!todayRecords.length" class="empty-state">Нет записей на этот день</div>
          </div>
        </div>
      </div>
    </ion-content>
    <ion-modal class="cw-modal" :is-open="showRecord">
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
          v-if="selectedRecord"
          label="Название записи"
          type="text"
          placeholder="Имя клиента или телефон"
          :model-value="selectedRecord.title"
          @update:modelValue="selectedRecord.title = $event"
        />
        <FormInput
          v-if="selectedRecord"
          label="Сумма"
          type="number"
          suffix="тг."
          :model-value="selectedRecord.price"
          @update:modelValue="selectedRecord.price = $event"
        />
        <ion-item>
            <ion-datetime v-model="timeStartDate" presentation="date-time" :prefer-wheel="true"></ion-datetime>
        </ion-item>
        <ion-button expand="block" class="delete-btn" color="danger" @click="deleteRecord">Удалить</ion-button>
      </ion-content>
    </ion-modal>

    <ion-modal class="cw-modal" :is-open="showAddModal">
      <ion-header class="cw-modal-header ion-no-border">
        <ion-toolbar class="cw-modal-toolbar">
          <ion-buttons slot="start">
            <ion-button fill="clear" color="medium" @click="showAddModal = false">Отменить</ion-button>
          </ion-buttons>
          <ion-buttons slot="end">
            <ion-button fill="clear" color="primary" :strong="true" @click="confirmAdd()"
              >Записать</ion-button
            >
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <FormInput
          label="Название записи"
          type="text"
          placeholder="Имя клиента или телефон"
          :model-value="newRecord.title"
          @update:modelValue="newRecord.title = $event"
        />
        <FormInput
          label="Сумма"
          type="number"
          suffix="тг."
          :model-value="newRecord.price"
          @update:modelValue="newRecord.price = $event"
        />
        <ion-item>
            <ion-datetime v-model="newRecordDate" presentation="date-time" :prefer-wheel="true"></ion-datetime>
        </ion-item>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script>
import moment from "moment";
import FormInput from "@/components/FormInput.vue";
import MonthCalendar from "@/components/MonthCalendar.vue";
import HeaderMenuButton from "@/components/HeaderMenuButton.vue";
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
import { apiFetch } from "@/services/api";
import { showAlert, showConfirm } from "@/services/dialogs";
import { useAuthStore } from "@/stores/auth";

// Business day runs 06:00 to 06:00 next day, so before 6am still belongs to yesterday's schedule.
function computeBusinessDay(date) {
  const d = moment(date);
  if (d.hour() < 6) {
    return d.clone().subtract(1, "day").format("YYYY-MM-DD");
  }
  return d.format("YYYY-MM-DD");
}

// Records are fetched in a window around the day being viewed instead of the whole
// section history (which only grows over time) — re-fetched when the date picker
// moves outside the currently loaded window.
const RECORDS_WINDOW_DAYS = 30;

export default {
  name: 'QueueListView',
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
    HeaderMenuButton,
  },
  props: {
    sectionKey: { type: String, required: true },
    label: { type: String, required: true },
  },
  data() {
    return {
      refreshIcon: refreshOutline,
      allRecords: [],
      loadedRangeStart: null,
      loadedRangeEnd: null,
      today: computeBusinessDay(new Date()),
      showDateModal: false,
      showRecord: false,
      selectedRecord: null,
      timeStartDate: null,
      showAddModal: false,
      newRecord: { title: '', price: null },
      newRecordDate: null,
    }
  },
  computed: {
    canWrite() {
      return useAuthStore().canWrite;
    },
    formattedDate() {
      const date = new Date(`${this.today}T00:00:00`);
      return new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
    },
    todayRecords() {
      const dayStart = moment(this.today, "YYYY-MM-DD").add(6, "hours");
      const dayEnd = dayStart.clone().add(24, "hours");
      return this.allRecords.filter(r => {
        const s = moment(r.start, "YYYY-MM-DD HH:mm");
        return s.isSameOrAfter(dayStart) && s.isBefore(dayEnd);
      }).sort((a, b) => b.start.localeCompare(a.start));
    },
  },
  async mounted() {
    await this.getRecords();
  },
  watch: {
    today(newDate) {
      if (!this.isDateLoaded(newDate)) {
        this.getRecords();
      }
    },
  },
  methods: {
    async getRecords() {
      const center = moment(this.today, "YYYY-MM-DD");
      // Plain strings, not moment instances — see TimeSlotBookingView.vue's getRecords
      // for why (Vue reactivity proxy breaks moment's internal comparison methods).
      const rangeStart = center.clone().subtract(RECORDS_WINDOW_DAYS, "days").startOf("day").format("YYYY-MM-DD HH:mm:ss");
      const rangeEnd = center.clone().add(RECORDS_WINDOW_DAYS, "days").startOf("day").format("YYYY-MM-DD HH:mm:ss");
      const params = new URLSearchParams({
        section: this.sectionKey,
        start: rangeStart,
        end: rangeEnd,
      });
      const result = await apiFetch(`/records?${params}`);
      const all = [];
      for (const r of result) {
        r.start = r.start.replace("T", " ").slice(0, -3);
        all.push(r)
      }
      this.allRecords = all;
      this.loadedRangeStart = rangeStart;
      this.loadedRangeEnd = rangeEnd;
    },
    isDateLoaded(date) {
      if (!this.loadedRangeStart || !this.loadedRangeEnd) return false;
      const d = moment(date, "YYYY-MM-DD");
      const fmt = "YYYY-MM-DD HH:mm:ss";
      return d.isSameOrAfter(moment(this.loadedRangeStart, fmt)) && d.isBefore(moment(this.loadedRangeEnd, fmt));
    },
    onPickDate(date) {
      this.today = date;
      this.showDateModal = false;
    },
    openAddModal() {
      this.newRecord = { title: '', price: null };
      this.newRecordDate = moment(new Date()).format("YYYY-MM-DDTHH:mm");
      this.showAddModal = true;
    },
    async confirmAdd() {
      const start = `${this.newRecordDate.split('T')[0]} ${this.newRecordDate.split('T')[1]}`;
      await apiFetch(`/records?section=${this.sectionKey}`, {
        method: 'POST',
        body: { title: this.newRecord.title, price: this.newRecord.price, start },
      });
      await showAlert('Запись добавлена')
      this.showAddModal = false;
      await this.getRecords();
    },
    onRecordClick(record) {
        if (!this.canWrite) return;
        this.selectedRecord = this.allRecords.find(item => item.id == record.id);
        this.timeStartDate = `${this.selectedRecord.start.split(' ')[0]}T${this.selectedRecord.start.split(' ')[1]}`
        if (this.selectedRecord) {
            this.showRecord = true;
        }
    },
    cancel() {
      this.showRecord = false;
    },
    async confirmEdit() {
        this.selectedRecord.start = `${this.timeStartDate.split('T')[0]} ${this.timeStartDate.split('T')[1]}`
        await apiFetch(`/records/${this.selectedRecord.id}?section=${this.sectionKey}`, { method: 'PUT', body: this.selectedRecord });
        await showAlert('Запись обновлена')
        await this.getRecords();
        this.showRecord = false;
    },
    async deleteRecord() {
      const apply = await showConfirm('Вы точно хотите удалить запись?', { header: 'Удаление', confirmText: 'Удалить' })
      if (apply) {
        await apiFetch(`/records/${this.selectedRecord.id}?section=${this.sectionKey}`, { method: 'DELETE' });
        await showAlert('Запись удалена')
        await this.getRecords();
        this.showRecord = false;
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
