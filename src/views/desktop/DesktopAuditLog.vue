<template>
  <ion-page class="page">
    <div class="page-header">
      <h1 class="page-title">Журнал событий</h1>
      <button class="link-btn" type="button" @click="refresh">
        <ion-icon :icon="refreshIcon"></ion-icon>
        Обновить
      </button>
    </div>

    <div class="tab-panel">
      <div class="filters-row">
        <FormSelect label="Раздел" :model-value="filterSection" :options="sectionOptions" @update:modelValue="onFilterSection" />
        <FormSelect label="Действие" :model-value="filterAction" :options="actionOptions" @update:modelValue="onFilterAction" />
        <FormSelect label="Тип" :model-value="filterEntityType" :options="entityOptions" @update:modelValue="onFilterEntityType" />
        <FormInput label="С" type="date" :model-value="dateFrom" @update:modelValue="onDateFrom" />
        <FormInput label="По" type="date" :model-value="dateTo" @update:modelValue="onDateTo" />
      </div>

      <table class="log-table">
        <thead>
          <tr>
            <th>Дата</th>
            <th>Действие</th>
            <th>Тип</th>
            <th>Описание</th>
            <th>Раздел</th>
            <th>Сотрудник</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in logs" :key="log.id">
            <td class="log-date">{{ formatDateTime(log.created_at) }}</td>
            <td><span class="log-action-badge" :class="log.action">{{ actionLabel(log.action) }}</span></td>
            <td>{{ entityLabel(log.entity_type) }}</td>
            <td>{{ log.summary || '—' }}</td>
            <td>{{ log.section_label || '—' }}</td>
            <td>{{ log.username || '—' }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="!logs.length && !loading" class="empty-state">Событий не найдено</div>

      <button v-if="hasMore" class="load-more-btn" type="button" :disabled="loading" @click="loadMore">
        {{ loading ? 'Загрузка…' : 'Показать ещё' }}
      </button>
    </div>
  </ion-page>
</template>

<script>
import moment from 'moment';
import { IonPage, IonIcon } from '@ionic/vue';
import { refreshOutline } from 'ionicons/icons';
import FormInput from '@/components/FormInput.vue';
import FormSelect from '@/components/FormSelect.vue';
import { apiFetch } from '@/services/api';
import { showAlert } from '@/services/dialogs';
import { useSectionsStore } from '@/stores/sections';

const ENTITY_LABELS = {
  trainers: 'Тренеры',
  resources: 'Группы/ресурсы',
  group_schedules: 'Расписание групп',
  sections: 'Разделы',
  records: 'Записи',
  clients: 'Клиенты',
  memberships: 'Абонементы',
  attendance: 'Посещаемость',
  trial_lessons: 'Пробные занятия',
  users: 'Сотрудники',
};

const ACTION_LABELS = {
  create: 'Добавление',
  update: 'Изменение',
  delete: 'Удаление',
  renew: 'Продление',
};

const PAGE_SIZE = 50;

export default {
  name: 'DesktopAuditLog',
  components: { IonPage, IonIcon, FormInput, FormSelect },
  data() {
    return {
      refreshIcon: refreshOutline,
      logs: [],
      loading: false,
      hasMore: true,
      offset: 0,
      filterSection: null,
      filterAction: null,
      filterEntityType: null,
      dateFrom: '',
      dateTo: '',
    };
  },
  computed: {
    sectionOptions() {
      const sections = useSectionsStore();
      return [{ value: null, label: 'Все разделы' }, ...sections.items.map((s) => ({ value: s.key, label: s.label }))];
    },
    actionOptions() {
      return [{ value: null, label: 'Все действия' }, ...Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label }))];
    },
    entityOptions() {
      return [{ value: null, label: 'Все типы' }, ...Object.entries(ENTITY_LABELS).map(([value, label]) => ({ value, label }))];
    },
  },
  async mounted() {
    await this.loadLogs(true);
  },
  methods: {
    entityLabel(type) {
      return ENTITY_LABELS[type] || type;
    },
    actionLabel(action) {
      return ACTION_LABELS[action] || action;
    },
    formatDateTime(date) {
      return moment(date).format('DD.MM.YYYY HH:mm');
    },
    async loadLogs(reset) {
      if (reset) {
        this.offset = 0;
        this.logs = [];
        this.hasMore = true;
      }
      this.loading = true;
      try {
        const params = new URLSearchParams({ limit: PAGE_SIZE, offset: this.offset });
        if (this.filterSection) params.set('section', this.filterSection);
        if (this.filterAction) params.set('action', this.filterAction);
        if (this.filterEntityType) params.set('entity_type', this.filterEntityType);
        if (this.dateFrom) params.set('start_date', this.dateFrom);
        if (this.dateTo) params.set('end_date', this.dateTo);
        const result = await apiFetch(`/audit_logs?${params}`);
        this.logs = reset ? result : [...this.logs, ...result];
        this.hasMore = result.length === PAGE_SIZE;
        this.offset += result.length;
      } catch (e) {
        // Fails silently otherwise — an empty list looks identical to "no
        // events yet", which is exactly what hid the nginx routing bug that
        // broke this page in prod (2026-09-30).
        await showAlert(e.message || 'Не удалось загрузить журнал событий');
      } finally {
        this.loading = false;
      }
    },
    async loadMore() {
      await this.loadLogs(false);
    },
    async refresh() {
      await this.loadLogs(true);
    },
    onFilterSection(value) {
      this.filterSection = value;
      this.loadLogs(true);
    },
    onFilterAction(value) {
      this.filterAction = value;
      this.loadLogs(true);
    },
    onFilterEntityType(value) {
      this.filterEntityType = value;
      this.loadLogs(true);
    },
    onDateFrom(value) {
      this.dateFrom = value;
      this.loadLogs(true);
    },
    onDateTo(value) {
      this.dateTo = value;
      this.loadLogs(true);
    },
  },
};
</script>

