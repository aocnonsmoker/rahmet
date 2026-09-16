<template>
  <ion-page class="page">
    <div class="page-header">
      <h1 class="page-title">{{ label }}</h1>
      <button class="link-btn" type="button" @click="refresh">
        <ion-icon :icon="refreshIcon"></ion-icon>
        Обновить
      </button>
      <FormSelect
        class="header-group-filter"
        placeholder="Все секции"
        :model-value="selectedGroupId"
        :options="groupFilterOptions"
        @update:modelValue="selectedGroupId = $event"
      />
      <button v-if="tab === 'clients' && canWrite" class="primary-btn" type="button" @click="openAddClient">+ Добавить клиента</button>
      <button v-if="tab === 'trials' && canWrite" class="primary-btn" type="button" @click="openAddTrial">+ Записать на пробное</button>
      <button v-if="tab === 'trainers' && canWrite" class="primary-btn" type="button" @click="openAddTrainer">+ Добавить тренера</button>
    </div>

    <div class="tabs-row">
      <button class="tab-btn" :class="{ active: tab === 'schedule' }" type="button" @click="tab = 'schedule'">Расписание</button>
      <button class="tab-btn" :class="{ active: tab === 'clients' }" type="button" @click="tab = 'clients'">Клиенты</button>
      <button class="tab-btn" :class="{ active: tab === 'trainers' }" type="button" @click="tab = 'trainers'">Тренеры</button>
      <button class="tab-btn" :class="{ active: tab === 'attendance' }" type="button" @click="tab = 'attendance'">Журнал</button>
      <button class="tab-btn" :class="{ active: tab === 'trials' }" type="button" @click="tab = 'trials'">Пробные</button>
    </div>

    <!-- ===================== Клиенты / абонементы ===================== -->
    <div v-if="tab === 'clients'" class="tab-panel wide">
      <div class="cards-grid">
        <div v-for="c in visibleClients" :key="c.id" class="record-card" @click="onClientClick(c)">
          <div class="record-bar" :style="{ background: clientBarColor(c.id) }"></div>
          <div class="record-body">
            <div class="record-title">{{ c.full_name }}</div>
            <div class="record-sub">{{ c.phone }}<span v-if="c.age"> · {{ c.age }} лет</span><span v-if="c.contract_number"> · №{{ c.contract_number }}</span></div>
            <div class="record-sub">{{ clientActiveSummary(c.id) }}</div>
          </div>
        </div>
        <div v-if="!visibleClients.length" class="empty-state">{{ selectedGroupId ? 'Нет клиентов в этой секции' : 'Нет клиентов' }}</div>
      </div>
    </div>

    <!-- ===================== Тренеры ===================== -->
    <div v-if="tab === 'trainers'" class="tab-panel wide">
      <div class="cards-grid">
        <div v-for="t in visibleTrainers" :key="t.id" class="record-card" @click="onTrainerClick(t)">
          <div class="record-bar"></div>
          <div class="record-body">
            <div class="record-title">{{ t.full_name }}</div>
            <div class="record-sub">{{ t.phone || '—' }}</div>
            <div class="record-sub">{{ groupLabels(t.resource_ids) }}</div>
          </div>
        </div>
        <div v-if="!visibleTrainers.length" class="empty-state">{{ selectedGroupId ? 'Нет тренеров в этой секции' : 'Нет тренеров' }}</div>
      </div>
    </div>

    <!-- ===================== Расписание ===================== -->
    <div v-if="tab === 'schedule'" class="tab-panel wide">
      <ScheduleCalendar
        :schedules="schedules"
        :groups="groups"
        :rooms="rooms"
        :selected-group-id="selectedGroupId"
        active-view="week"
        :time-cell-height="40"
        @event-click="onScheduleEventClick"
      />
    </div>

    <!-- ===================== Журнал ===================== -->
    <div v-if="tab === 'attendance'" class="tab-panel wide">
      <div class="attendance-controls">
        <FormSelect
          label="Группа"
          placeholder="Выберите группу"
          :model-value="attendanceGroupId"
          :options="groupOptions"
          @update:modelValue="onGroupChange"
        />
        <div v-if="attendanceGroupId" class="month-nav">
          <button class="nav-arrow" type="button" @click="prevMonth">‹</button>
          <div class="month-label">{{ monthLabel }}</div>
          <button class="nav-arrow" type="button" @click="nextMonth">›</button>
        </div>
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
                <td class="att-name-col">{{ row.full_name }}</td>
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
        </div>
      </template>
      <div v-else class="empty-state">Выберите группу, чтобы увидеть табель</div>
    </div>

    <!-- ===================== Пробные занятия ===================== -->
    <div v-if="tab === 'trials'" class="tab-panel wide">
      <div class="trial-filters-row">
        <button class="date-pill" type="button" :class="{ dimmed: showAllTrialDates, active: !showAllTrialDates }" @click="onDatePillClick">{{ formattedTrialDate }}</button>
        <button class="pill-toggle-btn" type="button" :class="{ active: showAllTrialDates }" @click="showAllTrialDates = !showAllTrialDates">За все даты</button>
        <FormSelect class="trial-status-filter" placeholder="Все статусы" :model-value="selectedTrialStatus" :options="trialStatusFilterOptions" @update:modelValue="selectedTrialStatus = $event" />
      </div>
      <DesktopModal v-model="showTrialDateModal" title="Выберите дату">
        <MonthCalendar :model-value="trialDate" :events="trialLessonsForBadges" @update:modelValue="onPickTrialDate" />
      </DesktopModal>
      <div class="cards-grid">
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

    <!-- Модальное окно клиента -->
    <DesktopModal v-model="showClientModal" :title="editingClientId ? 'Клиент' : 'Новый клиент'">
      <template v-if="clientForm">
        <FormInput label="ФИО" type="text" :model-value="clientForm.full_name" @update:modelValue="clientForm.full_name = $event" />
        <FormInput label="Телефон" type="tel" :model-value="clientForm.phone" @update:modelValue="clientForm.phone = $event" />
        <FormInput label="Возраст" type="number" :model-value="clientForm.age" @update:modelValue="clientForm.age = $event" />
        <FormInput label="ФИО родителя/опекуна" type="text" :model-value="clientForm.parent_name" @update:modelValue="clientForm.parent_name = $event" />

        <template v-if="editingClientId">
          <FormInput label="Номер договора" type="text" :model-value="clientForm.contract_number" @update:modelValue="clientForm.contract_number = $event" />
          <FormInput label="Дата договора" type="date" :model-value="clientForm.contract_date" @update:modelValue="clientForm.contract_date = $event" />
          <div class="section-title">Абонементы</div>
          <div class="client-memberships">
            <div v-for="m in clientMemberships(editingClientId)" :key="m.id" class="record-card" @click="onMembershipClick(m)">
              <div class="record-bar" :style="{ background: groupColor(m.resource_ids[0]) }"></div>
              <div class="record-body">
                <div class="record-title">{{ groupLabels(m.resource_ids) }}</div>
                <div class="record-sub">Абонемент: {{ formatDate(m.start_date) }} – {{ formatDate(m.end_date) }}</div>
                <span class="status-badge" :class="effectiveStatus(m)">{{ membershipStatusLabel(effectiveStatus(m)) }}</span>
              </div>
            </div>
            <div v-if="!clientMemberships(editingClientId).length" class="empty-state">Нет абонементов</div>
          </div>
          <button class="pill-btn success add-membership-btn" type="button" @click="openAddMembershipForClient">+ Добавить абонемент</button>
        </template>
      </template>
      <template #footer>
        <button v-if="editingClientId" class="pill-btn danger" type="button" @click="deleteClient">Удалить клиента</button>
        <button class="pill-btn ghost" type="button" @click="showClientModal = false">Отменить</button>
        <button class="pill-btn primary" type="button" @click="confirmClient">Сохранить</button>
      </template>
    </DesktopModal>

    <!-- Модальное окно абонемента -->
    <DesktopModal v-model="showMembershipModal" :title="editingMembershipId ? 'Абонемент' : 'Новый абонемент'">
      <template v-if="membershipForm">
        <FormSelect label="Группа" placeholder="Выберите группу" :model-value="membershipForm.resource_ids[0] || null" :options="groupOptions" @update:modelValue="membershipForm.resource_ids = $event ? [$event] : []" />
        <FormInput label="Дата оплаты" type="date" :model-value="membershipForm.payment_date" @update:modelValue="membershipForm.payment_date = $event" />
        <FormInput label="Абонемент с" type="date" :model-value="membershipForm.start_date" @update:modelValue="membershipForm.start_date = $event" />
        <FormInput label="Абонемент по" type="date" :model-value="membershipForm.end_date" @update:modelValue="membershipForm.end_date = $event" />
        <FormInput label="Сумма" type="number" suffix="тг." :model-value="membershipForm.price" @update:modelValue="membershipForm.price = $event" />
        <FormSelect label="Статус" :model-value="membershipForm.status" :options="membershipStatusOptions" @update:modelValue="membershipForm.status = $event" />
        <button v-if="editingMembershipId" class="pill-btn danger" type="button" @click="deleteMembership">Удалить абонемент</button>
      </template>
      <template #footer>
        <button class="pill-btn ghost" type="button" @click="showMembershipModal = false">Отменить</button>
        <button class="pill-btn primary" type="button" @click="confirmMembership">Сохранить</button>
      </template>
    </DesktopModal>

    <!-- Модальное окно пробного занятия -->
    <DesktopModal v-model="showTrialModal" :title="editingTrialId ? 'Пробное занятие' : 'Запись на пробное'">
      <template v-if="trialForm">
        <FormInput label="ФИО" type="text" :model-value="trialForm.full_name" @update:modelValue="trialForm.full_name = $event" />
        <FormInput label="Телефон" type="tel" :model-value="trialForm.phone" @update:modelValue="trialForm.phone = $event" />
        <FormInput label="Возраст" type="number" :model-value="trialForm.age" @update:modelValue="trialForm.age = $event" />
        <FormSelect label="Группа" placeholder="Пока не выбрана" :model-value="trialForm.resource_id" :options="groupOptions" @update:modelValue="trialForm.resource_id = $event" />
        <FormInput label="Дата и время" type="datetime-local" :model-value="trialForm.scheduled_at" @update:modelValue="trialForm.scheduled_at = $event" />
        <FormSelect v-if="editingTrialId" label="Статус" :model-value="trialForm.status" :options="trialStatusOptions" @update:modelValue="trialForm.status = $event" />
      </template>
      <template #footer>
        <button v-if="editingTrialId" class="pill-btn danger" type="button" @click="deleteTrial">Удалить</button>
        <button class="pill-btn ghost" type="button" @click="showTrialModal = false">Отменить</button>
        <button class="pill-btn primary" type="button" @click="confirmTrial">Сохранить</button>
      </template>
    </DesktopModal>

    <!-- Модальное окно тренера -->
    <DesktopModal v-model="showTrainerModal" :title="editingTrainerId ? 'Тренер' : 'Новый тренер'">
      <template v-if="trainerForm">
        <FormInput label="ФИО" type="text" :model-value="trainerForm.full_name" @update:modelValue="trainerForm.full_name = $event" />
        <FormInput label="Телефон" type="tel" :model-value="trainerForm.phone" @update:modelValue="trainerForm.phone = $event" />
        <FormSelect label="Группы" placeholder="Выберите группы" multiple :model-value="trainerForm.resource_ids" :options="plainGroupOptions" @update:modelValue="trainerForm.resource_ids = $event" />
      </template>
      <template #footer>
        <button v-if="editingTrainerId" class="pill-btn danger" type="button" @click="deleteTrainer">Удалить</button>
        <button class="pill-btn ghost" type="button" @click="showTrainerModal = false">Отменить</button>
        <button class="pill-btn primary" type="button" @click="confirmTrainer">Сохранить</button>
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
import ScheduleCalendar from '@/components/ScheduleCalendar.vue';
import { apiFetch } from '@/services/api';
import { showAlert, showConfirm, showToast } from '@/services/dialogs';
import { useAuthStore } from '@/stores/auth';
import { ruDayShort } from '@/utils/ruDate';

