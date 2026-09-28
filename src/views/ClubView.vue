<template>
  <ion-page>
    <ion-header :translucent="true" class="club-header">
      <ion-toolbar class="club-toolbar">
        <div class="header-card">
          <div class="header-title">{{ label }}</div>
          <button class="header-btn refresh" type="button" @click="refresh">
            <ion-icon :icon="refreshIcon"></ion-icon>
            Обновить
          </button>
          <HeaderMenuButton />
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" :scroll-y="tab !== 'schedule'">
      <div class="page-root">
        <div class="section-buttons-row">
          <button
            v-for="opt in groupFilterOptions"
            :key="opt.value ?? 'all'"
            type="button"
            class="section-btn"
            :class="{ active: selectedGroupId === opt.value }"
            @click="selectedGroupId = opt.value"
          >{{ opt.label }}</button>
        </div>

        <div class="tabs-row">
          <button class="tab-btn" :class="{ active: tab === 'schedule' }" type="button" @click="tab = 'schedule'">Расписание</button>
          <button class="tab-btn" :class="{ active: tab === 'clients' }" type="button" @click="tab = 'clients'">Клиенты</button>
          <button class="tab-btn" :class="{ active: tab === 'trainers' }" type="button" @click="tab = 'trainers'">Тренеры</button>
          <button class="tab-btn" :class="{ active: tab === 'attendance' }" type="button" @click="tab = 'attendance'">Журнал</button>
          <button class="tab-btn" :class="{ active: tab === 'trials' }" type="button" @click="tab = 'trials'">Пробные</button>
        </div>

        <!-- ===================== Клиенты / абонементы ===================== -->
        <div v-if="tab === 'clients'" class="panel">
          <ion-button v-if="canWrite" expand="block" class="add-btn" @click="openAddClient">+ Добавить клиента</ion-button>
          <div class="list-wrapper">
            <div class="records-scroll">
              <div v-for="c in visibleClients" :key="c.id" class="record-card" @click="onClientClick(c)">
                <div class="record-bar" :style="{ background: clientStatusColor(c.id) }"></div>
                <div class="record-body">
                  <div class="record-title-row">
                    <div class="record-title">{{ c.full_name }}</div>
                    <span class="status-pill" :class="clientStatus(c.id)">
                      <span class="status-pill-icon">{{ statusIcon(clientStatus(c.id)) }}</span>{{ clientStatusLabel(c.id) }}
                    </span>
                  </div>
                  <div class="record-sub">{{ c.phone }}<span v-if="c.age"> · {{ c.age }} лет</span><span v-if="c.contract_number"> · №{{ c.contract_number }}</span></div>
                  <div class="record-sub">{{ clientActiveSummary(c.id) }}</div>
                </div>
              </div>
              <div v-if="!visibleClients.length" class="empty-state">{{ selectedGroupId ? 'Нет клиентов в этой секции' : 'Нет клиентов' }}</div>
            </div>
          </div>
        </div>

        <!-- ===================== Тренеры ===================== -->
        <div v-if="tab === 'trainers'" class="panel">
          <ion-button v-if="canWrite" expand="block" class="add-btn" @click="openAddTrainer">+ Добавить тренера</ion-button>
          <div class="list-wrapper">
            <div class="records-scroll">
              <div v-for="t in visibleTrainers" :key="t.id" class="record-card" @click="onTrainerClick(t)">
                <div v-if="t.photo_url" class="record-avatar" :style="{ backgroundImage: `url(${t.photo_url})` }"></div>
                <div v-else class="record-bar"></div>
                <div class="record-body">
                  <div class="record-title">{{ t.full_name }}</div>
                  <div class="record-sub">{{ t.phone || '—' }}</div>
                  <div class="record-sub">{{ groupLabels(t.resource_ids) }}</div>
                </div>
              </div>
              <div v-if="!visibleTrainers.length" class="empty-state">{{ selectedGroupId ? 'Нет тренеров в этой секции' : 'Нет тренеров' }}</div>
            </div>
          </div>
        </div>

        <!-- ===================== Расписание ===================== -->
        <div v-if="tab === 'schedule'" class="panel">
          <ScheduleCalendar
            :schedules="schedules"
            :groups="groups"
            :rooms="rooms"
            :selected-group-id="selectedGroupId"
            active-view="day"
            :time-cell-height="50"
            fill-height
            @event-click="onScheduleEventClick"
          />
        </div>

        <!-- ===================== Журнал ===================== -->
        <div v-if="tab === 'attendance'" class="panel">
          <div class="section-buttons-row">
            <button
              v-for="opt in groupOptions"
              :key="opt.value"
              type="button"
              class="section-btn"
              :class="{ active: attendanceGroupId === opt.value }"
              @click="onGroupChange(opt.value)"
            >{{ opt.label }}</button>
          </div>
          <div v-if="attendanceGroupId" class="attendance-controls">
            <div class="month-nav">
              <button class="nav-arrow" type="button" @click="prevMonth">‹</button>
              <div class="month-label">{{ monthLabel }}</div>
              <button class="nav-arrow" type="button" @click="nextMonth">›</button>
            </div>
            <button v-if="attendanceRows.length" class="excel-btn" type="button" @click="exportAttendanceExcel">
              <i class="excel-btn-icon">⬇</i>
              <span>Excel</span>
            </button>
          </div>
          <template v-if="attendanceGroupId">
            <div v-if="attendanceRows.length" class="attendance-table-wrap">
              <table class="attendance-table">
                <thead>
                  <tr>
                    <th class="att-name-col"></th>
                    <th v-for="d in attendanceDays" :key="d.date" class="att-day-col">
                      <div class="attendance-day-label">
                        <span class="attendance-day-name">{{ d.name }}</span>
                        <span class="attendance-day-num">{{ d.num }}</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in attendanceRows" :key="row.client_id">
                    <td class="att-name-col att-name-clickable" @click="onJournalClientClick(row)">
                      <div class="att-name">{{ row.full_name }}</div>
                      <div v-if="row.phone" class="att-phone">{{ row.phone }}</div>
                      <div v-if="journalMembershipStatus(row)" class="att-membership-line">
                        <span class="status-pill mini" :class="journalMembershipStatus(row).status">
                          <span class="status-pill-icon">{{ statusIcon(journalMembershipStatus(row).status) }}</span>{{ journalPillText(journalMembershipStatus(row)) }}
                        </span>
                      </div>
                      <div v-else class="att-membership-line att-membership-none">нет абонемента</div>
                    </td>
                    <td v-for="d in attendanceDays" :key="d.date" class="att-day-col">
                      <div
                        class="att-cell"
                        :class="attendanceCellClass(row, d.date)"
                        @click="toggleAttendance(row, d.date)"
                      >{{ attendanceCellMark(row, d.date) }}</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="empty-state">В этой группе нет клиентов</div>
            <div v-if="attendanceRows.length" class="attendance-legend">
              <span class="legend-item present">✓ Был</span>
              <span class="legend-item absent">✕ Пропуск</span>
              <span class="legend-item trainer_cancelled">⊘ Отменил тренер</span>
              <span class="legend-item makeup">↻ Отработка</span>
              <span class="legend-item frozen">❄ Заморожен</span>
            </div>
            <div v-if="attendanceRows.length && canWrite" class="attendance-mode-row">
              <span class="attendance-mode-label">Режим отметки:</span>
              <button class="mode-btn" type="button" :class="{ active: attendanceMarkMode === 'normal' }" @click="attendanceMarkMode = 'normal'">Обычная</button>
              <button class="mode-btn" type="button" :class="{ active: attendanceMarkMode === 'trainer_cancelled' }" @click="attendanceMarkMode = 'trainer_cancelled'">Отмена тренером</button>
              <button class="mode-btn" type="button" :class="{ active: attendanceMarkMode === 'makeup' }" @click="attendanceMarkMode = 'makeup'">Отработка</button>
            </div>
          </template>
          <div v-else class="empty-state">Выберите группу, чтобы увидеть табель</div>
        </div>

        <!-- ===================== Пробные занятия ===================== -->
        <div v-if="tab === 'trials'" class="panel">
          <ion-button v-if="canWrite" expand="block" class="add-btn" @click="openAddTrial">+ Записать на пробное</ion-button>
          <div class="trial-filters-row">
            <button class="date-pill" type="button" :class="{ dimmed: showAllTrialDates, active: !showAllTrialDates }" @click="onDatePillClick">{{ formattedTrialDate }}</button>
            <button class="pill-toggle-btn" type="button" :class="{ active: showAllTrialDates }" @click="showAllTrialDates = !showAllTrialDates">За все даты</button>
          </div>
          <FormSelect class="trial-status-filter" placeholder="Все статусы" :model-value="selectedTrialStatus" :options="trialStatusFilterOptions" @update:modelValue="selectedTrialStatus = $event" />
          <ion-modal :keep-contents-mounted="true" :is-open="showTrialDateModal" @didDismiss="showTrialDateModal = false">
            <MonthCalendar
              :model-value="trialDate"
              :events="trialLessonsForBadges"
              @update:modelValue="onPickTrialDate"
            />
          </ion-modal>
          <div class="list-wrapper">
            <div class="records-scroll">
              <div v-for="t in trialLessonsForDay" :key="t.id" class="record-card" @click="onTrialClick(t)">
                <div class="record-bar" :style="{ background: groupColor(t.resource_id) }"></div>
                <div class="record-body">
                  <div class="record-title">{{ t.full_name }}</div>
                  <div class="record-sub">{{ t.phone }}<span v-if="t.age"> · {{ t.age }} лет</span></div>
                  <div class="record-sub">{{ t.resource_id ? groupLabel(t.resource_id) : 'Группа не выбрана' }}</div>
                  <div class="record-sub">{{ formatDateTime(t.scheduled_at) }}</div>
                  <span class="status-badge" :class="t.status">{{ trialStatusLabel(t.status) }}</span>
                </div>
              </div>
              <div v-if="!trialLessonsForDay.length" class="empty-state">{{ showAllTrialDates ? 'Нет записей на пробные занятия' : 'Нет записей на пробные занятия в этот день' }}</div>
            </div>
          </div>
        </div>
      </div>
    </ion-content>

    <!-- Модальное окно карточки клиента -->
    <ion-modal class="club-modal" :is-open="showClientModal">
      <ion-header class="club-modal-header ion-no-border">
        <ion-toolbar class="club-modal-toolbar">
          <ion-buttons slot="start">
            <ion-button fill="clear" color="medium" @click="showClientModal = false">Отменить</ion-button>
          </ion-buttons>
          <ion-buttons slot="end">
            <ion-button fill="clear" color="primary" :strong="true" @click="confirmClient">Сохранить</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding" v-if="clientForm">
        <FormInput label="ФИО" type="text" :model-value="clientForm.full_name" @update:modelValue="clientForm.full_name = $event" />
        <FormInput label="Телефон" type="tel" :model-value="clientForm.phone" @update:modelValue="clientForm.phone = $event" />
        <FormInput label="Возраст" type="number" :model-value="clientForm.age" @update:modelValue="clientForm.age = $event" />
        <FormInput label="ФИО родителя/опекуна" type="text" :model-value="clientForm.parent_name" @update:modelValue="clientForm.parent_name = $event" />

        <template v-if="editingClientId">
          <FormInput label="Номер договора" type="text" :model-value="clientForm.contract_number" @update:modelValue="clientForm.contract_number = $event" />
          <FormInput label="Дата договора" type="date" :model-value="clientForm.contract_date" @update:modelValue="clientForm.contract_date = $event" />
          <div class="section-title">Абонементы</div>
          <div v-for="m in clientMemberships(editingClientId)" :key="m.id" class="record-card" @click="onMembershipClick(m)">
            <div class="record-bar" :style="{ background: groupColor(m.resource_ids[0]) }"></div>
            <div class="record-body">
              <div class="record-title">{{ groupLabels(m.resource_ids) }}</div>
              <div class="record-sub">Абонемент: {{ formatDate(m.start_date) }} – {{ formatDate(m.end_date) }}</div>
              <span class="status-badge" :class="effectiveStatus(m)">{{ membershipStatusLabel(effectiveStatus(m)) }}</span>
            </div>
          </div>
          <div v-if="!clientMemberships(editingClientId).length" class="empty-state">Нет абонементов</div>
          <ion-button expand="block" class="renew-btn" color="success" fill="outline" @click="openAddMembershipForClient">+ Добавить абонемент</ion-button>
          <ion-button expand="block" class="delete-btn" color="danger" @click="deleteClient">Удалить клиента</ion-button>
        </template>
      </ion-content>
    </ion-modal>

    <!-- Модальное окно добавления/редактирования абонемента -->
    <ion-modal class="club-modal" :is-open="showMembershipModal">
      <ion-header class="club-modal-header ion-no-border">
        <ion-toolbar class="club-modal-toolbar">
          <ion-buttons slot="start">
            <ion-button fill="clear" color="medium" @click="showMembershipModal = false">Отменить</ion-button>
          </ion-buttons>
          <ion-buttons slot="end">
            <ion-button fill="clear" color="primary" :strong="true" @click="confirmMembership">Сохранить</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding" v-if="membershipForm">
        <FormSelect label="Группа" placeholder="Выберите группу" :model-value="membershipForm.resource_ids[0] || null" :options="groupOptions" @update:modelValue="membershipForm.resource_ids = $event ? [$event] : []" />
        <FormInput label="Дата оплаты" type="date" :model-value="membershipForm.payment_date" @update:modelValue="membershipForm.payment_date = $event" />
        <FormInput label="Абонемент с" type="date" :model-value="membershipForm.start_date" @update:modelValue="onMembershipStartDateChange" />
        <FormInput label="Абонемент по" type="date" :model-value="membershipForm.end_date" :disabled="!isOwner" @update:modelValue="membershipForm.end_date = $event" />
        <FormInput label="Сумма" type="number" suffix="тг." :model-value="membershipForm.price" @update:modelValue="membershipForm.price = $event" />
        <FormSelect label="Статус" :model-value="membershipForm.status" :options="membershipStatusOptions" @update:modelValue="membershipForm.status = $event" />
        <label class="paid-checkbox-row">
          <input type="checkbox" :checked="membershipForm.paid" @change="membershipForm.paid = $event.target.checked" />
          <span>Абонемент оплачен</span>
        </label>
        <div v-if="!membershipForm.paid" class="debt-hint">Будет отображаться как «Долг» на карточке клиента, пока не отметите оплату.</div>
        <ion-button v-if="editingMembershipId" expand="block" class="delete-btn" color="danger" @click="deleteMembership">Удалить абонемент</ion-button>
      </ion-content>
    </ion-modal>

    <!-- Модальное окно добавления/редактирования пробного -->
    <ion-modal class="club-modal" :is-open="showTrialModal">
      <ion-header class="club-modal-header ion-no-border">
        <ion-toolbar class="club-modal-toolbar">
          <ion-buttons slot="start">
            <ion-button fill="clear" color="medium" @click="showTrialModal = false">Отменить</ion-button>
          </ion-buttons>
          <ion-buttons slot="end">
            <ion-button fill="clear" color="primary" :strong="true" @click="confirmTrial">Сохранить</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding" v-if="trialForm">
        <FormInput label="ФИО" type="text" :model-value="trialForm.full_name" @update:modelValue="trialForm.full_name = $event" />
        <FormInput label="Телефон" type="tel" :model-value="trialForm.phone" @update:modelValue="trialForm.phone = $event" />
        <FormInput label="Возраст" type="number" :model-value="trialForm.age" @update:modelValue="trialForm.age = $event" />
        <FormSelect label="Группа" placeholder="Пока не выбрана" :model-value="trialForm.resource_id" :options="groupOptions" @update:modelValue="trialForm.resource_id = $event" />
        <FormInput label="Дата и время" type="datetime-local" :model-value="trialForm.scheduled_at" @update:modelValue="trialForm.scheduled_at = $event" />
        <FormSelect v-if="editingTrialId" label="Статус" :model-value="trialForm.status" :options="trialStatusOptions" @update:modelValue="trialForm.status = $event" />
        <ion-button v-if="editingTrialId" expand="block" class="delete-btn" color="danger" @click="deleteTrial">Удалить запись</ion-button>
      </ion-content>
    </ion-modal>

    <!-- Модальное окно добавления/редактирования тренера -->
    <ion-modal class="club-modal" :is-open="showTrainerModal">
      <ion-header class="club-modal-header ion-no-border">
        <ion-toolbar class="club-modal-toolbar">
          <ion-buttons slot="start">
            <ion-button fill="clear" color="medium" @click="showTrainerModal = false">Отменить</ion-button>
          </ion-buttons>
          <ion-buttons slot="end">
            <ion-button fill="clear" color="primary" :strong="true" @click="confirmTrainer">Сохранить</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding" v-if="trainerForm">
        <div class="trainer-photo-field">
          <img
            v-if="trainerForm.photo_url"
            :src="trainerForm.photo_url"
            class="trainer-photo-preview trainer-photo-preview-editable"
            title="Нажмите, чтобы изменить масштаб и положение"
            @click="openPhotoEditor(trainerForm.photo_url)"
          />
          <div v-else class="trainer-photo-placeholder">Фото</div>
          <label class="trainer-photo-btn">
            {{ trainerForm.photo_url ? 'Заменить фото' : 'Добавить фото' }}
            <input type="file" accept="image/*" class="trainer-photo-input" @change="onTrainerPhotoChange" />
          </label>
        </div>
        <PhotoCropper v-if="photoEditorSrc" :image-src="photoEditorSrc" @confirm="onPhotoCropConfirm" @cancel="photoEditorSrc = null" />
        <FormInput label="ФИО" type="text" :model-value="trainerForm.full_name" @update:modelValue="trainerForm.full_name = $event" />
        <FormInput label="Телефон" type="tel" :model-value="trainerForm.phone" @update:modelValue="trainerForm.phone = $event" />
        <FormSelect label="Группы" placeholder="Выберите группы" multiple :model-value="trainerForm.resource_ids" :options="plainGroupOptions" @update:modelValue="trainerForm.resource_ids = $event" />
        <ion-button v-if="editingTrainerId" expand="block" class="delete-btn" color="danger" @click="deleteTrainer">Удалить тренера</ion-button>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script>
