<template>
  <ion-page>
    <ion-header :translucent="true" class="club-header">
      <ion-toolbar class="club-toolbar">
        <div class="header-card">
          <div class="header-title">{{ label }}</div>
          <HeaderMenuButton />
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div class="page-root">
        <div class="tabs-row">
          <button class="tab-btn" :class="{ active: tab === 'clients' }" type="button" @click="tab = 'clients'">Клиенты</button>
          <button class="tab-btn" :class="{ active: tab === 'attendance' }" type="button" @click="tab = 'attendance'">Посещаемость</button>
          <button class="tab-btn" :class="{ active: tab === 'trials' }" type="button" @click="tab = 'trials'">Пробные</button>
        </div>

        <!-- ===================== Клиенты / абонементы ===================== -->
        <div v-if="tab === 'clients'" class="panel">
          <ion-button v-if="canWrite" expand="block" class="add-btn" @click="openAddMembership">+ Добавить клиента</ion-button>
          <div class="list-wrapper">
            <div class="records-scroll">
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
        </div>

        <!-- ===================== Посещаемость ===================== -->
        <div v-if="tab === 'attendance'" class="panel">
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
        <div v-if="tab === 'trials'" class="panel">
          <ion-button v-if="canWrite" expand="block" class="add-btn" @click="openAddTrial">+ Записать на пробное</ion-button>
          <div class="list-wrapper">
            <div class="records-scroll">
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
        </div>
      </div>
    </ion-content>

    <!-- Модальное окно добавления/редактирования клиента -->
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
  </ion-page>
</template>

<script>
import moment from 'moment';
import { IonContent, IonHeader, IonPage, IonToolbar, IonButton, IonModal, IonButtons } from '@ionic/vue';
import FormInput from '@/components/FormInput.vue';
import FormSelect from '@/components/FormSelect.vue';
import HeaderMenuButton from '@/components/HeaderMenuButton.vue';
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
  name: 'ClubView',
  components: { IonContent, IonHeader, IonPage, IonToolbar, IonButton, IonModal, IonButtons, FormInput, FormSelect, HeaderMenuButton },
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
      // Cycle: blank -> present -> absent -> present ... (binary status, no persisted "unmarked" state)
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
  color: #1c1c1e;
}

.page-root {
  min-height: 100%;
  padding: 10px 10px 24px;
  background: #f4f5f7;
  box-sizing: border-box;
}

.tabs-row {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

.tab-btn {
  flex: 1;
  border: none;
  background: #eef0f0;
  border-radius: 12px;
  padding: 10px 6px;
  font-weight: 700;
  font-size: 0.85rem;
  color: #6a6f75;
}

.tab-btn.active {
  background: #2196f3;
  color: #fff;
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.add-btn {
  --border-radius: 12px;
  font-weight: 700;
  margin: 0 2px 4px;
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
  background: #2196f3;
  flex-shrink: 0;
}

.record-title {
  font-weight: 700;
  font-size: 1rem;
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
  text-align: center;
  color: #9aa0a6;
  padding: 24px 0;
}

.month-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin: 4px 0 10px;
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
  padding: 8px 6px;
  font-size: 0.8rem;
  white-space: nowrap;
}

.att-name-col {
  position: sticky;
  left: 0;
  background: #ffffff;
  text-align: left;
  font-weight: 600;
  min-width: 140px;
  z-index: 1;
}

.att-cell {
  cursor: pointer;
  color: #9aa0a6;
  min-width: 30px;
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

.club-modal {
  --border-radius: 20px;
}

.club-modal-toolbar {
  --border-color: transparent;
}

.delete-btn {
  --border-radius: 24px;
  font-weight: 700;
  margin-top: 12px;
}
</style>
