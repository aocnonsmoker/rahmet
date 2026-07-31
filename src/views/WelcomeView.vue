<template>
  <ion-page>
    <ion-header :translucent="true" class="welcome-header">
      <ion-toolbar class="welcome-toolbar">
        <div class="header-card">
          <div class="header-title">Добро пожаловать</div>
          <HeaderMenuButton v-if="!isDesktopRoute" />
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="welcome-content">
      <div class="welcome-root">
        <div class="welcome-card">
          <div class="welcome-icon">👋</div>
          <div class="welcome-title">Добро пожаловать в jmb!</div>
          <div class="welcome-text">
            У вас пока нет ни одного раздела. Можете перейти в Настройки для первичной настройки вашего приложения.
          </div>
          <ion-button v-if="auth.isOwner" expand="block" class="welcome-btn" @click="$router.push('/tabs/settings')">
            Перейти в настройки
          </ion-button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script>
import { IonPage, IonHeader, IonToolbar, IonContent, IonButton } from '@ionic/vue';
import HeaderMenuButton from '@/components/HeaderMenuButton.vue';
import { useAuthStore } from '@/stores/auth';
import { useViewportStore } from '@/stores/viewport';

export default {
  name: 'WelcomeView',
  components: { IonPage, IonHeader, IonToolbar, IonContent, IonButton, HeaderMenuButton },
  data() {
    return {
      auth: useAuthStore(),
    };
  },
  computed: {
    isDesktopRoute() {
      return useViewportStore().isDesktop;
    },
  },
};
</script>

<style scoped>
.welcome-toolbar {
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

.welcome-content {
  --background: #f4f5f7;
}

.welcome-root {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
}

.welcome-card {
  width: 100%;
  max-width: 380px;
  background: #fff;
  border-radius: 20px;
  padding: 32px 24px;
  text-align: center;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
}

.welcome-icon {
  font-size: 2.4rem;
  margin-bottom: 12px;
}

.welcome-title {
  font-size: 1.2rem;
  font-weight: 800;
  color: #1c1c1e;
  margin-bottom: 10px;
}

.welcome-text {
  color: #6a6f75;
  font-size: 0.9rem;
  line-height: 1.4;
  margin-bottom: 20px;
}

.welcome-btn {
  --border-radius: 14px;
}
</style>