import moment from 'moment';
import { IonContent, IonHeader, IonPage, IonToolbar, IonButton, IonModal, IonButtons, IonIcon } from '@ionic/vue';
import { refreshOutline } from 'ionicons/icons';
import FormInput from '@/components/FormInput.vue';
import FormSelect from '@/components/FormSelect.vue';
import PhotoCropper from '@/components/PhotoCropper.vue';
import HeaderMenuButton from '@/components/HeaderMenuButton.vue';
import MonthCalendar from '@/components/MonthCalendar.vue';
import ScheduleCalendar from '@/components/ScheduleCalendar.vue';
import { apiFetch } from '@/services/api';
import { showAlert, showConfirm, showToast } from '@/services/dialogs';
import { useAuthStore } from '@/stores/auth';
import { ruDayShort } from '@/utils/ruDate';

const MEMBERSHIP_STATUS_LABELS = { active: 'Активен', expired: 'Закончился', frozen: 'Заморожен' };
const ATTENDANCE_MARK_ICONS = { present: '✓', absent: '✕', trainer_cancelled: '⊘', makeup: '↻' };
// Same status colors as the on-screen journal, translated to ARGB for the xlsx export.
const ATTENDANCE_XLSX_COLORS = {
  present: { fill: 'FFDCFCE7', font: 'FF166534' },
  absent: { fill: 'FFFFE4E6', font: 'FFBE123C' },
  trainer_cancelled: { fill: 'FFFEF3C7', font: 'FF92400E' },
  makeup: { fill: 'FFDBEAFE', font: 'FF1D4ED8' },
  frozen: { fill: 'FFE0F2FE', font: 'FF0369A1' },
};
const XLSX_THIN_BORDER = { style: 'thin', color: { argb: 'FFCBD5E1' } };
const XLSX_CELL_BORDER = {
  top: XLSX_THIN_BORDER,
  left: XLSX_THIN_BORDER,
  bottom: XLSX_THIN_BORDER,
  right: XLSX_THIN_BORDER,
};
// Приоритет при нескольких одновременно верных условиях: долг важнее заморозки,
// заморозка важнее скорого окончания.
const CLIENT_STATUS_META = {
  debt: { color: '#e11d48', icon: '⚠', label: 'Долг' },
  frozen: { color: '#0ea5e9', icon: '❄', label: 'Заморожен' },
  expiring: { color: '#f59e0b', icon: '⏳', label: 'Скоро закончится' },
  active: { color: '#059669', icon: '✓', label: 'Активен' },
  inactive: { color: '#94a3b8', icon: '○', label: 'Неактивен' },
};
const TRIAL_STATUS_LABELS = {
  scheduled: 'Записан',
  came: 'Пришёл',
  no_show: 'Не пришёл',
  bought: 'Купил абонемент',
  thinking: 'Думает',
  declined: 'Отказался',
};