<style scoped>
.page {
  display: block;
  overflow-y: auto;
  padding: 28px 32px;
  box-sizing: border-box;
  background: #f4f5f7;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: #1c1c1e;
  flex: 1;
  margin: 0;
}

.link-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: #eef0f0;
  border-radius: 10px;
  padding: 9px 14px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #4a4f55;
  cursor: pointer;
}

.tab-panel {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  padding: 20px;
}

.filters-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0 14px;
  margin-bottom: 8px;
}

.log-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

.log-table th {
  text-align: left;
  color: #9aa0a6;
  font-weight: 700;
  font-size: 0.78rem;
  text-transform: uppercase;
  padding: 10px 10px;
  border-bottom: 1px solid #eceef0;
}

.log-table td {
  padding: 10px 10px;
  border-bottom: 1px solid #f4f5f7;
  color: #1c1c1e;
}

.log-date {
  white-space: nowrap;
  color: #6a6f75;
}

.log-action-badge {
  display: inline-block;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
}

.log-action-badge.create {
  background: rgba(76, 175, 80, 0.16);
  color: #2e7d32;
}

.log-action-badge.update {
  background: rgba(33, 150, 243, 0.16);
  color: #1565c0;
}

.log-action-badge.delete {
  background: rgba(244, 67, 54, 0.12);
  color: #d32f2f;
}

.log-action-badge.renew {
  background: rgba(156, 39, 176, 0.14);
  color: #7b1fa2;
}

.empty-state {
  text-align: center;
  color: #9aa0a6;
  padding: 24px 0;
}

.load-more-btn {
  width: 100%;
  margin-top: 14px;
  border: none;
  background: #eef0f0;
  border-radius: 12px;
  padding: 12px 0;
  font-weight: 700;
  color: #1c1c1e;
  cursor: pointer;
}

.load-more-btn:disabled {
  opacity: 0.6;
}
</style>
