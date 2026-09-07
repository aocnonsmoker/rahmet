<template>
  <ion-page>
    <ion-header :translucent="true" class="settings-header">
      <ion-toolbar class="settings-toolbar">
        <div class="header-card">
          <div class="header-title">Настройки</div>
          <HeaderMenuButton v-if="!isDesktopRoute" />
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div class="page-root">
        <div class="tabs-row">
          <button class="tab-btn" :class="{ active: tab === 'sections' }" type="button" @click="tab = 'sections'">Разделы</button>
          <button class="tab-btn" :class="{ active: tab === 'staff' }" type="button" @click="tab = 'staff'">Сотрудники</button>
        </div>

        <!-- ===================== Разделы ===================== -->
        <div v-if="tab === 'sections'" class="panel">
          <div v-for="s in sectionsList" :key="s.id" class="section-row">
            <div class="section-row-main">
              <label class="switch">
                <input type="checkbox" v-model="s.enabled" @change="onToggleSection(s)" />
                <span class="switch-slider"></span>
              </label>
              <span class="section-icon-display">{{ s.icon }}</span>
              <div class="section-fields">
                <div class="section-label-display">{{ s.label }}</div>
                <span class="template-badge">{{ templateLabel(s.template) }}</span>
              </div>
            </div>
            <div class="section-actions">
              <button class="icon-btn edit" type="button" @click="openEditSection(s)">Изменить</button>
              <button class="icon-btn danger" type="button" @click="deleteSection(s)">Удалить</button>
            </div>
          </div>

          <button class="add-section-btn" type="button" @click="showAddSection = true">+ Добавить раздел</button>
        </div>

        <!-- Модальное окно редактирования раздела -->
        <ion-modal class="section-modal" :is-open="showEditSection">
          <ion-header class="section-modal-header ion-no-border">
            <ion-toolbar class="section-modal-toolbar">
              <ion-buttons slot="start">
                <ion-button fill="clear" color="medium" @click="showEditSection = false">Отменить</ion-button>
              </ion-buttons>
              <ion-buttons slot="end">
                <ion-button fill="clear" color="primary" :strong="true" :disabled="savingSectionEdit" @click="saveSectionEdit">
                  {{ savingSectionEdit ? 'Сохраняем…' : 'Сохранить' }}
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            <template v-if="editingSection">
              <div class="new-section-row">
                <div class="icon-field">
                  <label class="icon-field-label">Значок<span class="icon-field-optional">необязательно</span></label>
                  <input class="section-icon-input" type="text" maxlength="4" v-model="editingSection.icon" />
                </div>
                <div class="label-field">
                  <FormInput
                    label="Название"
                    type="text"
                    :model-value="editingSection.label"
                    @update:modelValue="editingSection.label = $event"
                  />
                </div>
              </div>
              <div class="icon-picker">
                <button
                  v-for="emoji in ICON_CHOICES"
                  :key="emoji"
                  type="button"
                  class="icon-chip"
                  :class="{ selected: editingSection.icon === emoji }"
                  @click="editingSection.icon = emoji"
                >{{ emoji }}</button>
              </div>

              <FormSelect
                v-if="editingSection.template === 'time_slot'"
                label="Шаг времени"
                :model-value="editingSection.slot_step_minutes"
                :options="slotStepOptions"
                @update:modelValue="editingSection.slot_step_minutes = $event"
              />

              <FormSelect
                v-if="editingSection.template === 'time_slot'"
                label="Учёт людей"
                :model-value="editingSection.guest_fields"
                :options="guestFieldsOptions"
                @update:modelValue="editingSection.guest_fields = $event"
              />

              <template v-if="editingSection.template === 'club'">
                <label class="icon-field-label">Залы</label>
                <div class="resource-list">
                  <div v-for="r in roomResources" :key="r.id" class="resource-row" :style="{ borderColor: r.color }">
                    <div class="resource-row-label">
                      {{ r.label }}
                    </div>
                    <div class="section-actions">
                      <button class="icon-btn edit" type="button" @click="openEditResource(r)">Изменить</button>
                      <button class="icon-btn danger" type="button" @click="removeResource(r)">Удалить</button>
                    </div>
                  </div>
                  <div v-if="!roomResources.length" class="empty-hint">Залы не добавлены</div>
                </div>
                <button class="add-section-btn" type="button" @click="openAddResource('room')">+ Добавить зал</button>
              </template>

              <template v-if="editingSection.template !== 'queue'">
                <label v-if="editingSection.template === 'club'" class="icon-field-label">Группы</label>
                <div class="resource-list">
                  <div v-for="r in groupResources" :key="r.id" class="resource-row" :style="{ borderColor: r.color }">
                    <span class="resource-color" :style="{ background: r.color }"></span>
                    <div class="resource-row-label">
                      {{ r.label }}
                    </div>
                    <div class="section-actions">
                      <button class="icon-btn edit" type="button" @click="openEditResource(r)">Изменить</button>
                      <button class="icon-btn danger" type="button" @click="removeResource(r)">Удалить</button>
                    </div>
                  </div>
                  <div v-if="editingSection.template === 'club' && !groupResources.length" class="empty-hint">Группы не добавлены</div>
                </div>
                <button class="add-section-btn" type="button" @click="openAddResource('group')">
                  {{ editingSection.template === 'club' ? '+ Добавить группу' : '+ Добавить' }}
                </button>
              </template>
            </template>
          </ion-content>
        </ion-modal>

        <!-- Модальное окно добавления раздела -->
        <ion-modal class="section-modal" :is-open="showAddSection">
          <ion-header class="section-modal-header ion-no-border">
            <ion-toolbar class="section-modal-toolbar">
              <ion-buttons slot="start">
                <ion-button fill="clear" color="medium" @click="showAddSection = false">Отменить</ion-button>
              </ion-buttons>
              <ion-buttons slot="end">
                <ion-button fill="clear" color="primary" :strong="true" :disabled="creatingSection" @click="createSection">
                  {{ creatingSection ? 'Создаём…' : 'Добавить' }}
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            <div class="new-section-row">
              <div class="icon-field">
                <label class="icon-field-label">Значок<span class="icon-field-optional">необязательно</span></label>
                <input class="section-icon-input" type="text" placeholder="🎤" maxlength="4" v-model="newSection.icon" />
              </div>
              <div class="label-field">
                <FormInput
                  label="Название"
                  type="text"
                  placeholder="напр. Караоке"
                  :model-value="newSection.label"
                  @update:modelValue="newSection.label = $event"
                />
              </div>
            </div>

            <div class="icon-picker">
              <button
                v-for="emoji in ICON_CHOICES"
                :key="emoji"
                type="button"
                class="icon-chip"
                :class="{ selected: newSection.icon === emoji }"
                @click="newSection.icon = emoji"
              >{{ emoji }}</button>
            </div>
            <FormSelect
              label="Тип записи"
              :model-value="newSection.template"
              :options="templateOptions"
              @update:modelValue="newSection.template = $event"
            />
            <FormSelect
              v-if="newSection.template === 'time_slot'"
              label="Шаг времени"
              :model-value="newSection.slot_step_minutes"
              :options="slotStepOptions"
              @update:modelValue="newSection.slot_step_minutes = $event"
            />
            <FormSelect
              v-if="newSection.template === 'time_slot'"
              label="Учёт людей"
              :model-value="newSection.guest_fields"
              :options="guestFieldsOptions"
              @update:modelValue="newSection.guest_fields = $event"
            />
          </ion-content>
        </ion-modal>

        <!-- Модальное окно редактирования номера -->
        <ion-modal class="section-modal" :is-open="showEditResource">
          <ion-header class="section-modal-header ion-no-border">
            <ion-toolbar class="section-modal-toolbar">
              <ion-buttons slot="start">
                <ion-button fill="clear" color="medium" @click="showEditResource = false">Отменить</ion-button>
              </ion-buttons>
              <ion-buttons slot="end">
                <ion-button fill="clear" color="primary" :strong="true" :disabled="savingResource" @click="saveResourceEdit">
                  {{ savingResource ? 'Сохраняем…' : 'Сохранить' }}
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            <template v-if="editingResource">
              <FormInput
                label="Название"
                type="text"
                :model-value="editingResource.label"
                @update:modelValue="editingResource.label = $event"
              />

              <template v-if="editingSection && editingSection.template === 'club' && editingResource.kind !== 'room'">
                <label class="icon-field-label">Расписание</label>
                <div class="resource-list">
                  <div v-for="sch in schedulesForResource(editingResource.id)" :key="sch.id" class="resource-row">
                    <div class="resource-row-label">
                      {{ dayTimesSummary(sch.day_times) }}
                      <span class="resource-row-sub">{{ roomLabel(sch.room_id) }}</span>
                    </div>
                    <div class="section-actions">
                      <button class="icon-btn edit" type="button" @click="openEditSchedule(sch)">Изменить</button>
                      <button class="icon-btn danger" type="button" @click="removeSchedule(sch)">Удалить</button>
                    </div>
                  </div>
                  <div v-if="!schedulesForResource(editingResource.id).length" class="empty-hint">Расписание не задано</div>
                </div>
                <button
                  class="add-section-btn"
                  type="button"
                  @click="openAddSchedule(editingResource.id)"
                >+ Добавить расписание</button>
              </template>
            </template>
          </ion-content>
        </ion-modal>

        <!-- Модальное окно расписания группы -->
        <ion-modal class="section-modal" :is-open="showScheduleModal">
          <ion-header class="section-modal-header ion-no-border">
            <ion-toolbar class="section-modal-toolbar">
              <ion-buttons slot="start">
                <ion-button fill="clear" color="medium" @click="showScheduleModal = false">Отменить</ion-button>
              </ion-buttons>
              <ion-buttons slot="end">
                <ion-button fill="clear" color="primary" :strong="true" :disabled="savingSchedule" @click="confirmSchedule">
                  {{ savingSchedule ? 'Сохраняем…' : 'Сохранить' }}
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            <template v-if="scheduleForm">
              <FormSelect
                label="Зал"
                placeholder="Выберите зал"
                :model-value="scheduleForm.room_id"
                :options="roomOptions"
                @update:modelValue="scheduleForm.room_id = $event"
              />
              <DayTimesPicker label="Дни и время" :model-value="scheduleForm.day_times" @update:modelValue="scheduleForm.day_times = $event" />
            </template>
          </ion-content>
        </ion-modal>

        <!-- Модальное окно добавления номеров -->
        <ion-modal class="section-modal" :is-open="showAddResource">
          <ion-header class="section-modal-header ion-no-border">
            <ion-toolbar class="section-modal-toolbar">
              <ion-buttons slot="start">
                <ion-button fill="clear" color="medium" @click="showAddResource = false">Отменить</ion-button>
              </ion-buttons>
              <ion-buttons slot="end">
                <ion-button fill="clear" color="primary" :strong="true" :disabled="creatingResources" @click="addResources">
                  {{ creatingResources ? 'Создаём…' : 'Добавить' }}
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            <FormInput
              label="Название"
              type="text"
              placeholder="напр. Номер"
              :model-value="newResource.label"
              @update:modelValue="newResource.label = $event"
            />
            <template v-if="newResource.kind === 'group' && editingSection && editingSection.template === 'club'">
              <label class="icon-field-label">Расписание</label>
              <FormSelect
                label="Зал"
                placeholder="Выберите зал"
                :model-value="newResource.room_id"
                :options="roomOptions"
                @update:modelValue="newResource.room_id = $event"
              />
              <DayTimesPicker :model-value="newResource.day_times" @update:modelValue="newResource.day_times = $event" />
            </template>
          </ion-content>
        </ion-modal>

        <!-- ===================== Сотрудники ===================== -->
        <div v-if="tab === 'staff'" class="panel">
          <div class="staff-list">
            <div v-for="u in activeStaff" :key="u.id" class="staff-item">
              <div class="staff-row">
                <div class="staff-main">
                  <div class="staff-username">{{ u.username }}</div>
                  <div class="staff-meta">
                    {{ u.role === 'owner' ? 'Владелец' : (u.sections.map(labelFor).join(', ') || 'без разделов') }}
                    <span v-if="u.read_only" class="read-only-tag">только просмотр</span>
                  </div>
                </div>
                <div v-if="u.username === currentUsername" class="staff-actions">
                  <button class="icon-btn edit" type="button" @click="toggleEditPassword(u)">
                    {{ editingPasswordId === u.id ? 'Свернуть' : 'Изменить пароль' }}
                  </button>
                </div>
                <div v-else-if="u.role !== 'owner'" class="staff-actions">
                  <button class="icon-btn edit" type="button" @click="toggleEditStaff(u)">
                    {{ editingStaffId === u.id ? 'Свернуть' : 'Изменить' }}
                  </button>
                  <button class="icon-btn danger" type="button" @click="deactivateStaff(u)">Уволить</button>
                </div>
              </div>

              <div v-if="editingPasswordId === u.id" class="staff-edit-panel">
                <FormInput
                  label="Новый пароль"
                  type="text"
                  placeholder="Введите новый пароль"
                  :model-value="passwordForm"
                  @update:modelValue="passwordForm = $event"
                />
                <ion-button expand="block" class="save-btn" :disabled="savingPassword" @click="saveOwnPassword(u)">
                  {{ savingPassword ? 'Сохраняем…' : 'Сохранить' }}
                </ion-button>
              </div>

              <div v-if="editingStaffId === u.id" class="staff-edit-panel">
                <FormSelect label="Роль" :model-value="editForm.role" :options="roleOptions" @update:modelValue="editForm.role = $event" />
                <div v-if="editForm.role === 'employee'" class="section-checks">
                  <label v-for="key in enabledSectionKeys" :key="key" class="section-check">
                    <input type="checkbox" :value="key" v-model="editForm.sections" />
                    {{ labelFor(key) }}
                  </label>
                </div>
                <label v-if="editForm.role === 'employee'" class="section-check read-only-check">
                  <input type="checkbox" v-model="editForm.readOnly" />
                  Только просмотр (без добавления/редактирования)
                </label>
                <FormInput
                  label="Новый пароль (необязательно)"
                  type="text"
                  placeholder="Оставьте пустым, чтобы не менять"
                  :model-value="editForm.password"
                  @update:modelValue="editForm.password = $event"
                />
                <ion-button expand="block" class="save-btn" :disabled="savingStaff" @click="saveStaffEdit(u)">
                  {{ savingStaff ? 'Сохраняем…' : 'Сохранить' }}
                </ion-button>
              </div>
            </div>
          </div>

          <button class="add-section-btn" type="button" @click="openAddStaff">+ Добавить</button>
        </div>

        <!-- Модальное окно добавления сотрудника -->
        <ion-modal class="section-modal" :is-open="showAddStaff">
          <ion-header class="section-modal-header ion-no-border">
            <ion-toolbar class="section-modal-toolbar">
              <ion-buttons slot="start">
                <ion-button fill="clear" color="medium" @click="showAddStaff = false">Отменить</ion-button>
              </ion-buttons>
              <ion-buttons slot="end">
                <ion-button fill="clear" color="primary" :strong="true" :disabled="creatingStaff" @click="createStaff">
                  {{ creatingStaff ? 'Создаём…' : 'Добавить' }}
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            <FormInput label="Логин" type="text" :model-value="newStaff.username" @update:modelValue="newStaff.username = $event" />
            <FormInput label="Пароль" type="text" :model-value="newStaff.password" @update:modelValue="newStaff.password = $event" />
            <FormSelect label="Роль" :model-value="newStaff.role" :options="roleOptions" @update:modelValue="newStaff.role = $event" />
            <div v-if="newStaff.role === 'employee'" class="section-checks">
              <label v-for="key in enabledSectionKeys" :key="key" class="section-check">
                <input type="checkbox" :value="key" v-model="newStaff.sections" />
                {{ labelFor(key) }}
              </label>
            </div>
            <label v-if="newStaff.role === 'employee'" class="section-check read-only-check">
              <input type="checkbox" v-model="newStaff.readOnly" />
              Только просмотр (без добавления/редактирования)
            </label>
          </ion-content>
        </ion-modal>
      </div>
    </ion-content>
  </ion-page>