export default {
  name: 'ClubView',
  components: { IonContent, IonHeader, IonPage, IonToolbar, IonButton, IonModal, IonButtons, IonIcon, FormInput, FormSelect, PhotoCropper, HeaderMenuButton, MonthCalendar, ScheduleCalendar },
  props: {
    sectionKey: { type: String, required: true },
    label: { type: String, required: true },
  },
  data() {
    return {
      refreshIcon: refreshOutline,
      tab: 'schedule',
      selectedGroupId: null,
      groups: [],
      rooms: [],
      trainers: [],
      clients: [],
      memberships: [],
      trialLessons: [],
      schedules: [],

      showClientModal: false,
      editingClientId: null,
      clientForm: null,

      showMembershipModal: false,
      editingMembershipId: null,
      membershipClientId: null,
      membershipForm: null,

      showTrialModal: false,
      editingTrialId: null,
      trialForm: null,

      showTrialDateModal: false,
      trialDate: moment().format('YYYY-MM-DD'),
      showAllTrialDates: false,
      selectedTrialStatus: null,

      showTrainerModal: false,
      editingTrainerId: null,
      trainerForm: null,
      photoEditorSrc: null,

      attendanceGroupId: null,
      attendanceMonth: moment().format('YYYY-MM'),
      attendanceMemberships: [],
      attendanceMarks: [],
      attendanceMarkMode: 'normal',
    };
  },
  computed: {
    canWrite() {
      return useAuthStore().canWrite;
    },
    isOwner() {
      return useAuthStore().isOwner;
    },
    groupOptions() {
      return this.groups.map((g) => ({ value: g.id, label: g.label, color: g.color }));
    },
    plainGroupOptions() {
      return this.groups.map((g) => ({ value: g.id, label: g.label }));
    },
    groupFilterOptions() {
      return [{ value: null, label: 'Все секции' }, ...this.groups.map((g) => ({ value: g.id, label: g.label, color: g.color }))];
    },
    visibleClients() {
      if (!this.selectedGroupId) return this.clients;
      return this.clients.filter((c) => this.clientMemberships(c.id).some((m) => m.resource_ids.includes(this.selectedGroupId)));
    },
    visibleTrainers() {
      if (!this.selectedGroupId) return this.trainers;
      return this.trainers.filter((t) => t.resource_ids.includes(this.selectedGroupId));
    },
    membershipStatusOptions() {
      return Object.entries(MEMBERSHIP_STATUS_LABELS).map(([value, label]) => ({ value, label }));
    },
    trialStatusOptions() {
      return Object.entries(TRIAL_STATUS_LABELS).map(([value, label]) => ({ value, label }));
    },
    trialStatusFilterOptions() {
      return [{ value: null, label: 'Все статусы' }, ...this.trialStatusOptions];
    },
    formattedTrialDate() {
      const date = new Date(`${this.trialDate}T00:00:00`);
      const str = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: '2-digit', month: 'long' }).format(date);
      return str.charAt(0).toUpperCase() + str.slice(1);
    },
    trialLessonsForBadges() {
      return this.trialLessons.map((t) => ({ start: t.scheduled_at }));
    },
    trialLessonsForDay() {
      return this.trialLessons
        .filter((t) => this.showAllTrialDates || t.scheduled_at.slice(0, 10) === this.trialDate)
        .filter((t) => !this.selectedGroupId || t.resource_id === this.selectedGroupId)
        .filter((t) => !this.selectedTrialStatus || t.status === this.selectedTrialStatus)
        .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
    },
    monthLabel() {
      const date = moment(this.attendanceMonth, 'YYYY-MM').toDate();
      const str = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(date);
      return str.charAt(0).toUpperCase() + str.slice(1);
    },
    attendanceDays() {
      const start = moment(this.attendanceMonth, 'YYYY-MM').startOf('month');
      const end = moment(this.attendanceMonth, 'YYYY-MM').endOf('month');
      const groupDays = this.schedules
        .filter((s) => s.resource_id === this.attendanceGroupId)
        .flatMap((s) => s.day_times.map((dt) => dt.day));
      // day is 0=Пн..6=Вс, moment's isoWeekday() is 1=Пн..7=Вс.
      const allowedIsoWeekdays = groupDays.length ? new Set(groupDays.map((d) => d + 1)) : null;
      const days = [];
      const cursor = start.clone();
      while (cursor.isSameOrBefore(end, 'day')) {
        if (!allowedIsoWeekdays || allowedIsoWeekdays.has(cursor.isoWeekday())) {
          days.push({ date: cursor.format('YYYY-MM-DD'), num: cursor.date(), name: ruDayShort(cursor) });
        }
        cursor.add(1, 'day');
      }
      return days;
    },
    // Клиент может держать сразу несколько абонементов подряд (например,
    // продлил заранее) — в табеле у него всё равно одна строка, а нужный
    // абонемент для конкретной даты выбирается через membershipForDate.
    attendanceRows() {
      const byClient = new Map();
      for (const m of this.attendanceMemberships) {
        if (!byClient.has(m.client_id)) {
          byClient.set(m.client_id, { client_id: m.client_id, full_name: m.full_name, phone: m.phone, memberships: [] });
        }
        byClient.get(m.client_id).memberships.push(m);
      }
      return [...byClient.values()];
    },
  },
  async mounted() {
    await Promise.all([
      this.loadGroups(),
      this.loadTrainers(),
      this.loadClients(),
      this.loadMemberships(),
      this.loadTrialLessons(),
      this.loadSchedules(),
    ]);
    this.warnExpiringMemberships();
    this.warnDebtMemberships();
  },
  watch: {
    selectedGroupId(val) {
      // Клик по группе на Расписании сразу готовит вкладку Журнал — без
      // повторного выбора той же группы в её собственном FormSelect.
      if (val) {
        this.attendanceGroupId = val;
        this.loadAttendance();
      }
    },
  },
  methods: {
    async refresh() {
      await Promise.all([
        this.loadGroups(),
        this.loadTrainers(),
        this.loadClients(),
        this.loadMemberships(),
        this.loadTrialLessons(),
        this.loadSchedules(),
      ]);
      if (this.attendanceGroupId) await this.loadAttendance();
    },
    async loadGroups() {
      const all = await apiFetch(`/resources?section=${this.sectionKey}`);
      this.groups = all.filter((r) => r.kind !== 'room');
      this.rooms = all.filter((r) => r.kind === 'room');
    },
    async loadClients() {
      this.clients = await apiFetch(`/clients?section=${this.sectionKey}`);
    },
    async loadTrainers() {
      this.trainers = await apiFetch(`/trainers?section=${this.sectionKey}`);
    },
    async loadMemberships() {
      this.memberships = await apiFetch(`/memberships?section=${this.sectionKey}`);
    },
    async loadSchedules() {
      this.schedules = await apiFetch(`/group_schedules?section=${this.sectionKey}`);
    },
    async loadTrialLessons() {
      this.trialLessons = await apiFetch(`/trial_lessons?section=${this.sectionKey}`);
    },
    groupLabel(resourceId) {
      const g = this.groups.find((item) => item.id === resourceId);
      return g ? g.label : '—';
    },
    groupLabels(resourceIds) {
      if (!resourceIds || !resourceIds.length) return '—';
      return resourceIds.map((id) => this.groupLabel(id)).join(', ');
    },
    groupColor(resourceId) {
      const g = this.groups.find((item) => item.id === resourceId);
      return g ? g.color : '#94a3b8';
    },
    membershipStatusLabel(status) {
      return MEMBERSHIP_STATUS_LABELS[status] || status;
    },
    // A membership marked "active" whose end_date has already passed (never
    // renewed) should read as expired even though nothing ever flips the
    // stored status — frozen/expired stay as stored, only "active" is checked.
    effectiveStatus(m) {
      if (m.status === 'active' && moment(m.end_date).isBefore(moment(), 'day')) return 'expired';
      return m.status;
    },
    daysWord(n) {
      const mod100 = n % 100;
      const mod10 = n % 10;
      if (mod100 >= 11 && mod100 <= 14) return 'дней';
      if (mod10 === 1) return 'день';
      if (mod10 >= 2 && mod10 <= 4) return 'дня';
      return 'дней';
    },
    daysLeftLabel(daysLeft) {
      return daysLeft === 0 ? 'сегодня' : `через ${daysLeft} ${this.daysWord(daysLeft)}`;
    },
    // One combined toast on load, rather than one per client, so it doesn't
    // spam the screen when several memberships expire around the same time.
    warnExpiringMemberships() {
      const soon = this.memberships
        .map((m) => ({ m, daysLeft: moment(m.end_date).startOf('day').diff(moment().startOf('day'), 'days') }))
        .filter(({ m, daysLeft }) => this.effectiveStatus(m) === 'active' && daysLeft >= 0 && daysLeft <= 3);
      if (!soon.length) return;
      const entries = soon.map(({ m, daysLeft }) => {
        const client = this.clients.find((c) => c.id === m.client_id);
        const name = client ? client.full_name : '—';
        return `${name} (${this.groupLabels(m.resource_ids)}) закончится ${this.daysLeftLabel(daysLeft)}`;
      });
      const message = soon.length === 1
        ? `Абонемент клиента ${entries[0]}`
        : `У ${soon.length} клиентов: ${entries.join(', ')}`;
      showToast(message);
    },
    // Same idea as warnExpiringMemberships, but for unpaid ("Долг") memberships —
    // active or frozen, doesn't matter, only whether it's actually been paid for.
    warnDebtMemberships() {
      const debts = this.memberships.filter((m) => m.paid === false && this.effectiveStatus(m) !== 'expired');
      if (!debts.length) return;
      const entries = debts.map((m) => {
        const client = this.clients.find((c) => c.id === m.client_id);
        const name = client ? client.full_name : '—';
        return `${name} (${this.groupLabels(m.resource_ids)})`;
      });
      const message = debts.length === 1
        ? `Долг по абонементу клиента ${entries[0]}`
        : `Долг по абонементам у ${debts.length} клиентов: ${entries.join(', ')}`;
      showToast(message, { color: 'danger' });
    },
    trialStatusLabel(status) {
      return TRIAL_STATUS_LABELS[status] || status;
    },
    formatDate(date) {
      if (!date) return '—';
      return moment(date).format('DD.MM.YYYY');
    },
    formatDateTime(date) {
      if (!date) return '—';
      return moment(date).format('DD.MM.YYYY HH:mm');
    },

    // ---------------- Клиенты ----------------
    clientMemberships(clientId) {
      return this.memberships.filter((m) => m.client_id === clientId);
    },
    clientActiveSummary(clientId) {
      let active = this.clientMemberships(clientId).filter((m) => this.effectiveStatus(m) === 'active');
      if (this.selectedGroupId) active = active.filter((m) => m.resource_ids.includes(this.selectedGroupId));
      if (!active.length) return 'Нет активного абонемента';
      return active.map((m) => this.groupLabels(m.resource_ids)).join(', ');
    },
    // Карточка клиента красится по самому "тревожному" из его абонементов:
    // долг > заморозка > истекает через <=3 дня > активен > нет действующего.
    clientStatus(clientId) {
      let current = this.clientMemberships(clientId).filter((m) => this.effectiveStatus(m) !== 'expired');
      if (this.selectedGroupId) current = current.filter((m) => m.resource_ids.includes(this.selectedGroupId));
      if (!current.length) return 'inactive';
      if (current.some((m) => m.paid === false)) return 'debt';
      if (current.some((m) => this.effectiveStatus(m) === 'frozen')) return 'frozen';
      const daysLeft = current
        .filter((m) => this.effectiveStatus(m) === 'active')
        .map((m) => moment(m.end_date).startOf('day').diff(moment().startOf('day'), 'days'));
      if (daysLeft.length && Math.min(...daysLeft) <= 3) return 'expiring';
      return 'active';
    },
    statusColor(status) {
      return CLIENT_STATUS_META[status].color;
    },
    statusLabel(status) {
      return CLIENT_STATUS_META[status].label;
    },
    statusIcon(status) {
      return CLIENT_STATUS_META[status].icon;
    },
    // В журнале пилюля совмещает иконку с датой ("до 15.10.2026") для
    // активных/скоро истекающих — для долга/заморозки просто показывает статус.
    journalPillText(info) {
      if (info.status === 'active' || info.status === 'expiring') {
        return `до ${this.formatDate(info.membership.end_date)}`;
      }
      return this.statusLabel(info.status);
    },
    clientStatusColor(clientId) {
      return this.statusColor(this.clientStatus(clientId));
    },
    clientStatusLabel(clientId) {
      return this.statusLabel(this.clientStatus(clientId));
    },
    // Тот же приоритет, что и у clientStatus, но по абонементам самой строки
    // журнала (уже отфильтрованным на текущую группу), а не по всем абонементам
    // клиента — чтобы дата "до" относилась именно к этой секции.
    journalMembershipStatus(row) {
      const current = row.memberships.filter((m) => this.effectiveStatus(m) !== 'expired');
      if (!current.length) return null;
      const debt = current.find((m) => m.paid === false);
      const frozen = current.find((m) => this.effectiveStatus(m) === 'frozen');
      const active = current
        .filter((m) => this.effectiveStatus(m) === 'active')
        .sort((a, b) => moment(a.end_date).diff(moment(b.end_date)));
      const membership = debt || frozen || active[0];
      if (!membership) return null;
      let status;
      if (membership.paid === false) status = 'debt';
      else if (this.effectiveStatus(membership) === 'frozen') status = 'frozen';
      else {
        const daysLeft = moment(membership.end_date).startOf('day').diff(moment().startOf('day'), 'days');
        status = daysLeft <= 3 ? 'expiring' : 'active';
      }
      return { membership, status };
    },
    openAddClient() {
      this.editingClientId = null;
      this.clientForm = {
        full_name: '',
        phone: '+7',
        age: null,
        parent_name: '',
        contract_number: String(this.nextContractNumber()),
        contract_date: moment().format('YYYY-MM-DD'),
      };
      this.showClientModal = true;
    },
    nextContractNumber() {
      const maxNumber = this.clients.reduce((max, c) => {
        const n = parseInt(c.contract_number, 10);
        return Number.isFinite(n) && n > max ? n : max;
      }, 0);
      return maxNumber + 1;
    },
    onJournalClientClick(row) {
      const client = this.clients.find((c) => c.id === row.client_id);
      if (client) this.onClientClick(client);
    },
    onClientClick(c) {
      if (!this.canWrite) return;
      this.editingClientId = c.id;
      this.clientForm = {
        full_name: c.full_name,
        phone: c.phone,
        age: c.age,
        parent_name: c.parent_name,
        contract_number: c.contract_number || '',
        contract_date: c.contract_date ? moment(c.contract_date).format('YYYY-MM-DD') : '',
      };
      this.showClientModal = true;
    },
    async confirmClient() {
      if (!this.clientForm.full_name.trim() || !this.clientForm.phone.trim()) {
        await showAlert('Заполните ФИО и телефон');
        return;
      }
      const body = { ...this.clientForm };
      try {
        if (this.editingClientId) {
          await apiFetch(`/clients/${this.editingClientId}?section=${this.sectionKey}`, { method: 'PUT', body });
          this.showClientModal = false;
          await this.loadClients();
        } else {
          const created = await apiFetch(`/clients?section=${this.sectionKey}`, { method: 'POST', body });
          await this.loadClients();
          // Карточка создана — сразу открываем её же в режиме редактирования,
          // чтобы можно было без лишнего клика завести абонемент.
          this.onClientClick(created);
        }
      } catch (e) {
        await showAlert(e.message);
      }
    },
    async deleteClient() {
      const ok = await showConfirm('Удалить клиента и все его абонементы?', { header: 'Удаление', confirmText: 'Удалить' });
      if (!ok) return;
      await apiFetch(`/clients/${this.editingClientId}?section=${this.sectionKey}`, { method: 'DELETE' });
      this.showClientModal = false;
      await Promise.all([this.loadClients(), this.loadMemberships()]);
      if (this.attendanceGroupId) await this.loadAttendance();
    },

    // ---------------- Абонементы ----------------
    openAddMembershipForClient() {
      this.editingMembershipId = null;
      this.membershipClientId = this.editingClientId;
      const startDate = moment().format('YYYY-MM-DD');
      this.membershipForm = {
        resource_ids: this.selectedGroupId ? [this.selectedGroupId] : [],
        payment_date: startDate,
        start_date: startDate,
        end_date: this.autoEndDate(startDate),
        price: null,
        status: 'active',
        paid: true,
      };
      this.showMembershipModal = true;
    },
    // Абонемент "по умолчанию" длится месяц минус день (16 сент. -> 15 окт.).
    // Ресепшену дату "по" редактировать нельзя (см. isOwner в шаблоне) — только
    // так пересчитывается автоматически; владелец может подправить вручную.
    autoEndDate(startDateStr) {
      return moment(startDateStr, 'YYYY-MM-DD').add(1, 'month').subtract(1, 'day').format('YYYY-MM-DD');
    },
    onMembershipStartDateChange(value) {
      this.membershipForm.start_date = value;
      this.membershipForm.end_date = this.autoEndDate(value);
    },
    onMembershipClick(m) {
      if (!this.canWrite) return;
      this.editingMembershipId = m.id;
      this.membershipClientId = m.client_id;
      this.membershipForm = {
        resource_ids: [...m.resource_ids],
        payment_date: m.payment_date ? moment(m.payment_date).format('YYYY-MM-DD') : '',
        start_date: moment(m.start_date).format('YYYY-MM-DD'),
        end_date: moment(m.end_date).format('YYYY-MM-DD'),
        price: m.price,
        status: m.status,
        paid: m.paid,
      };
      this.showMembershipModal = true;
    },
    async confirmMembership() {
      if (!this.membershipForm.resource_ids.length) {
        await showAlert('Выберите хотя бы одну группу');
        return;
      }
      const body = { ...this.membershipForm };
      if (this.editingMembershipId) {
        await apiFetch(`/memberships/${this.editingMembershipId}?section=${this.sectionKey}`, { method: 'PUT', body });
      } else {
        body.client_id = this.membershipClientId;
        await apiFetch(`/memberships?section=${this.sectionKey}`, { method: 'POST', body });
      }
      this.showMembershipModal = false;
      await this.loadMemberships();
      if (this.attendanceGroupId) await this.loadAttendance();
    },
    async deleteMembership() {
      const ok = await showConfirm('Удалить этот абонемент?', { header: 'Удаление', confirmText: 'Удалить' });
      if (!ok) return;
      await apiFetch(`/memberships/${this.editingMembershipId}?section=${this.sectionKey}`, { method: 'DELETE' });
      this.showMembershipModal = false;
      await this.loadMemberships();
      if (this.attendanceGroupId) await this.loadAttendance();
    },

    // ---------------- Расписание ----------------
    onScheduleEventClick(s) {
      // Не трогаем selectedGroupId — это фильтр секций в шапке, общий для
      // всех вкладок. Если менять его тут, при возврате на Расписание он
      // остаётся на этой группе вместо "Все секции".
      this.tab = 'attendance';
      this.attendanceGroupId = s.resource_id;
      this.loadAttendance();
    },

    // ---------------- Журнал ----------------
    async onGroupChange(groupId) {
      this.attendanceGroupId = groupId;
      await this.loadAttendance();
    },
    async prevMonth() {
      this.attendanceMonth = moment(this.attendanceMonth, 'YYYY-MM').subtract(1, 'month').format('YYYY-MM');
      await this.loadAttendance();
    },
    async nextMonth() {
      this.attendanceMonth = moment(this.attendanceMonth, 'YYYY-MM').add(1, 'month').format('YYYY-MM');
      await this.loadAttendance();
    },
    async loadAttendance() {
      if (!this.attendanceGroupId) return;
      const start = moment(this.attendanceMonth, 'YYYY-MM').startOf('month').format('YYYY-MM-DD');
      const end = moment(this.attendanceMonth, 'YYYY-MM').endOf('month').format('YYYY-MM-DD');
      const result = await apiFetch(
        `/attendance?section=${this.sectionKey}&resource_id=${this.attendanceGroupId}&start_date=${start}&end_date=${end}`
      );
      this.attendanceMemberships = result.memberships;
      this.attendanceMarks = result.attendance;
    },
    // Built from the same data the table renders (not the DOM) so the
    // export doesn't depend on component markup/CSS staying in sync.
    // ExcelJS (not the free SheetJS build) because SheetJS's community
    // edition silently drops cell styles when writing .xlsx — no borders,
    // no fills — which is exactly what this needs to not look like a CSV dump.
    async exportAttendanceExcel() {
      // Dynamic import — ExcelJS is a large dependency that only the club
      // template's Excel export needs; a static import would bundle it into
      // every business type's shared chunk instead of loading on demand.
      const { default: ExcelJS } = await import('exceljs');
      const group = this.groups.find((g) => g.id === this.attendanceGroupId);
      const groupName = group ? group.label : 'Группа';
      const columnCount = this.attendanceDays.length + 1;

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Табель', { views: [{ showGridLines: true }] });
      sheet.columns = [{ width: 40 }, ...this.attendanceDays.map(() => ({ width: 8 }))];

      const titleRow = sheet.addRow([`Табель: ${groupName} (${this.monthLabel})`]);
      sheet.mergeCells(1, 1, 1, columnCount);
      titleRow.height = 24;
      titleRow.getCell(1).font = { bold: true, size: 13, color: { argb: 'FF1E293B' } };
      titleRow.getCell(1).alignment = { vertical: 'middle' };

      const headerRow = sheet.addRow(['Клиент', ...this.attendanceDays.map((d) => `${d.num} ${d.name}`)]);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FF1E293B' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        cell.border = XLSX_CELL_BORDER;
      });
      headerRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

      this.attendanceRows.forEach((row) => {
        const values = [row.full_name, ...this.attendanceDays.map((d) => this.attendanceCellMark(row, d.date) || '')];
        const xlsxRow = sheet.addRow(values);
        xlsxRow.getCell(1).border = XLSX_CELL_BORDER;
        this.attendanceDays.forEach((d, i) => {
          const cell = xlsxRow.getCell(i + 2);
          cell.border = XLSX_CELL_BORDER;
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          const colors = ATTENDANCE_XLSX_COLORS[this.attendanceCellClass(row, d.date)];
          if (colors) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.fill } };
            cell.font = { bold: true, color: { argb: colors.font } };
          }
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Табель_${groupName}_${this.attendanceMonth}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    attendanceMarkFor(membershipId, dateStr) {
      return this.attendanceMarks.find((a) => a.membership_id === membershipId && moment(a.date).format('YYYY-MM-DD') === dateStr);
    },
    isDateInMembership(m, dateStr) {
      return moment(dateStr).isBetween(m.start_date, m.end_date, 'day', '[]');
    },
    // С даты заморозки (включительно) и до разморозки — дни считаются
    // замороженными: посещаемость по ним не отмечается, но в журнале это
    // видно отдельным значком, а не просто пустой клеткой.
    isDateFrozen(m, dateStr) {
      return m.status === 'frozen' && !!m.frozen_at && !moment(dateStr).isBefore(m.frozen_at, 'day');
    },
    // Строка в табеле — это клиент, а не абонемент, так что для каждой даты
    // нужно найти тот из его абонементов, что её покрывает (их периоды не
    // пересекаются).
    membershipForDate(row, dateStr) {
      return row.memberships.find((m) => this.isDateInMembership(m, dateStr));
    },
    attendanceCellMark(row, dateStr) {
      const m = this.membershipForDate(row, dateStr);
      if (!m) return '';
      if (this.isDateFrozen(m, dateStr)) return '❄';
      const mark = this.attendanceMarkFor(m.id, dateStr);
      if (!mark) return '';
      return ATTENDANCE_MARK_ICONS[mark.status] || '';
    },
    attendanceCellClass(row, dateStr) {
      const m = this.membershipForDate(row, dateStr);
      if (!m) return 'out-of-range';
      if (this.isDateFrozen(m, dateStr)) return 'frozen';
      const mark = this.attendanceMarkFor(m.id, dateStr);
      if (!mark) return '';
      return mark.status;
    },
    async setAttendanceMark(membershipId, dateStr, status) {
      const updated = await apiFetch(`/attendance?section=${this.sectionKey}`, {
        method: 'POST',
        body: { membership_id: membershipId, date: dateStr, status },
      });
      const idx = this.attendanceMarks.findIndex((a) => a.id === updated.id);
      if (idx >= 0) {
        this.attendanceMarks.splice(idx, 1, updated);
      } else {
        this.attendanceMarks.push(updated);
      }
    },
    async clearAttendanceMark(membershipId, dateStr, markId) {
      await apiFetch(`/attendance?section=${this.sectionKey}&membership_id=${membershipId}&date=${dateStr}`, {
        method: 'DELETE',
      });
      this.attendanceMarks = this.attendanceMarks.filter((a) => a.id !== markId);
    },
    async toggleAttendance(row, dateStr) {
      if (!this.canWrite) return;
      const m = this.membershipForDate(row, dateStr);
      if (!m) return;
      if (this.isDateFrozen(m, dateStr)) return;
      const membershipId = m.id;
      const mark = this.attendanceMarkFor(membershipId, dateStr);
      // Режимы "Отмена тренером"/"Отработка" — отдельная отметка, не мешает
      // обычному циклу присутствия/пропуска на других днях.
      if (this.attendanceMarkMode !== 'normal') {
        if (mark && mark.status === this.attendanceMarkMode) {
          await this.clearAttendanceMark(membershipId, dateStr, mark.id);
        } else {
          await this.setAttendanceMark(membershipId, dateStr, this.attendanceMarkMode);
        }
        return;
      }
      // Cycle: blank -> present -> absent -> blank ... so an accidental click can be undone.
      if (mark && mark.status === 'absent') {
        await this.clearAttendanceMark(membershipId, dateStr, mark.id);
        return;
      }
      const nextStatus = mark ? 'absent' : 'present';
      await this.setAttendanceMark(membershipId, dateStr, nextStatus);
    },

    // ---------------- Пробные занятия ----------------
    onDatePillClick() {
      if (this.showAllTrialDates) {
        this.showAllTrialDates = false;
        return;
      }
      this.showTrialDateModal = true;
    },
    onPickTrialDate(date) {
      this.trialDate = date;
      this.showTrialDateModal = false;
    },
    openAddTrial() {
      this.editingTrialId = null;
      this.trialForm = { full_name: '', phone: '+7', age: null, resource_id: this.selectedGroupId || null, scheduled_at: moment().format('YYYY-MM-DDTHH:mm') };
      this.showTrialModal = true;
    },
    onTrialClick(t) {
      if (!this.canWrite) return;
      this.editingTrialId = t.id;
      this.trialForm = {
        full_name: t.full_name,
        phone: t.phone,
        age: t.age,
        resource_id: t.resource_id,
        scheduled_at: moment(t.scheduled_at).format('YYYY-MM-DDTHH:mm'),
        status: t.status,
      };
      this.showTrialModal = true;
    },
    async confirmTrial() {
      if (!this.trialForm.full_name.trim() || !this.trialForm.phone.trim()) {
        await showAlert('Заполните ФИО и телефон');
        return;
      }
      const body = { ...this.trialForm, scheduled_at: this.trialForm.scheduled_at.replace('T', ' ') };
      const url = this.editingTrialId
        ? `/trial_lessons/${this.editingTrialId}?section=${this.sectionKey}`
        : `/trial_lessons?section=${this.sectionKey}`;
      await apiFetch(url, { method: this.editingTrialId ? 'PUT' : 'POST', body });
      this.showTrialModal = false;
      await this.loadTrialLessons();
    },
    async deleteTrial() {
      const ok = await showConfirm('Удалить запись на пробное занятие?', { header: 'Удаление', confirmText: 'Удалить' });
      if (!ok) return;
      await apiFetch(`/trial_lessons/${this.editingTrialId}?section=${this.sectionKey}`, { method: 'DELETE' });
      this.showTrialModal = false;
      await this.loadTrialLessons();
    },

    // ---------------- Тренеры ----------------
    openAddTrainer() {
      this.editingTrainerId = null;
      this.trainerForm = { full_name: '', phone: '+7', photo_url: null, resource_ids: this.selectedGroupId ? [this.selectedGroupId] : [] };
      this.showTrainerModal = true;
    },
    onTrainerClick(t) {
      if (!this.canWrite) return;
      this.editingTrainerId = t.id;
      this.trainerForm = { full_name: t.full_name, phone: t.phone, photo_url: t.photo_url || null, resource_ids: [...t.resource_ids] };
      this.showTrainerModal = true;
    },
    // Фото хранится как data-URL прямо в БД — фотографий тренеров немного,
    // а отдельная файловая раздача на сервере не нужна. Кроп/масштаб
    // настраиваются в PhotoCropper, итог сохраняется уже как готовый аватар.
    onTrainerPhotoChange(event) {
      const file = event.target.files && event.target.files[0];
      event.target.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        this.photoEditorSrc = reader.result;
      };
      reader.readAsDataURL(file);
    },
    openPhotoEditor(src) {
      this.photoEditorSrc = src;
    },
    onPhotoCropConfirm(dataUrl) {
      this.trainerForm.photo_url = dataUrl;
      this.photoEditorSrc = null;
    },
    async confirmTrainer() {
      if (!this.trainerForm.full_name.trim()) {
        await showAlert('Заполните ФИО');
        return;
      }
      if (this.editingTrainerId) {
        await apiFetch(`/trainers/${this.editingTrainerId}`, { method: 'PUT', body: this.trainerForm });
      } else {
        await apiFetch('/trainers', { method: 'POST', body: { section: this.sectionKey, ...this.trainerForm } });
      }
      this.showTrainerModal = false;
      await this.loadTrainers();
    },
    async deleteTrainer() {
      const ok = await showConfirm('Удалить тренера?', { header: 'Удаление', confirmText: 'Удалить' });
      if (!ok) return;
      await apiFetch(`/trainers/${this.editingTrainerId}`, { method: 'DELETE' });
      this.showTrainerModal = false;
      await this.loadTrainers();
    },
  },
};
</script>

