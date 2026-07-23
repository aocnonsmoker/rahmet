<template>
  <ion-page class="page">
    <div class="page-header">
      <h1 class="page-title">{{ label }}</h1>
      <div class="date-nav">
        <button class="nav-arrow" type="button" @click="prevDay">‹</button>
        <button class="date-pill" type="button" @click="showDateModal = true">{{ formattedDate }}</button>
        <button class="nav-arrow" type="button" @click="nextDay">›</button>
      </div>
      <button class="today-btn" type="button" @click="goToday">Сегодня</button>
      <button class="link-btn" type="button" @click="getRecords">
        <ion-icon :icon="refreshIcon"></ion-icon>
        Обновить
      </button>
      <button v-if="canWrite" class="primary-btn" type="button" @click="openAddModal">+ Добавить запись</button>
    </div>

    <div class="rooms-list">
      <div v-for="resource in resources" :key="resource.id" class="room-pill" :style="{ background: hexToRgba(resource.color, 0.1) }">
        <div class="room-title" :style="{ color: resource.color }">{{ resource.label }}</div>
        <div v-if="recordsForResource(resource.id).length" class="room-events">
          <div
            v-for="record in recordsForResource(resource.id)"
            :key="record.id"
            class="room-event"
            :style="{ background: hexToRgba(resource.color, 0.2), borderColor: hexToRgba(resource.color, 0.5) }"
            @click="onRecordClick(record)"
          >
            <div class="event-title">{{ record.title }}</div>
            <div class="event-dates">{{ showDate(record.start) }} – {{ showDate(record.end) }}</div>
            <div v-if="record.price" class="event-price">{{ record.price }} тг.</div>
          </div>
        </div>
      </div>
    </div>

    <DesktopModal v-model="showDateModal" title="Выберите дату">
      <MonthCalendar :model-value="selectedDate" :events="records" @update:modelValue="onPickDate" />
    </DesktopModal>

    <DesktopModal v-model="isOpen" title="Новая запись">
      <FormInput label="Название записи" type="text" placeholder="Имя клиента или телефон" :model-value="newRecord.title" @update:modelValue="newRecord.title = $event" />
      <FormInput label="Сумма" type="number" suffix="тг." :model-value="newRecord.price" @update:modelValue="newRecord.price = $event" />
      <FormSelect label="Объект" placeholder="Выберите объект" :model-value="newRecord.resource_id" :options="resourceOptions" @update:modelValue="newRecord.resource_id = $event" />

      <div class="date-field">
        <label class="date-field-label">С</label>
        <button class="date-field-btn" type="button" @click="showAddStartModal = true">{{ formatShort(newRecord.start) }}</button>
      </div>
      <DesktopModal v-model="showAddStartModal" title="Выберите дату">
        <MonthCalendar :model-value="newRecord.start || today" :events="records" @update:modelValue="onPickStart" />
      </DesktopModal>

      <div class="date-field">
        <label class="date-field-label">По</label>
        <button class="date-field-btn" type="button" @click="showAddEndModal = true">{{ formatShort(newRecord.end) }}</button>
      </div>
      <DesktopModal v-model="showAddEndModal" title="Выберите дату">
        <MonthCalendar :model-value="newRecord.end || today" :events="records" @update:modelValue="onPickEnd" />
      </DesktopModal>

      <template #footer>
        <button class="pill-btn ghost" type="button" @click="cancel">Отменить</button>
        <button class="pill-btn primary" type="button" @click="confirm">Записать</button>
      </template>
    </DesktopModal>

    <DesktopModal v-model="showRecord" title="Запись">
      <template v-if="selectedRecord">
        <FormInput label="Название записи" type="text" :model-value="selectedRecord.title" @update:modelValue="selectedRecord.title = $event" />
        <FormInput label="Сумма" type="number" suffix="тг." :model-value="selectedRecord.price" @update:modelValue="selectedRecord.price = $event" />
        <FormSelect label="Объект" :model-value="selectedRecord.resource_id" :options="resourceOptions" @update:modelValue="selectedRecord.resource_id = $event" />

        <div class="date-field">
          <label class="date-field-label">Заезд</label>
          <button class="date-field-btn" type="button" @click="showEditStartModal = true">{{ formatShort(timeStartDate) }}</button>
        </div>
        <DesktopModal v-model="showEditStartModal" title="Выберите дату">
          <MonthCalendar :model-value="timeStartDate" :events="records" @update:modelValue="onPickEditStart" />
        </DesktopModal>

        <div class="date-field">
          <label class="date-field-label">Выезд</label>
          <button class="date-field-btn" type="button" @click="showEditEndModal = true">{{ formatShort(timeEndDate) }}</button>
        </div>
        <DesktopModal v-model="showEditEndModal" title="Выберите дату">
          <MonthCalendar :model-value="timeEndDate" :events="records" @update:modelValue="onPickEditEnd" />
        </DesktopModal>
      </template>
      <template #footer>
        <button class="pill-btn danger" type="button" @click="deleteRecord">Удалить</button>
        <button class="pill-btn primary" type="button" @click="confirmEdit">Сохранить</button>
      </template>
    </DesktopModal>
  </ion-page>
</template>