</template>

<script>
import { IonPage, IonHeader, IonToolbar, IonContent, IonButton, IonModal, IonButtons } from '@ionic/vue';
import FormInput from '@/components/FormInput.vue';
import FormSelect from '@/components/FormSelect.vue';
import DayTimesPicker from '@/components/DayTimesPicker.vue';
import HeaderMenuButton from '@/components/HeaderMenuButton.vue';
import { apiFetch } from '@/services/api';
import { showAlert, showConfirm } from '@/services/dialogs';
import { useSectionsStore } from '@/stores/sections';
import { useViewportStore } from '@/stores/viewport';
import { useAuthStore } from '@/stores/auth';
import { RU_DAYS_SHORT } from '@/utils/ruDate';

const TEMPLATE_LABELS = {
  time_slot: 'Бронь по времени',
  date_range: 'Бронь по датам',
  queue: 'Очередь',
  club: 'Спортивная секция',
};

const ICON_CHOICES = [
  '💧', '🚗', '🏨', '🎮', '🎤', '🎱', '🍽️', '☕', '💈', '💇',
  '🏋️', '🧘', '🎳', '🏓', '⚽', '🏊', '🚴', '🎨', '📷', '🐾',
  '🧸', '🎬', '🎵', '🎢',
];

// Vivid, readable shades only — no pale/pastel colors that wash out against white.
const COLOR_CHOICES = [
  '#2196f3', '#1565c0', '#00acc1', '#00897b',
  '#43a047', '#7cb342', '#c0ca33', '#ffb300',
  '#fb8c00', '#f4511e', '#e53935', '#d81b60',
  '#8e24aa', '#5e35b1', '#3949ab', '#6d4c41',
  '#546e7a', '#ad1457', '#2e7d32', '#283593',
];