<style scoped>
ion-page {
  /* Scoped to this view only — the rest of the app keeps the default blue. */
  --ion-color-primary: #4f46e5;
  --ion-color-primary-shade: #4338ca;
  --ion-color-primary-tint: #6366f1;
}

.club-toolbar {
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
  color: #1e293b;
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
  color: #94a3b8;
}

.header-btn ion-icon {
  font-size: 16px;
}

.page-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100%;
  padding: 10px 10px 24px;
  background: #f8fafc;
  box-sizing: border-box;
}

.section-buttons-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.section-btn {
  flex: 0 0 auto;
  white-space: nowrap;
  border: none;
  background: #f1f5f9;
  border-radius: 12px;
  padding: 10px 14px;
  font-weight: 700;
  font-size: 0.85rem;
  color: #64748b;
}

.section-btn.active {
  background: #4f46e5;
  color: #ffffff;
}

.tabs-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.tab-btn {
  flex: 0 0 auto;
  white-space: nowrap;
  border: none;
  background: #f1f5f9;
  border-radius: 12px;
  padding: 10px 12px;
  font-weight: 700;
  font-size: 0.85rem;
  color: #64748b;
}

.tab-btn.active {
  background: #4f46e5;
  color: #fff;
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 0;
}

.add-btn {
  --border-radius: 12px;
  font-weight: 700;
  margin: 0 2px 4px;
}

