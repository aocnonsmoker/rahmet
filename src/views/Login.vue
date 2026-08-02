<template>
  <ion-page>
    <ion-content :fullscreen="true" class="login-content">
      <div class="login-root">
        <form class="login-card" @submit.prevent="submit">
          <div class="login-title">Вход</div>

          <FormInput
            label="Код компании"
            type="text"
            placeholder="например rahmet"
            :model-value="tenantSlug"
            @update:modelValue="tenantSlug = $event"
          />
          <FormInput
            label="Логин"
            type="text"
            placeholder="Логин сотрудника"
            :model-value="username"
            @update:modelValue="username = $event"
          />
          <FormInput
            label="Пароль"
            type="password"
            placeholder="Пароль"
            :model-value="password"
            @update:modelValue="password = $event"
          />

          <div v-if="error" class="login-error">{{ error }}</div>

          <ion-button type="submit" expand="block" class="login-btn" :disabled="loading">
            {{ loading ? 'Входим…' : 'Войти' }}
          </ion-button>
        </form>
      </div>
    </ion-content>
  </ion-page>
</template>

<script>
import { IonPage, IonContent, IonButton } from '@ionic/vue';
import FormInput from '@/components/FormInput.vue';
import { useAuthStore } from '@/stores/auth';

export default {
  name: 'Login',
  components: { IonPage, IonContent, IonButton, FormInput },
  data() {
    return {
      tenantSlug: '',
      username: '',
      password: '',
      error: '',
      loading: false,
    };
  },
  methods: {
    async submit() {
      if (!this.tenantSlug || !this.username || !this.password) {
        this.error = 'Заполните все поля';
        return;
      }
      this.error = '';
      this.loading = true;
      try {
        const auth = useAuthStore();
        await auth.login(this.tenantSlug.trim(), this.username.trim(), this.password);
        // Where exactly to land (first section / welcome / subscription-expired)
        // is the router guard's job — it's the single source of truth for that
        // decision so it can't drift out of sync with this component.
        this.$router.replace(auth.isSuperadmin ? '/admin' : '/tabs/');
      } catch (e) {
        this.error = 'Неверный код компании, логин или пароль';
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.login-content {
  --background: #f4f5f7;
}

.login-root {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
}

.login-card {
  width: 100%;
  max-width: 360px;
  background: #fff;
  border-radius: 20px;
  padding: 28px 22px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
}

.login-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: #1c1c1e;
  margin-bottom: 20px;
  text-align: center;
}

.login-error {
  color: #d32f2f;
  font-weight: 600;
  font-size: 0.85rem;
  margin-bottom: 12px;
}

.login-btn {
  --border-radius: 14px;
  margin-top: 6px;
}
</style>