<script>
import moment from 'moment';
import { IonPage, IonIcon } from '@ionic/vue';
import { refreshOutline } from 'ionicons/icons';
import DesktopModal from '@/components/desktop/DesktopModal.vue';
import FormInput from '@/components/FormInput.vue';
import FormSelect from '@/components/FormSelect.vue';
import MonthCalendar from '@/components/MonthCalendar.vue';
import { apiFetch } from '@/services/api';
import { showAlert, showConfirm } from '@/services/dialogs';
import { useAuthStore } from '@/stores/auth';

export default {
  name: 'DesktopDateRangeView',
  components: { IonPage, IonIcon, DesktopModal, FormInput, FormSelect, MonthCalendar },
  props: {
    sectionKey: { type: String, required: true },
    label: { type: String, required: true },
  },
  data() {
    return {
      refreshIcon: refreshOutline,
      timeStartDate: null,
      timeEndDate: null,
      selectedDate: moment().format('YYYY-MM-DD'),
      today: moment().format('YYYY-MM-DD'),
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
      newRecord: { title: '', resource_id: null, price: null, start: '', end: '' },
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
      const str = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
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
      return `rgba(${(bigint >> 16) & 255}, ${(bigint >> 8) & 255}, ${bigint & 255}, ${alpha})`;
    },
    formatShort(date) {
      if (!date) return 'Выберите дату';
      const d = new Date(`${date}T00:00:00`);
      return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(d);
    },
    goToday() {
      this.selectedDate = this.today;
    },
    prevDay() {
      this.selectedDate = moment(this.selectedDate).subtract(1, 'day').format('YYYY-MM-DD');
    },
    nextDay() {
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
      return this.records.filter((r) => {
        const start = r.start.split(' ')[0];
        const end = r.end.split(' ')[0];
        return r.resource_id === resourceId && this.selectedDate >= start && this.selectedDate < end;
      });
    },
    async getRecords() {
      const result = await apiFetch(`/records?section=${this.sectionKey}`);
      this.records = result.map((r) => ({ ...r, start: r.start.replace('T', ' ').slice(0, -3), end: r.end.replace('T', ' ').slice(0, -3) }));
    },
    cancel() {
      this.isOpen = false;
      this.showRecord = false;
      this.newRecord = { title: '', resource_id: null, price: null, start: '', end: '' };
    },
    isResourceBusy(resourceId, start, end, excludeId = null) {
      return this.records.some((r) => {
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
    openAddModal() {
      this.newRecord.start = this.selectedDate;
      this.newRecord.end = moment(this.selectedDate).add(1, 'days').format('YYYY-MM-DD');
      this.isOpen = true;
    },
    showDate(date) {
      return moment(date).format('DD.MM');
    },
    onRecordClick(record) {
      if (!this.canWrite) return;
      this.selectedRecord = { ...this.records.find((item) => item.id === record.id) };
      this.timeStartDate = this.selectedRecord.start.split(' ')[0];
      this.timeEndDate = this.selectedRecord.end.split(' ')[0];
      this.showRecord = true;
    },
    async deleteRecord() {
      const ok = await showConfirm('Вы точно хотите удалить запись?', { header: 'Удаление', confirmText: 'Удалить' });
      if (!ok) return;
      await apiFetch(`/records/${this.selectedRecord.id}?section=${this.sectionKey}`, { method: 'DELETE' });
      await showAlert('Запись удалена');
      await this.getRecords();
      this.showRecord = false;
    },
  },
};
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  overflow-y: auto;
  padding: 24px 28px;
  box-sizing: border-box;
  background: #f4f5f7;
}

.page-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.page-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: #1c1c1e;
  margin: 0;
}

.today-btn {
  border: none;
  background: rgba(33, 150, 243, 0.1);
  color: #2196f3;
  font-weight: 700;
  font-size: 0.8rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  padding: 8px 14px;
  border-radius: 10px;
  cursor: pointer;
}

.link-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  color: #9aa0a6;
  font-weight: 700;
  font-size: 0.8rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  cursor: pointer;
}

.link-btn ion-icon {
  font-size: 16px;
}

.primary-btn {
  border: none;
  background: #2196f3;
  color: #fff;
  font-weight: 700;
  font-size: 0.8rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  padding: 12px 20px;
  border-radius: 12px;
  cursor: pointer;
}

.date-nav {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
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
  width: 300px;
  box-sizing: border-box;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rooms-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
  align-items: start;
}

.room-pill {
  border-radius: 12px;
  padding: 14px 16px;
}

.room-title {
  font-weight: 700;
  font-size: 0.92rem;
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
  padding: 10px 12px;
  cursor: pointer;
  font-size: 0.85rem;
  background: #fff;
}

.event-title {
  font-weight: 700;
}

.event-dates {
  color: #5b5f66;
  font-size: 0.78rem;
  margin-top: 2px;
}

.event-price {
  font-weight: 700;
  font-size: 0.8rem;
  margin-top: 2px;
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

.pill-btn {
  border: none;
  border-radius: 12px;
  padding: 10px 20px;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
}

.pill-btn.ghost {
  background: #f4f5f7;
  color: #4a4f55;
}

.pill-btn.primary {
  background: #2196f3;
  color: #fff;
}

.pill-btn.danger {
  background: rgba(244, 67, 54, 0.12);
  color: #d32f2f;
  margin-right: auto;
}
</style>