.date-pill {
  display: inline-block;
  border: none;
  background: #f1f5f9;
  border-radius: 18px;
  padding: 8px 18px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #1e293b;
  cursor: pointer;
  margin: 0 2px 12px;
}

.trial-filters-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0 2px;
}

.trial-filters-row .date-pill {
  margin: 0;
}

.date-pill.active {
  background: #4f46e5;
  color: #fff;
}

.date-pill.dimmed {
  opacity: 0.45;
}

.pill-toggle-btn {
  display: inline-block;
  border: none;
  background: #f1f5f9;
  border-radius: 18px;
  padding: 8px 18px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #1e293b;
  cursor: pointer;
}

.pill-toggle-btn.active {
  background: #4f46e5;
  color: #fff;
}

.trial-status-filter {
  margin: 0 2px 12px;
}

.list-wrapper {
  flex: 1;
  min-height: 0;
}

.records-scroll {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.record-card {
  display: flex;
  align-items: stretch;
  gap: 12px;
  background: #ffffff;
  border-radius: 14px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  padding: 12px 14px;
  cursor: pointer;
}


.record-bar {
  width: 3px;
  border-radius: 2px;
  background: #4f46e5;
  flex-shrink: 0;
}

.record-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  background-color: #f1f5f9;
  flex-shrink: 0;
}

