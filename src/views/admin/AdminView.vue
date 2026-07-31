<template>
  <ion-page>
    <ion-content :fullscreen="true" class="admin-content">
      <div class="admin-root">
        <div class="admin-header">
          <h1 class="admin-title">Компании</h1>
          <div class="admin-header-actions">
            <button class="link-btn" type="button" @click="loadTenants">
              <ion-icon :icon="refreshIcon"></ion-icon>
              Обновить
            </button>
            <button class="primary-btn" type="button" @click="openAddTenant">+ Добавить компанию</button>
            <button class="logout-btn" type="button" @click="logout">Выйти</button>
          </div>
        </div>

        <div class="tenants-grid">
          <div v-for="t in tenants" :key="t.id" class="tenant-card">
            <div class="tenant-card-top">
              <div class="tenant-name">{{ t.name }}</div>
              <span class="status-badge" :class="t.subscription_status">{{ statusLabel(t.subscription_status) }}</span>
            </div>
            <div class="tenant-sub">Код компании: <b>{{ t.slug }}</b></div>
            <div class="tenant-sub">Владелец: {{ t.owner_username || '—' }}</div>
            <div class="tenant-sub">Подписка до: {{ formatDate(t.subscription_expires_at) }}</div>
            <div class="tenant-actions">
              <button class="pill-btn" type="button" @click="openSubscription(t)">Подписка</button>
              <button class="pill-btn" type="button" @click="openUsers(t)">Пользователи</button>
            </div>
          </div>
          <div v-if="!tenants.length" class="empty-state">Нет компаний</div>
        </div>
      </div>
    </ion-content>

    <!-- Новая компания -->
    <DesktopModal v-model="showAddTenant" title="Новая компания">
      <FormInput label="Название" type="text" :model-value="newTenant.name" @update:modelValue="newTenant.name = $event" />
      <FormInput
        label="Код компании (для входа)"
        type="text"
        placeholder="например acme"
        :model-value="newTenant.slug"
        @update:modelValue="newTenant.slug = $event"
      />
      <FormInput label="Логин владельца" type="text" :model-value="newTenant.owner_username" @update:modelValue="newTenant.owner_username = $event" />
      <FormInput label="Пароль владельца" type="text" :model-value="newTenant.owner_password" @update:modelValue="newTenant.owner_password = $event" />
      <FormSelect label="Статус подписки" :model-value="newTenant.subscription_status" :options="subscriptionStatusOptions" @update:modelValue="newTenant.subscription_status = $event" />
      <FormInput label="Подписка действует до" type="date" :model-value="newTenant.subscription_expires_at" @update:modelValue="newTenant.subscription_expires_at = $event" />
      <template #footer>
        <button class="pill-btn ghost" type="button" @click="showAddTenant = false">Отменить</button>
        <button class="pill-btn primary" type="button" :disabled="creatingTenant" @click="createTenant">
          {{ creatingTenant ? 'Создаём…' : 'Создать' }}
        </button>
      </template>
    </DesktopModal>

    <!-- Подписка -->
    <DesktopModal v-model="showSubscriptionModal" :title="editingTenant ? `Подписка — ${editingTenant.name}` : 'Подписка'">
      <template v-if="subscriptionForm">
        <FormSelect label="Статус" :model-value="subscriptionForm.status" :options="subscriptionStatusOptions" @update:modelValue="subscriptionForm.status = $event" />
        <FormInput label="Действует до" type="date" :model-value="subscriptionForm.expires_at" @update:modelValue="subscriptionForm.expires_at = $event" />
        <FormInput label="Заметка" type="text" :model-value="subscriptionForm.notes" @update:modelValue="subscriptionForm.notes = $event" />
      </template>
      <template #footer>
        <button class="pill-btn ghost" type="button" @click="showSubscriptionModal = false">Отменить</button>
        <button class="pill-btn primary" type="button" :disabled="savingSubscription" @click="saveSubscription">
          {{ savingSubscription ? 'Сохраняем…' : 'Сохранить' }}
        </button>
      </template>
    </DesktopModal>

    <!-- Пользователи компании -->
    <DesktopModal v-model="showUsersModal" :title="editingTenant ? `Пользователи — ${editingTenant.name}` : 'Пользователи'">
      <div class="user-list">
        <div v-for="u in tenantUsers" :key="u.id" class="user-row">
          <div class="user-row-main">
            <div class="user-row-name">{{ u.username }}</div>
            <span class="role-badge" :class="{ inactive: !u.is_active }">{{ u.role === 'owner' ? 'Владелец' : 'Сотрудник' }}{{ !u.is_active ? ' · деактивирован' : '' }}</span>
          </div>
          <button class="icon-btn edit" type="button" @click="openResetPassword(u)">Сбросить пароль</button>
        </div>
        <div v-if="!tenantUsers.length" class="empty-state">Нет пользователей</div>
      </div>
      <template #footer>
        <button class="pill-btn ghost" type="button" @click="showUsersModal = false">Закрыть</button>
      </template>
    </DesktopModal>

    <!-- Сброс пароля -->
    <DesktopModal v-model="showPasswordModal" :title="editingUser ? `Новый пароль — ${editingUser.username}` : 'Новый пароль'">
      <FormInput label="Новый пароль" type="text" :model-value="newPassword" @update:modelValue="newPassword = $event" />
      <template #footer>
        <button class="pill-btn ghost" type="button" @click="showPasswordModal = false">Отменить</button>
        <button class="pill-btn primary" type="button" :disabled="savingPassword" @click="savePassword">
          {{ savingPassword ? 'Сохраняем…' : 'Сохранить' }}
        </button>
      </template>
    </DesktopModal>
  </ion-page>