export default {
  name: 'Settings',
  components: { IonPage, IonHeader, IonToolbar, IonContent, IonButton, IonModal, IonButtons, FormInput, FormSelect, HeaderMenuButton, DayTimesPicker },
  data() {
    return {
      ICON_CHOICES,
      tab: 'sections',

      sectionsList: [],
      showEditSection: false,
      editingSection: null,
      savingSectionEdit: false,
      showAddSection: false,
      newSection: { icon: '', label: '', template: 'time_slot', slot_step_minutes: 30, guest_fields: 'none' },
      creatingSection: false,

      resourceSection: '',
      resources: [],

      showEditResource: false,
      editingResource: null,
      savingResource: false,

      showAddResource: false,
      newResource: { label: '' },
      creatingResources: false,

      schedules: [],
      showScheduleModal: false,
      editingScheduleId: null,
      scheduleForm: null,
      savingSchedule: false,

      staff: [],
      showAddStaff: false,
      newStaff: { username: '', password: '', role: 'employee', sections: [], readOnly: false },
      creatingStaff: false,

      editingStaffId: null,
      editForm: { role: 'employee', sections: [], password: '', readOnly: false },
      savingStaff: false,

      editingPasswordId: null,
      passwordForm: '',
      savingPassword: false,
    };
  },
  computed: {
    // This component is reused as-is in the desktop sidebar layout — its
    // own sidebar already covers Касса/Выход, so the mobile kebab menu is
    // just redundant clutter there.
    isDesktopRoute() {
      return useViewportStore().isDesktop;
    },
    roleOptions() {
      return [
        { value: 'employee', label: 'Сотрудник' },
        { value: 'owner', label: 'Владелец' },
      ];
    },
    templateOptions() {
      return [
        { value: 'time_slot', label: 'Бронь по времени' },
        { value: 'date_range', label: 'Бронь по датам' },
        { value: 'queue', label: 'Очередь' },
        { value: 'club', label: 'Спортивная секция' },
      ];
    },
    slotStepOptions() {
      return [
        { value: 15, label: 'Каждые 15 минут' },
        { value: 30, label: 'Каждые 30 минут' },
        { value: 60, label: 'Каждый час' },
      ];
    },
    guestFieldsOptions() {
      return [
        { value: 'none', label: 'Не учитывать' },
        { value: 'single', label: 'Одно поле' },
        { value: 'split', label: 'Взрослые и детские' },
      ];
    },
    enabledSectionKeys() {
      return this.sectionsList.filter((s) => s.enabled).map((s) => s.key);
    },
    activeStaff() {
      return this.staff.filter((u) => u.is_active);
    },
    currentUsername() {
      return useAuthStore().username;
    },
    groupResources() {
      return this.resources.filter((r) => r.kind !== 'room');
    },
    roomResources() {
      return this.resources.filter((r) => r.kind === 'room');
    },
    roomOptions() {
      return this.roomResources.map((r) => ({ value: r.id, label: r.label }));
    },
  },
  async mounted() {
    await this.loadSections();
    await this.loadStaff();
  },
  methods: {
    labelFor(key) {
      const section = this.sectionsList.find((s) => s.key === key);
      return section ? section.label : key;
    },
    templateLabel(template) {
      return TEMPLATE_LABELS[template] || template;
    },
    async loadSections() {
      const store = useSectionsStore();
      await store.refresh();
      this.sectionsList = store.items.map((s) => ({ ...s }));
    },
    async onToggleSection(s) {
      try {
        await apiFetch(`/sections/${s.id}`, { method: 'PUT', body: { enabled: s.enabled } });
        await useSectionsStore().refresh();
      } catch (e) {
        s.enabled = !s.enabled;
        await showAlert(e.message);
      }
    },
    async openEditSection(s) {
      this.editingSection = { ...s };
      this.showEditSection = true;
      if (s.template !== 'queue') {
        this.resourceSection = s.key;
        await this.loadResources();
        if (s.template === 'club') await this.loadSchedules();
      }
    },
    async saveSectionEdit() {
      if (!this.editingSection.label.trim()) {
        await showAlert('Заполните "Название"');
        return;
      }
      this.savingSectionEdit = true;
      try {
        const body = { label: this.editingSection.label.trim(), icon: this.editingSection.icon.trim() };
        if (this.editingSection.template === 'time_slot') {
          body.slot_step_minutes = this.editingSection.slot_step_minutes;
          body.guest_fields = this.editingSection.guest_fields;
        }
        await apiFetch(`/sections/${this.editingSection.id}`, { method: 'PUT', body });
        this.showEditSection = false;
        await this.loadSections();
      } catch (e) {
        await showAlert(e.message);
      } finally {
        this.savingSectionEdit = false;
      }
    },
    async deleteSection(s) {
      const ok = await showConfirm(`Удалить раздел «${s.label}»?`, { header: 'Удаление', confirmText: 'Удалить' });
      if (!ok) return;
      try {
        await apiFetch(`/sections/${s.id}`, { method: 'DELETE' });
        await this.loadSections();
      } catch (e) {
        await showAlert(e.message);
      }
    },
    async createSection() {
      if (!this.newSection.label.trim()) {
        await showAlert('Заполните "Название"');
        return;
      }
      this.creatingSection = true;
      try {
        await apiFetch('/sections', {
          method: 'POST',
          body: {
            label: this.newSection.label.trim(),
            icon: this.newSection.icon.trim(),
            template: this.newSection.template,
            slot_step_minutes: this.newSection.slot_step_minutes,
            guest_fields: this.newSection.guest_fields,
          },
        });
        this.newSection = { icon: '', label: '', template: 'time_slot', slot_step_minutes: 30, guest_fields: 'none' };
        this.showAddSection = false;
        await this.loadSections();
      } catch (e) {
        await showAlert(e.message);
      } finally {
        this.creatingSection = false;
      }
    },
    async loadResources() {
      if (!this.resourceSection) {
        this.resources = [];
        return;
      }
      this.resources = await apiFetch(`/resources?section=${this.resourceSection}`);
    },
    openEditResource(r) {
      this.editingResource = { ...r };
      this.showEditResource = true;
    },
    async saveResourceEdit() {
      this.savingResource = true;
      try {
        const body = { label: this.editingResource.label, color: this.editingResource.color };
        await apiFetch(`/resources/${this.editingResource.id}`, { method: 'PUT', body });
        this.showEditResource = false;
        await this.loadResources();
      } finally {
        this.savingResource = false;
      }
    },
    async removeResource(r) {
      const ok = await showConfirm(`Удалить «${r.label}»?`, { header: 'Удаление', confirmText: 'Удалить' });
      if (!ok) return;
      await apiFetch(`/resources/${r.id}`, { method: 'DELETE' });
      this.resources = this.resources.filter((x) => x.id !== r.id);
    },

    // ---------------- Расписание группы ----------------
    async loadSchedules() {
      this.schedules = await apiFetch(`/group_schedules?section=${this.resourceSection}`);
    },
    schedulesForResource(resourceId) {
      return this.schedules.filter((s) => s.resource_id === resourceId);
    },
    roomLabel(roomId) {
      const r = this.roomResources.find((item) => item.id === roomId);
      return r ? r.label : '—';
    },
    formatTime(t) {
      return t ? t.slice(0, 5) : '';
    },
    dayTimesSummary(dayTimes) {
      if (!dayTimes || !dayTimes.length) return '—';
      return [...dayTimes]
        .sort((a, b) => a.day - b.day)
        .map((dt) => `${RU_DAYS_SHORT[dt.day]} ${this.formatTime(dt.start_time)}–${this.formatTime(dt.end_time)}`)
        .join(', ');
    },
    openAddSchedule(resourceId) {
      this.editingScheduleId = null;
      this.scheduleForm = {
        resource_id: resourceId,
        room_id: this.roomResources.length ? this.roomResources[0].id : null,
        day_times: [],
      };
      this.showScheduleModal = true;
    },
    openEditSchedule(s) {
      this.editingScheduleId = s.id;
      this.scheduleForm = {
        resource_id: s.resource_id,
        room_id: s.room_id,
        day_times: s.day_times.map((dt) => ({ ...dt })),
      };
      this.showScheduleModal = true;
    },
    async confirmSchedule() {
      if (
        !this.scheduleForm.room_id
        || !this.scheduleForm.day_times.length
        || this.scheduleForm.day_times.some((dt) => !dt.start_time || !dt.end_time)
      ) {
        await showAlert('Заполните зал и время для каждого выбранного дня');
        return;
      }
      this.savingSchedule = true;
      try {
        const body = { ...this.scheduleForm };
        const url = this.editingScheduleId
          ? `/group_schedules/${this.editingScheduleId}?section=${this.resourceSection}`
          : `/group_schedules?section=${this.resourceSection}`;
        await apiFetch(url, { method: this.editingScheduleId ? 'PUT' : 'POST', body });
        this.showScheduleModal = false;
        await this.loadSchedules();
      } finally {
        this.savingSchedule = false;
      }
    },
    async removeSchedule(s) {
      const ok = await showConfirm('Удалить это расписание?', { header: 'Удаление', confirmText: 'Удалить' });
      if (!ok) return;
      await apiFetch(`/group_schedules/${s.id}?section=${this.resourceSection}`, { method: 'DELETE' });
      this.schedules = this.schedules.filter((x) => x.id !== s.id);
    },
    openAddResource(kind) {
      this.newResource = {
        label: '',
        kind,
        room_id: this.roomResources.length ? this.roomResources[0].id : null,
        day_times: [],
      };
      this.showAddResource = true;
    },
    async addResources() {
      if (!this.newResource.label.trim()) {
        await showAlert('Заполните "Название"');
        return;
      }
      const sameKind = this.resources.filter((r) => r.kind === this.newResource.kind);
      const startOrder = sameKind.length ? Math.max(...sameKind.map((r) => r.sort_order)) : 0;
      this.creatingResources = true;
      try {
        const created = await apiFetch('/resources', {
          method: 'POST',
          body: {
            section: this.resourceSection,
            label: this.newResource.label.trim(),
            color: COLOR_CHOICES[sameKind.length % COLOR_CHOICES.length],
            sort_order: startOrder + 1,
            kind: this.newResource.kind,
          },
        });
        this.resources.push(created);
        if (
          this.newResource.kind === 'group'
          && this.newResource.room_id
          && this.newResource.day_times.length
          && !this.newResource.day_times.some((dt) => !dt.start_time || !dt.end_time)
        ) {
          await apiFetch(`/group_schedules?section=${this.resourceSection}`, {
            method: 'POST',
            body: {
              resource_id: created.id,
              room_id: this.newResource.room_id,
              day_times: this.newResource.day_times,
            },
          });
          await this.loadSchedules();
        }
        this.showAddResource = false;
      } finally {
        this.creatingResources = false;
      }
    },
    async loadStaff() {
      this.staff = await apiFetch('/users');
    },
    openAddStaff() {
      this.newStaff = { username: '', password: '', role: 'employee', sections: [], readOnly: false };
      this.showAddStaff = true;
    },
    async createStaff() {
      if (!this.newStaff.username.trim() || !this.newStaff.password.trim()) {
        await showAlert('Заполните "Логин" и "Пароль"');
        return;
      }
      this.creatingStaff = true;
      try {
        const payload = {
          username: this.newStaff.username.trim(),
          password: this.newStaff.password.trim(),
          role: this.newStaff.role,
          sections: this.newStaff.role === 'owner' ? [] : this.newStaff.sections,
          read_only: this.newStaff.role === 'owner' ? false : this.newStaff.readOnly,
        };
        await apiFetch('/users', { method: 'POST', body: payload });
        this.showAddStaff = false;
        await this.loadStaff();
      } catch (e) {
        await showAlert(e.message);
      } finally {
        this.creatingStaff = false;
      }
    },
    async deactivateStaff(u) {
      const ok = await showConfirm(`Уволить сотрудника «${u.username}»?`, { header: 'Увольнение', confirmText: 'Уволить' });
      if (!ok) return;
      await apiFetch(`/users/${u.id}`, { method: 'DELETE' });
      await this.loadStaff();
    },
    toggleEditStaff(u) {
      if (this.editingStaffId === u.id) {
        this.editingStaffId = null;
        return;
      }
      this.editingStaffId = u.id;
      this.editForm = { role: u.role, sections: [...u.sections], password: '', readOnly: u.read_only };
    },
    async saveStaffEdit(u) {
      this.savingStaff = true;
      try {
        const payload = {
          role: this.editForm.role,
          sections: this.editForm.role === 'owner' ? [] : this.editForm.sections,
          read_only: this.editForm.role === 'owner' ? false : this.editForm.readOnly,
        };
        if (this.editForm.password.trim()) {
          payload.password = this.editForm.password.trim();
        }
        await apiFetch(`/users/${u.id}`, { method: 'PUT', body: payload });
        this.editingStaffId = null;
        await this.loadStaff();
      } catch (e) {
        await showAlert(e.message);
      } finally {
        this.savingStaff = false;
      }
    },
    toggleEditPassword(u) {
      if (this.editingPasswordId === u.id) {
        this.editingPasswordId = null;
        return;
      }
      this.editingPasswordId = u.id;
      this.passwordForm = '';
    },
    async saveOwnPassword(u) {
      if (!this.passwordForm.trim()) {
        await showAlert('Введите новый пароль');
        return;
      }
      this.savingPassword = true;
      try {
        await apiFetch(`/users/${u.id}`, { method: 'PUT', body: { password: this.passwordForm.trim() } });
        this.editingPasswordId = null;
        this.passwordForm = '';
        await showAlert('Пароль изменён');
      } catch (e) {
        await showAlert(e.message);
      } finally {
        this.savingPassword = false;
      }
    },
  },
};
</script>