.trainer-photo-field {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}

.trainer-photo-preview,
.trainer-photo-placeholder {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  background: #f1f5f9;
  flex-shrink: 0;
}

.trainer-photo-preview-editable {
  cursor: pointer;
}

.trainer-photo-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 0.75rem;
  font-weight: 600;
}

.trainer-photo-btn {
  position: relative;
  background: #f1f5f9;
  border-radius: 12px;
  padding: 10px 16px;
  font-weight: 700;
  font-size: 0.85rem;
  color: #1e293b;
  cursor: pointer;
}

.trainer-photo-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.record-title {
  min-width: 0;
  font-weight: 700;
  font-size: 1rem;
  color: #1e293b;
}

.record-title-row {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 6px 8px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 0.68rem;
  font-weight: 700;
  white-space: nowrap;
  border: 1px solid transparent;
}

.status-pill-icon {
  font-size: 0.85em;
  line-height: 1;
}

.status-pill.active {
  background: rgba(5, 150, 105, 0.08);
  color: #059669;
  border-color: rgba(5, 150, 105, 0.35);
}

.status-pill.expiring {
  background: rgba(245, 158, 11, 0.1);
  color: #b45309;
  border-color: rgba(245, 158, 11, 0.4);
}

.status-pill.debt {
  background: rgba(225, 29, 72, 0.08);
  color: #e11d48;
  border-color: rgba(225, 29, 72, 0.35);
}