</template>

<script>
import moment from 'moment';
import { IonPage, IonContent, IonIcon } from '@ionic/vue';
import { refreshOutline } from 'ionicons/icons';
import DesktopModal from '@/components/desktop/DesktopModal.vue';
import FormInput from '@/components/FormInput.vue';
import FormSelect from '@/components/FormSelect.vue';
import { apiFetch } from '@/services/api';
import { showAlert, showConfirm } from '@/services/dialogs';
import { useAuthStore } from '@/stores/auth';

const STATUS_LABELS = { trial: 'Пробный', active: 'Активна', expired: 'Истекла' };

export default {
  name: 'AdminView',
  components: { IonPage, IonContent, IonIcon, DesktopModal, FormInput, FormSelect },
  data() {
    return {
      refreshIcon: refreshOutline,
      tenants: [],

      showAddTenant: false,
      newTenant: this.blankTenant(),
      creatingTenant: false,

      showSubscriptionModal: false,
      editingTenant: null,
      subscriptionForm: null,
      savingSubscription: false,

      showUsersModal: false,
      tenantUsers: [],

      showPasswordModal: false,
      editingUser: null,
      newPassword: '',
      savingPassword: false,
    };
  },
  computed: {
    subscriptionStatusOptions() {
      return Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));
    },
  },
  async mounted() {
    await this.loadTenants();
  },
  methods: {
    blankTenant() {
      return {
        name: '',
        slug: '',
        owner_username: '',
        owner_password: '',
        subscription_status: 'trial',
        subscription_expires_at: moment().add(1, 'month').format('YYYY-MM-DD'),
      };
    },
    async loadTenants() {
      this.tenants = await apiFetch('/admin/tenants');
    },
    statusLabel(status) {
      return STATUS_LABELS[status] || status;
    },
    formatDate(date) {
      if (!date) return '—';
      return moment(date).format('DD.MM.YYYY');
    },

    openAddTenant() {
      this.newTenant = this.blankTenant();
      this.showAddTenant = true;
    },
    async createTenant() {
      if (
        !this.newTenant.name.trim() ||
        !this.newTenant.slug.trim() ||
        !this.newTenant.owner_username.trim() ||
        !this.newTenant.owner_password
      ) {
        await showAlert('Заполните название, код компании, логин и пароль владельца');
        return;
      }
      this.creatingTenant = true;
      try {
        await apiFetch('/admin/tenants', {
          method: 'POST',
          body: {
            name: this.newTenant.name.trim(),
            slug: this.newTenant.slug.trim(),
            owner_username: this.newTenant.owner_username.trim(),
            owner_password: this.newTenant.owner_password,
            subscription_status: this.newTenant.subscription_status,
            subscription_expires_at: this.newTenant.subscription_expires_at,
          },
        });
        this.showAddTenant = false;
        await this.loadTenants();
      } catch (e) {
        await showAlert(e.message);
      } finally {
        this.creatingTenant = false;
      }
    },

    openSubscription(t) {
      this.editingTenant = t;
      this.subscriptionForm = {
        status: t.subscription_status,
        expires_at: t.subscription_expires_at
          ? moment(t.subscription_expires_at).format('YYYY-MM-DD')
          : moment().add(1, 'month').format('YYYY-MM-DD'),
        notes: t.subscription_notes || '',
      };
      this.showSubscriptionModal = true;
    },
    async saveSubscription() {
      this.savingSubscription = true;
      try {
        await apiFetch(`/admin/tenants/${this.editingTenant.id}/subscription`, {
          method: 'PUT',
          body: this.subscriptionForm,
        });
        this.showSubscriptionModal = false;
        await this.loadTenants();
      } catch (e) {
        await showAlert(e.message);
      } finally {
        this.savingSubscription = false;
      }
    },

    async openUsers(t) {
      this.editingTenant = t;
      this.tenantUsers = await apiFetch(`/admin/tenants/${t.id}/users`);
      this.showUsersModal = true;
    },
    openResetPassword(u) {
      this.editingUser = u;
      this.newPassword = '';
      this.showPasswordModal = true;
    },
    async savePassword() {
      if (!this.newPassword.trim()) {
        await showAlert('Введите новый пароль');
        return;
      }
      this.savingPassword = true;
      try {
        await apiFetch(`/admin/users/${this.editingUser.id}/password`, {
          method: 'PUT',
          body: { password: this.newPassword },
        });
        this.showPasswordModal = false;
      } catch (e) {
        await showAlert(e.message);
      } finally {
        this.savingPassword = false;
      }
    },

    async logout() {
      const ok = await showConfirm('Выйти из админки?', { header: 'Выход', confirmText: 'Выйти' });
      if (!ok) return;
      useAuthStore().logout();
      this.$router.replace('/login');
    },
  },
};
</script>

