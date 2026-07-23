<template>
  <ion-page>
    <ion-header :translucent="true" class="hotel-header">
      <ion-toolbar class="hotel-toolbar">
        <div class="header-card">
          <button class="header-btn today" type="button" @click="goToday">Сегодня</button>
          <div class="header-title">{{ label }}</div>
          <button class="header-btn refresh" type="button" @click="getRecords">
            <ion-icon :icon="refreshIcon"></ion-icon>
            Обновить
          </button>
          <HeaderMenuButton />
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :scroll-y="true">
      <div class="page-root">
        <ion-button v-if="canWrite" expand="block" class="add-btn" @click="setOpen(true)">+ Добавить запись</ion-button>

        <div class="date-nav">
          <button class="nav-arrow" type="button" @click="prevDay">‹</button>
          <button class="date-pill" type="button" @click="showDateModal = true">{{ formattedDate }}</button>
          <button class="nav-arrow" type="button" @click="nextDay">›</button>
        </div>
        <ion-modal :keep-contents-mounted="true" :is-open="showDateModal" @didDismiss="showDateModal = false">
          <MonthCalendar
            :model-value="selectedDate"
            :events="records"
            @update:modelValue="onPickDate"
          />
        </ion-modal>

        <!-- Список ресурсов -->
        <div class="rooms-list">
          <div
            v-for="resource in resources"
            :key="resource.id"
            class="room-pill"
            :style="{ background: hexToRgba(resource.color, 0.12) }"
          >
            <div class="room-title" :style="{ color: resource.color }">{{ resource.label }}</div>
            <div v-if="recordsForResource(resource.id).length" class="room-events">
              <div
                v-for="record in recordsForResource(resource.id)"
                :key="record.id"
                class="room-event"
                :style="{ background: hexToRgba(resource.color, 0.22), borderColor: hexToRgba(resource.color, 0.55) }"
                @click="onRecordClick(record)"
              >
                <div class="event-title" v-html="record.title"></div>
                <div class="event-dates">{{ showDate(record.start) }} – {{ showDate(record.end) }}</div>
                <div v-if="record.price" class="event-price">{{ record.price }} тг.</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Модальное окно добавления -->
        <ion-modal class="hotel-modal" :is-open="isOpen">
          <ion-header class="hotel-modal-header ion-no-border">
            <ion-toolbar class="hotel-modal-toolbar">
              <ion-buttons slot="start">
                <ion-button fill="clear" color="medium" @click="cancel()">Отменить</ion-button>
              </ion-buttons>
              <ion-buttons slot="end">
                <ion-button fill="clear" color="primary" :strong="true" @click="confirm()">Записать</ion-button>
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
            <FormSelect
              label="Объект"
              placeholder="Выберите объект"
              :model-value="newRecord.resource_id"
              :options="resourceOptions"
              @update:modelValue="newRecord.resource_id = $event"
            />

            <div class="date-field">
              <label class="date-field-label">С</label>
              <button class="date-field-btn" type="button" @click="showAddStartModal = true">{{ formatShort(newRecord.start) }}</button>
            </div>
            <ion-modal :keep-contents-mounted="true" :is-open="showAddStartModal" @didDismiss="showAddStartModal = false">
              <MonthCalendar :model-value="newRecord.start || today" :events="records" @update:modelValue="onPickStart" />
            </ion-modal>

            <div class="date-field">
              <label class="date-field-label">По</label>
              <button class="date-field-btn" type="button" @click="showAddEndModal = true">{{ formatShort(newRecord.end) }}</button>
            </div>
            <ion-modal :keep-contents-mounted="true" :is-open="showAddEndModal" @didDismiss="showAddEndModal = false">
              <MonthCalendar :model-value="newRecord.end || today" :events="records" @update:modelValue="onPickEnd" />
            </ion-modal>
          </ion-content>
        </ion-modal>

        <!-- Модальное окно записи -->
        <ion-modal class="hotel-modal" :is-open="showRecord">
          <ion-header class="hotel-modal-header ion-no-border">
            <ion-toolbar class="hotel-modal-toolbar">
              <ion-buttons slot="start">
                <ion-button fill="clear" color="medium" @click="cancel()">Отменить</ion-button>
              </ion-buttons>
              <ion-buttons slot="end">
                <ion-button fill="clear" color="primary" :strong="true" @click="confirmEdit()">Записать</ion-button>
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
            <FormSelect
              v-if="selectedRecord"
              label="Объект"
              :model-value="selectedRecord.resource_id"
              :options="resourceOptions"
              @update:modelValue="selectedRecord.resource_id = $event"
            />

            <div class="date-field">
              <label class="date-field-label">Заезд</label>
              <button class="date-field-btn" type="button" @click="showEditStartModal = true">{{ formatShort(timeStartDate) }}</button>
            </div>
            <ion-modal :keep-contents-mounted="true" :is-open="showEditStartModal" @didDismiss="showEditStartModal = false">
              <MonthCalendar :model-value="timeStartDate" :events="records" @update:modelValue="onPickEditStart" />
            </ion-modal>

            <div class="date-field">
              <label class="date-field-label">Выезд</label>
              <button class="date-field-btn" type="button" @click="showEditEndModal = true">{{ formatShort(timeEndDate) }}</button>
            </div>
            <ion-modal :keep-contents-mounted="true" :is-open="showEditEndModal" @didDismiss="showEditEndModal = false">
              <MonthCalendar :model-value="timeEndDate" :events="records" @update:modelValue="onPickEditEnd" />
            </ion-modal>

            <ion-button expand="block" class="delete-btn" color="danger" @click="deleteRecord">Удалить</ion-button>
          </ion-content>
        </ion-modal>
      </div>
    </ion-content>
  </ion-page>