.status-pill.frozen {
  background: rgba(14, 165, 233, 0.08);
  color: #0284c7;
  border-color: rgba(14, 165, 233, 0.35);
}

.status-pill.inactive {
  background: rgba(100, 116, 139, 0.08);
  color: #64748b;
  border-color: rgba(100, 116, 139, 0.3);
}

.record-sub {
  font-size: 0.85rem;
  color: #64748b;
  margin-top: 2px;
}

.status-badge {
  display: inline-block;
  margin-top: 6px;
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 700;
  background: rgba(5, 150, 105, 0.12);
  color: #059669;
}

.status-badge.expired,
.status-badge.no_show,
.status-badge.declined {
  background: rgba(225, 29, 72, 0.12);
  color: #e11d48;
}

.status-badge.frozen,
.status-badge.thinking {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.status-badge.scheduled {
  background: rgba(79, 70, 229, 0.12);
  color: #4338ca;
}

.empty-state {
  text-align: center;
  color: #94a3b8;
  padding: 24px 0;
}

.attendance-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}

.excel-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: #059669;
  color: #ffffff;
  border-radius: 12px;
  padding: 10px 14px;
  font-weight: 700;
  font-size: 0.82rem;
}

.excel-btn-icon {
  font-style: normal;
  font-weight: 900;
}

