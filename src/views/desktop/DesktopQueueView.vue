<template>
  <ion-page class="page">
    <div class="page-header">
      <h1 class="page-title">{{ label }}</h1>
      <div class="record-count">Записей: <span>{{ todayRecords.length }}</span></div>
      <div class="date-nav">
        <button class="nav-arrow" type="button" @click="prevDay">‹</button>
        <button class="date-pill" type="button" @click="showCalendar = true">{{ formattedDate }}</button>
        <button class="nav-arrow" type="button" @click="nextDay">›</button>
      </div>
      <button class="today-btn" type="button" @click="goToday">Сегодня</button>
      <button class="link-btn" type="button" @click="getRecords">
        <ion-icon :icon="refreshIcon"></ion-icon>
        Обновить
      </button>
      <button v-if="canWrite" class="primary-btn" type="button" @click="openAddModal">+ Добавить запись</button>
    </div>

    <div class="cards-grid">
      <div v-for="record in todayRecords" :key="record.id" class="record-card" @click="onRecordClick(record)">
        <div class="record-bar"></div>
        <div class="record-body">
          <div class="record-time">{{ record.start.split(' ')[1] }}</div>
          <div v-if="record.title" class="record-title">{{ record.title }}</div>
          <div class="record-price">Сумма: {{ record.price }} тг.</div>
        </div>
      </div>
      <div v-if="!todayRecords.length" class="empty-state">Нет записей на этот день</div>
    </div>

    <DesktopModal v-model="showCalendar" title="Выберите дату">
      <MonthCalendar :model-value="today" :events="allRecords" @update:modelValue="onPickDate" />
    </DesktopModal>

    <DesktopModal v-model="showAddModal" title="Новая запись">
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
      <FormInput
        label="Дата и время"
        type="datetime-local"
        :model-value="newRecordDate"
        @update:modelValue="newRecordDate = $event"
      />
      <template #footer>
        <button class="pill-btn ghost" type="button" @click="showAddModal = false">Отменить</button>
        <button class="pill-btn primary" type="button" @click="confirmAdd">Записать</button>
      </template>
    </DesktopModal>

    <DesktopModal v-model="showEditModal" title="Запись">
      <template v-if="selectedRecord">
        <FormInput
          label="Название записи"
          type="text"
          placeholder="Имя клиента или телефон"
          :model-value="selectedRecord.title"
          @update:modelValue="selectedRecord.title = $event"
        />
        <FormInput
          label="Сумма"
          type="number"
          suffix="тг."
          :model-value="selectedRecord.price"
          @update:modelValue="selectedRecord.price = $event"
        />
        <FormInput
          label="Дата и время"
          type="datetime-local"
          :model-value="editRecordDate"
          @update:modelValue="editRecordDate = $event"
        />
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
import MonthCalendar from '@/components/MonthCalendar.vue';
import { apiFetch } from '@/services/api';
import { showAlert, showConfirm } from '@/services/dialogs';
import { useAuthStore } from '@/stores/auth';

// Business day runs 06:00 to 06:00 next day, so before 6am still belongs to yesterday's schedule.
function computeBusinessDay(date) {
  const d = moment(date);
  if (d.hour() < 6) {
    return d.clone().subtract(1, 'day').format('YYYY-MM-DD');
  }
  return d.format('YYYY-MM-DD');
}