const MEMBERSHIP_STATUS_LABELS = { active: 'Активен', expired: 'Закончился', frozen: 'Заморожен' };
const TRIAL_STATUS_LABELS = {
  scheduled: 'Записан',
  came: 'Пришёл',
  no_show: 'Не пришёл',
  bought: 'Купил абонемент',
  thinking: 'Думает',
  declined: 'Отказался',
};

export default {
  name: 'DesktopClubView',
  components: { IonPage, IonIcon, DesktopModal, FormInput, FormSelect, MonthCalendar, ScheduleCalendar },
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

      attendanceGroupId: null,
      attendanceMonth: moment().format('YYYY-MM'),
      attendanceMemberships: [],
      attendanceMarks: [],
    };
  },
  computed: {
    canWrite() {
      return useAuthStore().canWrite;
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
          byClient.set(m.client_id, { client_id: m.client_id, full_name: m.full_name, memberships: [] });
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
    async loadTrainers() {
      this.trainers = await apiFetch(`/trainers?section=${this.sectionKey}`);
    },
    async loadClients() {
      this.clients = await apiFetch(`/clients?section=${this.sectionKey}`);
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
      return g ? g.color : '#9aa0a6';
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
    clientBarColor(clientId) {
      let active = this.clientMemberships(clientId).filter((m) => this.effectiveStatus(m) === 'active');
      if (this.selectedGroupId) active = active.filter((m) => m.resource_ids.includes(this.selectedGroupId));
      return active.length ? this.groupColor(active[0].resource_ids[0]) : '#9aa0a6';
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
      this.membershipForm = {
        resource_ids: this.selectedGroupId ? [this.selectedGroupId] : [],
        payment_date: moment().format('YYYY-MM-DD'),
        start_date: moment().format('YYYY-MM-DD'),
        end_date: moment().add(1, 'month').format('YYYY-MM-DD'),
        price: null,
        status: 'active',
      };
      this.showMembershipModal = true;
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
    attendanceMarkFor(membershipId, dateStr) {
      return this.attendanceMarks.find((a) => a.membership_id === membershipId && moment(a.date).format('YYYY-MM-DD') === dateStr);
    },
    isDateInMembership(m, dateStr) {
      return moment(dateStr).isBetween(m.start_date, m.end_date, 'day', '[]');
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
      const mark = this.attendanceMarkFor(m.id, dateStr);
      if (!mark) return '';
      return mark.status === 'present' ? '✓' : '✕';
    },
    attendanceCellClass(row, dateStr) {
      const m = this.membershipForDate(row, dateStr);
      if (!m) return 'out-of-range';
      const mark = this.attendanceMarkFor(m.id, dateStr);
      if (!mark) return '';
      return mark.status;
    },
    async toggleAttendance(row, dateStr) {
      if (!this.canWrite) return;
      const m = this.membershipForDate(row, dateStr);
      if (!m) return;
      const membershipId = m.id;
      // Cycle: blank -> present -> absent -> blank ... so an accidental click can be undone.
      const mark = this.attendanceMarkFor(membershipId, dateStr);
      if (mark && mark.status === 'absent') {
        await apiFetch(`/attendance?section=${this.sectionKey}&membership_id=${membershipId}&date=${dateStr}`, {
          method: 'DELETE',
        });
        this.attendanceMarks = this.attendanceMarks.filter((a) => a.id !== mark.id);
        return;
      }
      const nextStatus = mark ? 'absent' : 'present';
      const updated = await apiFetch(`/attendance?section=${this.sectionKey}`, {
        method: 'POST',
        body: { membership_id: membershipId, date: dateStr, status: nextStatus },
      });
      const idx = this.attendanceMarks.findIndex((a) => a.id === updated.id);
      if (idx >= 0) {
        this.attendanceMarks.splice(idx, 1, updated);
      } else {
        this.attendanceMarks.push(updated);
      }
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
      this.trainerForm = { full_name: '', phone: '+7', resource_ids: this.selectedGroupId ? [this.selectedGroupId] : [] };
      this.showTrainerModal = true;
    },
    onTrainerClick(t) {
      if (!this.canWrite) return;
      this.editingTrainerId = t.id;
      this.trainerForm = { full_name: t.full_name, phone: t.phone, resource_ids: [...t.resource_ids] };
      this.showTrainerModal = true;
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
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.header-group-filter {
  align-self: center;
  min-width: 220px;
  margin-bottom: 0;
}

.header-group-filter :deep(.ff-trigger) {
  padding: 10px 14px;
  font-size: 0.85rem;
  font-weight: 600;
}

.page-header > .primary-btn {
  align-self: center;
  margin-left: auto;
}

.page-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: #1c1c1e;
  margin: 0;
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

.tabs-row {
  display: flex;
  border-bottom: 1px solid #e0e2e5;
  margin-bottom: 20px;
}

.tab-btn {
  border: none;
  background: transparent;
  padding: 12px 20px;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #9aa0a6;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.tab-btn.active {
  color: #2196f3;
  border-bottom-color: #2196f3;
}

.tab-panel.wide {
  max-width: none;
}

.date-pill {
  display: inline-block;
  border: none;
  background: #eef0f0;
  border-radius: 18px;
  padding: 8px 18px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #2b2f33;
  cursor: pointer;
  margin-bottom: 16px;
}

.trial-filters-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.trial-filters-row .date-pill {
  margin-bottom: 0;
}

.date-pill.active {
  background: #2196f3;
  color: #fff;
}

.date-pill.dimmed {
  opacity: 0.45;
}

.pill-toggle-btn {
  display: inline-block;
  border: none;
  background: #eef0f0;
  border-radius: 18px;
  padding: 8px 18px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #2b2f33;
  cursor: pointer;
}

.pill-toggle-btn.active {
  background: #2196f3;
  color: #fff;
}

.trial-status-filter {
  min-width: 200px;
  margin-bottom: 0;
}

.trial-status-filter :deep(.ff-trigger) {
  padding: 10px 14px;
  font-size: 0.85rem;
  font-weight: 600;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
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

.record-title {
  font-weight: 700;
  font-size: 1.02rem;
  color: #1c1c1e;
}

.record-sub {
  font-size: 0.85rem;
  color: #6a6f75;
  margin-top: 2px;
}

.status-badge {
  display: inline-block;
  margin-top: 6px;
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 700;
  background: rgba(76, 175, 80, 0.14);
  color: #2e7d32;
}

.status-badge.expired,
.status-badge.no_show,
.status-badge.declined {
  background: rgba(244, 67, 54, 0.12);
  color: #d32f2f;
}

.status-badge.frozen,
.status-badge.thinking {
  background: rgba(255, 152, 0, 0.14);
  color: #e65100;
}

.status-badge.scheduled {
  background: rgba(33, 150, 243, 0.12);
  color: #1565c0;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  color: #9aa0a6;
  padding: 40px 0;
}

.attendance-controls {
  display: flex;
  align-items: center;
  gap: 24px;
  max-width: 520px;
  margin-bottom: 16px;
}

.attendance-controls > :first-child {
  flex: 1;
}

.month-nav {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #eef0f0;
  border-radius: 14px;
  padding: 8px 14px;
}

.month-label {
  font-weight: 700;
  color: #1c1c1e;
  width: 190px;
  text-align: center;
  white-space: nowrap;
}

.nav-arrow {
  border: none;
  background: transparent;
  color: #6a6f75;
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
  table-layout: fixed;
}

.attendance-table th,
.attendance-table td {
  padding: 10px 6px;
  text-align: center;
}

.attendance-table tbody tr + tr td {
  border-top: 1px solid #f0f1f3;
}

.att-name-col {
  position: sticky;
  left: 0;
  width: 25%;
  background: #ffffff;
  text-align: left;
  font-weight: 700;
  color: #2196f3;
  white-space: normal;
  word-break: break-word;
  padding-left: 16px;
  z-index: 1;
}

.attendance-table thead .att-name-col {
  color: #1c1c1e;
}

.attendance-day-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.72rem;
  color: #9aa0a6;
  font-weight: 600;
}

.attendance-day-num {
  color: #1c1c1e;
}

.att-cell {
  cursor: pointer;
  color: #9aa0a6;
  width: 36px;
  height: 36px;
  margin: 0 auto;
  border-radius: 10px;
  background: #eef0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.att-cell.present {
  background: rgba(76, 175, 80, 0.16);
  color: #2e7d32;
}

.att-cell.absent {
  background: rgba(244, 67, 54, 0.12);
  color: #d32f2f;
}

.att-cell.out-of-range {
  cursor: default;
  background: transparent;
}

.attendance-legend {
  display: flex;
  gap: 20px;
  margin-top: 14px;
  font-size: 0.85rem;
  font-weight: 600;
}

.legend-item.present {
  color: #2e7d32;
}

.legend-item.absent {
  color: #d32f2f;
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

.pill-btn.success {
  background: rgba(76, 175, 80, 0.14);
  color: #2e7d32;
}

.section-title {
  font-weight: 700;
  font-size: 0.95rem;
  color: #1c1c1e;
  margin: 18px 0 10px;
}

.client-memberships {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}

.client-memberships .record-card {
  padding: 12px 14px;
}

.client-memberships .empty-state {
  padding: 16px 0;
}

.add-membership-btn {
  width: 100%;
}

</style>
