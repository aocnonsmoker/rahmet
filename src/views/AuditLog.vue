<template>
  <ion-page>
    <ion-header :translucent="true" class="log-header">
      <ion-toolbar class="log-toolbar">
        <div class="header-card">
          <div class="header-title">Журнал событий</div>
          <button class="header-btn refresh" type="button" @click="refresh">
            <ion-icon :icon="refreshIcon"></ion-icon>
            Обновить
          </button>
          <HeaderMenuButton />
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div class="page-root">
        <div class="filters-grid">
          <FormSelect label="Раздел" :model-value="filterSection" :options="sectionOptions" @update:modelValue="onFilterSection" />
          <FormSelect label="Действие" :model-value="filterAction" :options="actionOptions" @update:modelValue="onFilterAction" />
          <FormSelect label="Тип" :model-value="filterEntityType" :options="entityOptions" @update:modelValue="onFilterEntityType" />
          <FormInput label="С" type="date" :model-value="dateFrom" @update:modelValue="onDateFrom" />
          <FormInput label="По" type="date" :model-value="dateTo" @update:modelValue="onDateTo" />
        </div>
        <button class="excel-btn" type="button" :disabled="exporting" @click="exportExcel">
          <i class="excel-btn-icon">⬇</i>
          <span>{{ exporting ? 'Выгрузка…' : 'Выгрузить в Excel' }}</span>
        </button>

        <div class="log-list">
          <div v-for="log in logs" :key="log.id" class="log-row">
            <span class="log-action-badge" :class="log.action">{{ actionLabel(log.action) }}</span>
            <div class="log-body">
              <div class="log-main">
                {{ entityLabel(log.entity_type) }}<span v-if="log.summary"> — {{ log.summary }}</span>
              </div>
              <div class="log-meta">
                {{ log.username || '—' }}<span v-if="log.section_label"> · {{ log.section_label }}</span> · {{ formatDateTime(log.created_at) }}
              </div>
            </div>
          </div>
          <div v-if="!logs.length && !loading" class="empty-state">Событий не найдено</div>
        </div>

        <button v-if="hasMore" class="load-more-btn" type="button" :disabled="loading" @click="loadMore">
          {{ loading ? 'Загрузка…' : 'Показать ещё' }}
        </button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script>
import moment from 'moment';
import { IonContent, IonHeader, IonPage, IonToolbar, IonIcon } from '@ionic/vue';
import { refreshOutline } from 'ionicons/icons';
import FormInput from '@/components/FormInput.vue';
import FormSelect from '@/components/FormSelect.vue';
import HeaderMenuButton from '@/components/HeaderMenuButton.vue';
import { apiFetch } from '@/services/api';
import { AUDIT_ACTION_LABELS as ACTION_LABELS, AUDIT_ENTITY_LABELS as ENTITY_LABELS, exportAuditLogXlsx } from '@/services/auditLogExport';
import { showAlert } from '@/services/dialogs';
import { useSectionsStore } from '@/stores/sections';

const PAGE_SIZE = 50;

export default {
  name: 'AuditLog',
  components: { IonContent, IonHeader, IonPage, IonToolbar, IonIcon, FormInput, FormSelect, HeaderMenuButton },
  data() {
    return {
      refreshIcon: refreshOutline,
      logs: [],
      loading: false,
      exporting: false,
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
        const params = new URLSearchParams({ ...this.filterParams(), limit: PAGE_SIZE, offset: this.offset });
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
    filterParams() {
      // Local calendar days for the date filters (server stores UTC).
      const params = { utc_offset_minutes: moment().utcOffset() };
      if (this.filterSection) params.section = this.filterSection;
      if (this.filterAction) params.action = this.filterAction;
      if (this.filterEntityType) params.entity_type = this.filterEntityType;
      if (this.dateFrom) params.start_date = this.dateFrom;
      if (this.dateTo) params.end_date = this.dateTo;
      return params;
    },
    async exportExcel() {
      this.exporting = true;
      try {
        const count = await exportAuditLogXlsx(this.filterParams());
        if (!count) await showAlert('Нет событий для выгрузки по выбранным фильтрам');
      } catch (e) {
        await showAlert(e.message || 'Не удалось выгрузить журнал событий');
      } finally {
        this.exporting = false;
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
.log-toolbar {
  --background: transparent;
  --border-width: 0;
  padding: 8px 16px 0;
}

.header-card {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-title {
  font-size: 1.3rem;
  font-weight: 800;
  color: #1c1c1e;
  flex: 1;
}

.header-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: #eef0f0;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 0.8rem;
  font-weight: 700;
  color: #4a4f55;
}

.page-root {
  padding: 12px 16px 24px;
}

.filters-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 12px;
}

.excel-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  background: #059669;
  color: #ffffff;
  border-radius: 12px;
  padding: 12px 0;
  font-size: 0.9rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.excel-btn:disabled {
  opacity: 0.6;
}

.excel-btn-icon {
  font-style: normal;
  font-weight: 900;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}

.log-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: #ffffff;
  border-radius: 14px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  padding: 12px 14px;
}

.log-action-badge {
  flex-shrink: 0;
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

.log-body {
  flex: 1;
  min-width: 0;
}

.log-main {
  font-weight: 700;
  font-size: 0.9rem;
  color: #1c1c1e;
}

.log-meta {
  margin-top: 2px;
  font-size: 0.78rem;
  color: #9aa0a6;
}

.empty-state {
  text-align: center;
  color: #9aa0a6;
  padding: 24px 0;
}

.load-more-btn {
  width: 100%;
  margin-top: 12px;
  border: none;
  background: #eef0f0;
  border-radius: 12px;
  padding: 12px 0;
  font-weight: 700;
  color: #1c1c1e;
}

.load-more-btn:disabled {
  opacity: 0.6;
}
</style>
