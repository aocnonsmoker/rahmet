<template>
  <ion-page class="page">
    <div class="page-header">
      <h1 class="page-title">{{ label }}</h1>
      <button v-if="tab === 'clients' && canWrite" class="primary-btn" type="button" @click="openAddMembership">+ Добавить клиента</button>
      <button v-if="tab === 'trials' && canWrite" class="primary-btn" type="button" @click="openAddTrial">+ Записать на пробное</button>
    </div>

    <div class="tabs-row">
      <button class="tab-btn" :class="{ active: tab === 'clients' }" type="button" @click="tab = 'clients'">Клиенты</button>
      <button class="tab-btn" :class="{ active: tab === 'attendance' }" type="button" @click="tab = 'attendance'">Посещаемость</button>
      <button class="tab-btn" :class="{ active: tab === 'trials' }" type="button" @click="tab = 'trials'">Пробные</button>
    </div>

    <!-- ===================== Клиенты / абонементы ===================== -->
    <div v-if="tab === 'clients'" class="tab-panel wide">
      <div class="cards-grid">
        <div v-for="m in memberships" :key="m.id" class="record-card" @click="onMembershipClick(m)">
          <div class="record-bar" :style="{ background: groupColor(m.resource_id) }"></div>
          <div class="record-body">
            <div class="record-title">{{ m.full_name }}</div>
            <div class="record-sub">{{ groupLabel(m.resource_id) }} · {{ m.phone }}</div>
            <div class="record-sub">Абонемент: {{ formatDate(m.start_date) }} – {{ formatDate(m.end_date) }}</div>
            <span class="status-badge" :class="m.status">{{ membershipStatusLabel(m.status) }}</span>
          </div>
        </div>
        <div v-if="!memberships.length" class="empty-state">Нет клиентов</div>
      </div>
    </div>

    <!-- ===================== Посещаемость ===================== -->
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
      <div v-if="attendanceGroupId" class="attendance-grid-wrapper">
        <table class="attendance-grid">
          <thead>
            <tr>
              <th class="att-name-col">Клиент</th>
              <th v-for="d in monthDays" :key="d">{{ d }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in attendanceMemberships" :key="m.id">
              <td class="att-name-col">{{ m.full_name }}</td>
              <td
                v-for="d in monthDays"
                :key="d"
                class="att-cell"
                :class="attendanceCellClass(m.id, d)"
                @click="toggleAttendance(m.id, d)"
              >{{ attendanceCellMark(m.id, d) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="!attendanceMemberships.length" class="empty-state">В этой группе нет клиентов</div>
      </div>
      <div v-else class="empty-state">Выберите группу, чтобы увидеть табель</div>
    </div>

    <!-- ===================== Пробные занятия ===================== -->
    <div v-if="tab === 'trials'" class="tab-panel wide">
      <div class="cards-grid">
        <div v-for="t in trialLessons" :key="t.id" class="record-card" @click="onTrialClick(t)">
          <div class="record-bar" :style="{ background: groupColor(t.resource_id) }"></div>
          <div class="record-body">
            <div class="record-title">{{ t.full_name }}</div>
            <div class="record-sub">{{ t.phone }}<span v-if="t.age"> · {{ t.age }} лет</span></div>
            <div class="record-sub">{{ t.resource_id ? groupLabel(t.resource_id) : 'Группа не выбрана' }}</div>
            <div class="record-sub">{{ formatDateTime(t.scheduled_at) }}</div>
            <span class="status-badge" :class="t.status">{{ trialStatusLabel(t.status) }}</span>
          </div>
        </div>
        <div v-if="!trialLessons.length" class="empty-state">Нет записей на пробные занятия</div>
      </div>
    </div>

    <!-- Модальное окно клиента -->
    <DesktopModal v-model="showMembershipModal" :title="editingMembershipId ? 'Клиент' : 'Новый клиент'">
      <template v-if="membershipForm">
        <FormInput label="ФИО" type="text" :model-value="membershipForm.full_name" @update:modelValue="membershipForm.full_name = $event" />
        <FormInput label="Телефон" type="tel" :model-value="membershipForm.phone" @update:modelValue="membershipForm.phone = $event" />
        <FormInput label="Возраст" type="number" :model-value="membershipForm.age" @update:modelValue="membershipForm.age = $event" />
        <FormInput label="ФИО родителя/опекуна" type="text" :model-value="membershipForm.parent_name" @update:modelValue="membershipForm.parent_name = $event" />
        <FormSelect label="Группа" placeholder="Выберите группу" :model-value="membershipForm.resource_id" :options="groupOptions" @update:modelValue="membershipForm.resource_id = $event" />
        <FormInput label="Дата оплаты" type="date" :model-value="membershipForm.payment_date" @update:modelValue="membershipForm.payment_date = $event" />
        <FormInput label="Абонемент с" type="date" :model-value="membershipForm.start_date" @update:modelValue="membershipForm.start_date = $event" />
        <FormInput label="Абонемент по" type="date" :model-value="membershipForm.end_date" @update:modelValue="membershipForm.end_date = $event" />
        <FormInput label="Сумма" type="number" suffix="тг." :model-value="membershipForm.price" @update:modelValue="membershipForm.price = $event" />
        <FormSelect label="Статус" :model-value="membershipForm.status" :options="membershipStatusOptions" @update:modelValue="membershipForm.status = $event" />
      </template>
      <template #footer>
        <button v-if="editingMembershipId" class="pill-btn danger" type="button" @click="deleteMembership">Удалить</button>
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
  </ion-page>
</template>

<script>
import moment from 'moment';
import { IonPage } from '@ionic/vue';
import DesktopModal from '@/components/desktop/DesktopModal.vue';
import FormInput from '@/components/FormInput.vue';
import FormSelect from '@/components/FormSelect.vue';
import { apiFetch } from '@/services/api';
import { showAlert, showConfirm } from '@/services/dialogs';
import { useAuthStore } from '@/stores/auth';

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
  components: { IonPage, DesktopModal, FormInput, FormSelect },
  props: {
    sectionKey: { type: String, required: true },
    label: { type: String, required: true },
  },
  data() {
    return {
      tab: 'clients',
      groups: [],
      trainers: [],
      memberships: [],
      trialLessons: [],

      showMembershipModal: false,
      editingMembershipId: null,
      membershipForm: null,

      showTrialModal: false,
      editingTrialId: null,
      trialForm: null,

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
      return this.groups.map((g) => ({
        value: g.id,
        label: g.trainer_id ? `${g.label} — ${this.trainerLabel(g.trainer_id)}` : g.label,
      }));
    },
    membershipStatusOptions() {
      return Object.entries(MEMBERSHIP_STATUS_LABELS).map(([value, label]) => ({ value, label }));
    },
    trialStatusOptions() {
      return Object.entries(TRIAL_STATUS_LABELS).map(([value, label]) => ({ value, label }));
    },
    monthLabel() {
      return moment(this.attendanceMonth, 'YYYY-MM').format('MMMM YYYY');
    },
    monthDays() {
      const days = moment(this.attendanceMonth, 'YYYY-MM').daysInMonth();
      return Array.from({ length: days }, (_, i) => i + 1);
    },
  },
  async mounted() {
    await Promise.all([this.loadGroups(), this.loadTrainers(), this.loadMemberships(), this.loadTrialLessons()]);
  },
  methods: {
    async loadGroups() {
      this.groups = await apiFetch(`/resources?section=${this.sectionKey}`);
    },
    async loadTrainers() {
      this.trainers = await apiFetch(`/trainers?section=${this.sectionKey}`);
    },
    trainerLabel(trainerId) {
      const t = this.trainers.find((item) => item.id === trainerId);
      return t ? t.full_name : '—';
    },
    async loadMemberships() {
      this.memberships = await apiFetch(`/memberships?section=${this.sectionKey}`);
    },
    async loadTrialLessons() {
      this.trialLessons = await apiFetch(`/trial_lessons?section=${this.sectionKey}`);
    },
    groupLabel(resourceId) {
      const g = this.groups.find((item) => item.id === resourceId);
      return g ? g.label : '—';
    },
    groupColor(resourceId) {
      const g = this.groups.find((item) => item.id === resourceId);
      return g ? g.color : '#9aa0a6';
    },
    membershipStatusLabel(status) {
      return MEMBERSHIP_STATUS_LABELS[status] || status;
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

    // ---------------- Клиенты / абонементы ----------------
    openAddMembership() {
      this.editingMembershipId = null;
      this.membershipForm = {
        full_name: '',
        phone: '',
        age: null,
        parent_name: '',
        resource_id: this.groups[0] ? this.groups[0].id : null,
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
      this.membershipForm = {
        full_name: m.full_name,
        phone: m.phone,
        age: m.age,
        parent_name: m.parent_name,
        resource_id: m.resource_id,
        payment_date: m.payment_date ? moment(m.payment_date).format('YYYY-MM-DD') : '',
        start_date: moment(m.start_date).format('YYYY-MM-DD'),
        end_date: moment(m.end_date).format('YYYY-MM-DD'),
        price: m.price,
        status: m.status,
      };
      this.showMembershipModal = true;
    },
    async confirmMembership() {
      if (!this.membershipForm.full_name.trim() || !this.membershipForm.phone.trim() || !this.membershipForm.resource_id) {
        await showAlert('Заполните ФИО, телефон и группу');
        return;
      }
      const body = { ...this.membershipForm };
      const url = this.editingMembershipId
        ? `/memberships/${this.editingMembershipId}?section=${this.sectionKey}`
        : `/memberships?section=${this.sectionKey}`;
      await apiFetch(url, { method: this.editingMembershipId ? 'PUT' : 'POST', body });
      this.showMembershipModal = false;
      await this.loadMemberships();
      if (this.attendanceGroupId) await this.loadAttendance();
    },
    async deleteMembership() {
      const ok = await showConfirm('Удалить абонемент этого клиента?', { header: 'Удаление', confirmText: 'Удалить' });
      if (!ok) return;
      await apiFetch(`/memberships/${this.editingMembershipId}?section=${this.sectionKey}`, { method: 'DELETE' });
      this.showMembershipModal = false;
      await this.loadMemberships();
      if (this.attendanceGroupId) await this.loadAttendance();
    },

    // ---------------- Посещаемость ----------------
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
      const result = await apiFetch(
        `/attendance?section=${this.sectionKey}&resource_id=${this.attendanceGroupId}&month=${this.attendanceMonth}`
      );
      this.attendanceMemberships = result.memberships;
      this.attendanceMarks = result.attendance;
    },
    attendanceMarkFor(membershipId, day) {
      const dateStr = moment(this.attendanceMonth, 'YYYY-MM').date(day).format('YYYY-MM-DD');
      return this.attendanceMarks.find((a) => a.membership_id === membershipId && moment(a.date).format('YYYY-MM-DD') === dateStr);
    },
    attendanceCellMark(membershipId, day) {
      const mark = this.attendanceMarkFor(membershipId, day);
      if (!mark) return '';
      return mark.status === 'present' ? '✓' : '✕';
    },
    attendanceCellClass(membershipId, day) {
      const mark = this.attendanceMarkFor(membershipId, day);
      if (!mark) return '';
      return mark.status;
    },
    async toggleAttendance(membershipId, day) {
      if (!this.canWrite) return;
      const mark = this.attendanceMarkFor(membershipId, day);
      const nextStatus = !mark || mark.status === 'absent' ? 'present' : 'absent';
      const dateStr = moment(this.attendanceMonth, 'YYYY-MM').date(day).format('YYYY-MM-DD');
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
    openAddTrial() {
      this.editingTrialId = null;
      this.trialForm = { full_name: '', phone: '', age: null, resource_id: null, scheduled_at: moment().format('YYYY-MM-DDTHH:mm') };
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
}

.month-label {
  font-weight: 700;
  color: #1c1c1e;
  text-transform: capitalize;
  min-width: 140px;
  text-align: center;
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

.attendance-grid-wrapper {
  overflow-x: auto;
  background: #ffffff;
  border-radius: 14px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.attendance-grid {
  border-collapse: collapse;
  width: 100%;
}

.attendance-grid th,
.attendance-grid td {
  border: 1px solid #eceef0;
  text-align: center;
  padding: 8px 10px;
  font-size: 0.82rem;
  white-space: nowrap;
}

.att-name-col {
  position: sticky;
  left: 0;
  background: #ffffff;
  text-align: left;
  font-weight: 600;
  min-width: 160px;
  z-index: 1;
}

.att-cell {
  cursor: pointer;
  color: #9aa0a6;
  min-width: 32px;
}

.att-cell.present {
  background: rgba(76, 175, 80, 0.14);
  color: #2e7d32;
  font-weight: 700;
}

.att-cell.absent {
  background: rgba(244, 67, 54, 0.1);
  color: #d32f2f;
  font-weight: 700;
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