.month-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: #f1f5f9;
  border-radius: 14px;
  padding: 10px 14px;
  margin: 0;
}

.month-label {
  width: 170px;
  font-weight: 700;
  color: #1e293b;
  text-align: center;
  white-space: nowrap;
}

.nav-arrow {
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 20px;
  line-height: 1;
  padding: 2px 6px;
  cursor: pointer;
}

.attendance-table-wrap {
  background: #ffffff;
  border-radius: 14px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  overflow-x: auto;
  padding: 4px 0;
}

.attendance-table {
  border-collapse: collapse;
  width: 100%;
}

.attendance-table th,
.attendance-table td {
  padding: 8px 5px;
  text-align: center;
}

.attendance-table tbody tr + tr td {
  border-top: 1px solid #f1f5f9;
}

.att-name-col {
  position: sticky;
  left: 0;
  width: 128px;
  min-width: 128px;
  max-width: 128px;
  background: #ffffff;
  text-align: center;
  font-size: 0.85rem;
  line-height: 1.3;
  font-weight: 700;
  color: #4f46e5;
  white-space: normal;
  word-break: break-word;
  padding: 8px 12px;
  z-index: 1;
}

.att-name {
  margin-bottom: 3px;
}

.att-phone {
  font-size: 0.72rem;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 3px;
}

.att-membership-line {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 4px;
  font-weight: 600;
}

.att-membership-none {
  color: #94a3b8;
  font-size: 0.68rem;
}

.status-pill.mini {
  padding: 1px 8px;
  font-size: 0.64rem;
}

.attendance-table thead .att-name-col {
  color: #1e293b;
}

.att-name-clickable {
  cursor: pointer;
  color: #4f46e5;
}

.att-day-col {
  min-width: 40px;
}

.attendance-day-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.7rem;
  color: #94a3b8;
  font-weight: 600;
}

.attendance-day-num {
  color: #1e293b;
}

.att-cell {
  cursor: pointer;
  color: #94a3b8;
  width: 34px;
  height: 34px;
  margin: 0 auto;
  border-radius: 10px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.att-cell.present {
  background: rgba(5, 150, 105, 0.14);
  color: #059669;
}

.att-cell.absent {
  background: rgba(225, 29, 72, 0.12);
  color: #e11d48;
}

.att-cell.out-of-range {
  cursor: default;
  background: transparent;
}

.att-cell.trainer_cancelled {
  background: rgba(245, 158, 11, 0.16);
  color: #b45309;
}

.att-cell.makeup {
  background: rgba(79, 70, 229, 0.14);
  color: #4338ca;
}

.att-cell.frozen {
  background: rgba(14, 165, 233, 0.16);
  color: #0369a1;
  cursor: default;
}

.attendance-legend {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.legend-item.present {
  color: #059669;
}

.legend-item.absent {
  color: #e11d48;
}

.legend-item.trainer_cancelled {
  color: #b45309;
}

.legend-item.makeup {
  color: #4338ca;
}

.legend-item.frozen {
  color: #0369a1;
}

.attendance-mode-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.attendance-mode-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
}

.mode-btn {
  border: none;
  background: #f1f5f9;
  border-radius: 10px;
  padding: 6px 12px;
  font-size: 0.8rem;
  font-weight: 700;
  color: #1e293b;
  cursor: pointer;
}

.mode-btn.active {
  background: #1e293b;
  color: #ffffff;
}

.club-modal {
  --border-radius: 20px;
}

.club-modal-toolbar {
  --border-color: transparent;
}

.section-title {
  font-weight: 700;
  font-size: 0.95rem;
  color: #1e293b;
  margin: 18px 2px 10px;
}

.renew-btn {
  --border-radius: 24px;
  font-weight: 700;
  margin-top: 12px;
}

.delete-btn {
  --border-radius: 24px;
  font-weight: 700;
  margin-top: 12px;
}

.paid-checkbox-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 4px 0 8px;
  font-weight: 600;
  font-size: 0.9rem;
  color: #1e293b;
}

.paid-checkbox-row input {
  width: 18px;
  height: 18px;
  accent-color: #4f46e5;
}

.debt-hint {
  font-size: 0.78rem;
  color: #e11d48;
  margin-bottom: 12px;
}
</style>