export default {
  name: 'DesktopQueueView',
  components: { IonPage, IonIcon, DesktopModal, FormInput, MonthCalendar },
  props: {
    sectionKey: { type: String, required: true },
    label: { type: String, required: true },
  },
  data() {
    return {
      refreshIcon: refreshOutline,
      allRecords: [],
      today: computeBusinessDay(new Date()),
      showCalendar: false,
      showAddModal: false,
      showEditModal: false,
      newRecord: { title: '', price: null },
      newRecordDate: '',
      selectedRecord: null,
      editRecordDate: '',
    };
  },
  computed: {
    canWrite() {
      return useAuthStore().canWrite;
    },
    formattedDate() {
      const date = new Date(`${this.today}T00:00:00`);
      const str = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
      return str.charAt(0).toUpperCase() + str.slice(1);
    },
    todayRecords() {
      const dayStart = moment(this.today, 'YYYY-MM-DD').add(6, 'hours');
      const dayEnd = dayStart.clone().add(24, 'hours');
      return this.allRecords
        .filter((r) => {
          const s = moment(r.start, 'YYYY-MM-DD HH:mm');
          return s.isSameOrAfter(dayStart) && s.isBefore(dayEnd);
        })
        .sort((a, b) => b.start.localeCompare(a.start));
    },
  },
  async mounted() {
    await this.getRecords();
  },
  methods: {
    async getRecords() {
      const result = await apiFetch(`/records?section=${this.sectionKey}`);
      this.allRecords = result.map((r) => ({ ...r, start: r.start.replace('T', ' ').slice(0, -3) }));
    },
    onPickDate(date) {
      this.today = date;
      this.showCalendar = false;
    },
    goToday() {
      this.today = computeBusinessDay(new Date());
    },
    prevDay() {
      this.today = moment(this.today).subtract(1, 'day').format('YYYY-MM-DD');
    },
    nextDay() {
      this.today = moment(this.today).add(1, 'day').format('YYYY-MM-DD');
    },
    openAddModal() {
      this.newRecord = { title: '', price: null };
      this.newRecordDate = moment(new Date()).format('YYYY-MM-DDTHH:mm');
      this.showAddModal = true;
    },
    async confirmAdd() {
      const start = this.newRecordDate.replace('T', ' ');
      await apiFetch(`/records?section=${this.sectionKey}`, {
        method: 'POST',
        body: { title: this.newRecord.title, price: this.newRecord.price, start },
      });
      this.showAddModal = false;
      await this.getRecords();
    },
    onRecordClick(record) {
      if (!this.canWrite) return;
      this.selectedRecord = { ...this.allRecords.find((item) => item.id === record.id) };
      this.editRecordDate = this.selectedRecord.start.replace(' ', 'T');
      this.showEditModal = true;
    },
    async confirmEdit() {
      this.selectedRecord.start = this.editRecordDate.replace('T', ' ');
      await apiFetch(`/records/${this.selectedRecord.id}?section=${this.sectionKey}`, {
        method: 'PUT',
        body: this.selectedRecord,
      });
      await this.getRecords();
      this.showEditModal = false;
    },
    async deleteRecord() {
      const ok = await showConfirm('Вы точно хотите удалить запись?', { header: 'Удаление', confirmText: 'Удалить' });
      if (!ok) return;
      await apiFetch(`/records/${this.selectedRecord.id}?section=${this.sectionKey}`, { method: 'DELETE' });
      await showAlert('Запись удалена');
      await this.getRecords();
      this.showEditModal = false;
    },
  },
};
</script>

<style scoped>
.page {
  display: block;
  justify-content: flex-start;
  overflow-y: auto;
  padding: 24px 28px;
  box-sizing: border-box;
  background: #f4f5f7;
}

.page-header {
  display: flex;
  align-items: baseline;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.page-header > .date-nav,
.page-header > .today-btn,
.page-header > .link-btn,
.page-header > .primary-btn {
  align-self: center;
}

.page-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: #1c1c1e;
  margin: 0;
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

.record-count {
  font-size: 0.9rem;
  font-weight: 600;
  color: #6a6f75;
}

.record-count span {
  color: #2196f3;
  font-weight: 700;
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

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.record-card {
  display: flex;
  align-items: stretch;
  gap: 12px;
  background: #ffffff;
  border-radius: 14px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  padding: 14px 16px;
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
  grid-column: 1 / -1;
  text-align: center;
  color: #9aa0a6;
  padding: 40px 0;
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