</template>

<script>
import moment from "moment";
import MonthCalendar from "@/components/MonthCalendar.vue";
import FormInput from "@/components/FormInput.vue";
import FormSelect from "@/components/FormSelect.vue";
import HeaderMenuButton from "@/components/HeaderMenuButton.vue";
import { apiFetch } from "@/services/api";
import { showAlert, showConfirm } from "@/services/dialogs";
import { useAuthStore } from "@/stores/auth";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  IonButton,
  IonModal,
  IonIcon,
} from "@ionic/vue";
import { refreshOutline } from "ionicons/icons";

export default {
  name: "DateRangeBookingView",
  components: {
    IonContent,
    IonHeader,
    IonPage,
    IonToolbar,
    IonButton,
    IonModal,
    IonIcon,
    MonthCalendar,
    FormInput,
    FormSelect,
    HeaderMenuButton,
  },
  props: {
    sectionKey: { type: String, required: true },
    label: { type: String, required: true },
  },
  data() {
    return {
      refreshIcon: refreshOutline,
      timeStartDate: null,
      timeEndDate: null,
      selectedDate: moment().format("YYYY-MM-DD"),
      today: moment().format("YYYY-MM-DD"),
      records: [],
      resources: [],
      isOpen: false,
      showDateModal: false,
      showAddStartModal: false,
      showAddEndModal: false,
      showEditStartModal: false,
      showEditEndModal: false,
      showRecord: false,
      selectedRecord: null,
      newRecord: {
        title: '',
        resource_id: null,
        price: null,
        start: '',
        end: '',
      },
    };
  },
  computed: {
    canWrite() {
      return useAuthStore().canWrite;
    },
    resourceOptions() {
      return this.resources.map((r) => ({ value: r.id, label: r.label }));
    },
    formattedDate() {
      const date = new Date(`${this.selectedDate}T00:00:00`);
      const str = new Intl.DateTimeFormat("ru-RU", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
      return str.charAt(0).toUpperCase() + str.slice(1);
    },
  },
  async mounted() {
    await Promise.all([this.getRecords(), this.loadResources()]);
  },
  methods: {
    async loadResources() {
      this.resources = await apiFetch(`/resources?section=${this.sectionKey}`);
    },
    hexToRgba(hex, alpha) {
      const h = hex.replace('#', '');
      const bigint = parseInt(h, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },
    formatShort(date) {
      if (!date) return 'Выберите дату';
      const d = new Date(`${date}T00:00:00`);
      return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(d);
    },
    goToday() {
      this.selectedDate = this.today;
    },
    prevDay() {
      const now = Date.now();
      if (now - (this._lastNavClick || 0) < 120) return;
      this._lastNavClick = now;
      this.selectedDate = moment(this.selectedDate).subtract(1, 'day').format('YYYY-MM-DD');
    },
    nextDay() {
      const now = Date.now();
      if (now - (this._lastNavClick || 0) < 120) return;
      this._lastNavClick = now;
      this.selectedDate = moment(this.selectedDate).add(1, 'day').format('YYYY-MM-DD');
    },
    onPickDate(date) {
      this.selectedDate = date;
      this.showDateModal = false;
    },
    onPickStart(date) {
      this.newRecord.start = date;
      this.newRecord.end = moment(date).add(1, 'days').format('YYYY-MM-DD');
      this.showAddStartModal = false;
    },
    onPickEnd(date) {
      this.newRecord.end = date;
      this.showAddEndModal = false;
    },
    onPickEditStart(date) {
      this.timeStartDate = date;
      this.showEditStartModal = false;
    },
    onPickEditEnd(date) {
      this.timeEndDate = date;
      this.showEditEndModal = false;
    },
    recordsForResource(resourceId) {
      return this.records.filter(r => {
        const start = r.start.split(' ')[0];
        const end = r.end.split(' ')[0];
        return r.resource_id === resourceId && this.selectedDate >= start && this.selectedDate < end;
      });
    },
    async getRecords() {
      this.records = [];
      const result = await apiFetch(`/records?section=${this.sectionKey}`);
      for (const r of result) {
        r.start = r.start.replace("T", " ").slice(0, -3);
        r.end = r.end.replace("T", " ").slice(0, -3);
        this.records.push(r);
      }
    },
    cancel() {
      this.isOpen = false;
      this.showRecord = false;
      this.newRecord = {
        title: '',
        resource_id: null,
        price: null,
        start: '',
        end: '',
      };
    },
    isResourceBusy(resourceId, start, end, excludeId = null) {
      return this.records.some(r => {
        if (r.resource_id !== Number(resourceId)) return false;
        if (excludeId && r.id === excludeId) return false;
        const rStart = r.start.split(' ')[0];
        const rEnd = r.end.split(' ')[0];
        return start < rEnd && rStart < end;
      });
    },
    async confirm() {
      if (this.newRecord.title && this.newRecord.resource_id && this.newRecord.start && this.newRecord.end) {
        const start = this.newRecord.start.split('T')[0];
        const end = this.newRecord.end.split('T')[0];
        if (this.isResourceBusy(this.newRecord.resource_id, start, end)) {
          await showAlert('Эти даты уже заняты для выбранного объекта');
          return;
        }
        await apiFetch(`/records?section=${this.sectionKey}`, { method: 'POST', body: this.newRecord });
        await showAlert('Запись добавлена');
        await this.getRecords();
        this.cancel();
      } else {
        await showAlert('Заполните "Название записи", "Объект" и "Даты"');
      }
    },
    async confirmEdit() {
      this.selectedRecord.start = this.timeStartDate.split('T')[0];
      this.selectedRecord.end = this.timeEndDate.split('T')[0];
      if (this.isResourceBusy(this.selectedRecord.resource_id, this.selectedRecord.start, this.selectedRecord.end, this.selectedRecord.id)) {
        await showAlert('Эти даты уже заняты для выбранного объекта');
        return;
      }
      await apiFetch(`/records/${this.selectedRecord.id}?section=${this.sectionKey}`, { method: 'PUT', body: this.selectedRecord });
      await showAlert('Запись обновлена');
      await this.getRecords();
      this.showRecord = false;
    },
    setOpen() {
      this.newRecord.start = this.selectedDate;
      this.newRecord.end = moment(this.selectedDate).add(1, 'days').format('YYYY-MM-DD');
      this.isOpen = true;
    },
    showDate(date) {
      return moment(date).format("DD.MM");
    },
    onRecordClick(record) {
      if (!this.canWrite) return;
      this.selectedRecord = this.records.find(item => item.id == record.id);
      this.timeStartDate = this.selectedRecord.start.split(' ')[0];
      this.timeEndDate = this.selectedRecord.end.split(' ')[0];
      if (this.selectedRecord) {
        this.showRecord = true;
      }
    },
    async deleteRecord() {
      const apply = await showConfirm('Вы точно хотите удалить запись?', { header: 'Удаление', confirmText: 'Удалить' });
      if (apply) {
        await apiFetch(`/records/${this.selectedRecord.id}?section=${this.sectionKey}`, { method: 'DELETE' });
        await showAlert('Запись удалена');
        await this.getRecords();
        this.showRecord = false;
      }
    },
  },
};
</script>

<style scoped>
.hotel-toolbar {
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

.header-btn.today {
  color: #2196f3;
}

.header-btn.refresh {
  color: #9aa0a6;
}

.header-btn ion-icon {
  font-size: 16px;
}

.page-root {
  display: flex;
  flex-direction: column;
  padding: 10px 10px 4px;
  background: #f4f5f7;
}

.add-btn {
  --border-radius: 12px;
  font-weight: 700;
  margin: 0 2px 14px;
}

.date-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 0 2px 14px;
}

.nav-arrow {
  border: none;
  background: transparent;
  color: #9aa0a6;
  font-size: 22px;
  line-height: 1;
  padding: 4px 10px;
  cursor: pointer;
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
  width: 270px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rooms-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.room-pill {
  border-radius: 14px;
  padding: 14px 16px;
}

.room-title {
  font-weight: 700;
  font-size: 0.95rem;
}

.room-events {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.room-event {
  border-radius: 10px;
  border: 1.5px solid;
  padding: 8px 10px;
  cursor: pointer;
  font-size: 0.82rem;
}

.event-title { font-weight: 700; }
.event-dates { color: #5b5f66; font-size: 0.75rem; margin-top: 1px; }
.event-price { font-weight: 700; font-size: 0.78rem; margin-top: 1px; }

.hotel-modal {
  --border-radius: 20px;
}

.hotel-modal-toolbar {
  --border-color: transparent;
}

.date-field {
  margin-bottom: 6px;
}

.date-field-label {
  display: block;
  font-weight: 700;
  font-size: 0.8rem;
  color: #1c1c1e;
  margin-bottom: 6px;
}

.date-field-btn {
  width: 100%;
  box-sizing: border-box;
  border: none;
  background: #eef0f0;
  border-radius: 14px;
  padding: 14px 16px;
  font-size: 1rem;
  font-weight: 600;
  color: #2196f3;
  text-align: left;
  cursor: pointer;
  margin-bottom: 14px;
}

.delete-btn {
  --border-radius: 24px;
  font-weight: 700;
  margin-top: 12px;
}
</style>