<style scoped>
.admin-content {
  --background: #f4f5f7;
}

.admin-root {
  padding: 28px 32px;
  max-width: 1100px;
  margin: 0 auto;
  box-sizing: border-box;
}

.admin-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.admin-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: #1c1c1e;
  margin: 0;
  flex-shrink: 0;
}

.admin-header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: auto;
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

.logout-btn {
  border: none;
  background: transparent;
  color: #d32f2f;
  font-weight: 700;
  font-size: 0.8rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  cursor: pointer;
}

.tenants-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.tenant-card {
  background: #ffffff;
  border-radius: 14px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  padding: 16px;
}

.tenant-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.tenant-name {
  font-weight: 700;
  font-size: 1.05rem;
  color: #1c1c1e;
}

.tenant-sub {
  font-size: 0.85rem;
  color: #6a6f75;
  margin-top: 2px;
}

.tenant-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.status-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
  background: rgba(76, 175, 80, 0.14);
  color: #2e7d32;
}

.status-badge.expired {
  background: rgba(244, 67, 54, 0.12);
  color: #d32f2f;
}

.status-badge.trial {
  background: rgba(255, 152, 0, 0.14);
  color: #e65100;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  color: #9aa0a6;
  padding: 40px 0;
}

.pill-btn {
  border: none;
  border-radius: 10px;
  padding: 8px 14px;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  background: #eef0f0;
  color: #1c1c1e;
}

.pill-btn.ghost {
  background: #f4f5f7;
  color: #4a4f55;
}

.pill-btn.primary {
  background: #2196f3;
  color: #fff;
}

.user-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #eceef0;
}

.user-row:last-child {
  border-bottom: none;
}

.user-row-name {
  font-weight: 700;
  color: #1c1c1e;
}

.role-badge {
  display: inline-block;
  margin-top: 2px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6a6f75;
}

.role-badge.inactive {
  color: #d32f2f;
}

.icon-btn.edit {
  border: none;
  background: rgba(33, 150, 243, 0.12);
  color: #1565c0;
  font-weight: 700;
  font-size: 0.78rem;
  padding: 8px 12px;
  border-radius: 10px;
  cursor: pointer;
  white-space: nowrap;
}
</style>
