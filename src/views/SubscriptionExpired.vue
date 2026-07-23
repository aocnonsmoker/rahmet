<template>
  <ion-page>
    <ion-content :fullscreen="true" class="expired-content">
      <div class="expired-root">
        <div class="expired-card">
          <div class="expired-icon">⏳</div>
          <div class="expired-title">Подписка неактивна</div>
          <div class="expired-text">
            Доступ к приложению приостановлен. Обратитесь к администратору, чтобы продлить подписку.
          </div>
          <ion-button expand="block" fill="outline" class="expired-btn" @click="logout">
            Выйти
          </ion-button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script>
import { IonPage, IonContent, IonButton } from '@ionic/vue';
import { useAuthStore } from '@/stores/auth';

export default {
  name: 'SubscriptionExpired',
  components: { IonPage, IonContent, IonButton },
  methods: {
    logout() {
      useAuthStore().logout();
      this.$router.replace('/login');
    },
  },
};
</script>

<style scoped>
.expired-content {
  --background: #f4f5f7;
}

.expired-root {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
}

.expired-card {
  width: 100%;
  max-width: 360px;
  background: #fff;
  border-radius: 20px;
  padding: 32px 22px;
  text-align: center;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
}

.expired-icon {
  font-size: 2.4rem;
  margin-bottom: 12px;
}

.expired-title {
  font-size: 1.2rem;
  font-weight: 800;
  color: #1c1c1e;
  margin-bottom: 10px;
}

.expired-text {
  color: #6a6f75;
  font-size: 0.9rem;
  line-height: 1.4;
  margin-bottom: 20px;
}

.expired-btn {
  --border-radius: 14px;
}
</style>