<style scoped>
.settings-toolbar {
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
  font-weight: 800;
  font-size: 1.1rem;
  color: #1c1c1e;
}

.page-root {
  padding: 12px 16px 32px;
  background: #f4f5f7;
  min-height: 100%;
}

.tabs-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
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

.section-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  background: #fff;
  border-radius: 14px;
  padding: 10px 14px;
}

.section-row-main {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 200px;
}

.section-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  margin-left: auto;
}

.section-icon-input {
  width: 40px;
  box-sizing: border-box;
  border: none;
  outline: none;
  background: #f4f5f7;
  border-radius: 14px;
  padding: 14px 8px;
  font-size: 1.1rem;
  text-align: center;
  flex-shrink: 0;
}

.section-icon-display {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f4f5f7;
  border-radius: 14px;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.section-label-display {
  font-weight: 700;
  font-size: 1rem;
  color: #1c1c1e;
}

.section-fields {
  flex: 1;
  min-width: 0;
}

.switch {
  position: relative;
  width: 42px;
  height: 24px;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-slider {
  position: absolute;
  inset: 0;
  background: #d0d3d8;
  border-radius: 24px;
  transition: 0.15s;
}

.switch-slider::before {
  content: "";
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  top: 3px;
  background: #fff;
  border-radius: 50%;
  transition: 0.15s;
}

.switch input:checked + .switch-slider {
  background: #2196f3;
}

.switch input:checked + .switch-slider::before {
  transform: translateX(18px);
}

.section-label-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-weight: 700;
  font-size: 1rem;
  color: #1c1c1e;
  padding: 0;
  box-sizing: border-box;
}

.template-badge {
  display: block;
  font-size: 0.72rem;
  font-weight: 600;
  color: #9aa0a6;
}

.save-btn {
  --border-radius: 14px;
  margin-top: 6px;
}

.add-section-btn {
  border: none;
  background: rgba(33, 150, 243, 0.12);
  color: #1565c0;
  font-weight: 700;
  font-size: 0.9rem;
  border-radius: 14px;
  padding: 14px;
  margin-top: 4px;
  margin-bottom: 16px;
  cursor: pointer;
}

.section-modal {
  --border-radius: 20px;
}

.section-modal-toolbar {
  --border-color: transparent;
}

.new-section-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 14px;
}

.icon-field {
  flex-shrink: 0;
}

.icon-field-label {
  display: flex;
  flex-direction: column;
  font-weight: 700;
  font-size: 0.8rem;
  color: #1c1c1e;
  margin-bottom: 6px;
}

.icon-field-optional {
  font-weight: 500;
  font-size: 0.68rem;
  color: #9aa0a6;
}

.label-field {
  flex: 1;
  min-width: 0;
}

.icon-picker {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  margin-bottom: 14px;
}

.icon-chip {
  border: none;
  background: #f4f5f7;
  border-radius: 12px;
  padding: 10px 0;
  font-size: 1.2rem;
  cursor: pointer;
}

.icon-chip.selected {
  background: rgba(33, 150, 243, 0.18);
  box-shadow: 0 0 0 2px #2196f3 inset;
}

.resource-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0;
}

.resource-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  background: #fff;
  border-radius: 12px;
  padding: 8px 10px;
  border-left: 4px solid transparent;
}

.resource-row-label {
  flex: 1;
  min-width: 100px;
  font-weight: 600;
  color: #1c1c1e;
}

.resource-row-sub {
  display: block;
  font-weight: 400;
  font-size: 0.8rem;
  color: #6a6f75;
}

.empty-hint {
  text-align: center;
  color: #9aa0a6;
  font-size: 0.85rem;
  padding: 10px 0;
}

.resource-color {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
}

.icon-btn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  font-weight: 700;
  flex-shrink: 0;
}

.icon-btn.danger { background: rgba(244, 67, 54, 0.12); color: #d32f2f; width: auto; border-radius: 10px; padding: 0 10px; height: 32px; }

.staff-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.staff-item {
  display: flex;
  flex-direction: column;
}

.staff-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: 12px;
  padding: 10px 14px;
  gap: 8px;
}

.staff-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.icon-btn.edit {
  background: rgba(33, 150, 243, 0.12);
  color: #1565c0;
  width: auto;
  border-radius: 10px;
  padding: 0 10px;
  height: 32px;
}

.staff-edit-panel {
  background: #f4f5f7;
  border-radius: 0 0 12px 12px;
  padding: 14px 14px 4px;
  margin: -6px 4px 0;
}

.staff-username {
  font-weight: 700;
  color: #1c1c1e;
}

.staff-meta {
  font-size: 0.8rem;
  color: #9aa0a6;
}

.read-only-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 8px;
  border-radius: 8px;
  background: rgba(255, 152, 0, 0.15);
  color: #b26a00;
  font-weight: 700;
  font-size: 0.72rem;
}

.read-only-check {
  margin-bottom: 14px;
}

.section-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}

.section-check {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 0.85rem;
  color: #1c1c1e;
}

</style>
