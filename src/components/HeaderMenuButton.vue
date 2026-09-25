<template>
  <button class="header-btn menu" type="button" @click="openMenu">
    <ion-icon :icon="icons.menu"></ion-icon>
  </button>
</template>

<script>
import { IonIcon, actionSheetController } from '@ionic/vue';
import { cashOutline, settingsOutline, logOutOutline, ellipsisVertical, listOutline } from 'ionicons/icons';
import { useAuthStore } from '@/stores/auth';
import { showConfirm } from '@/services/dialogs';

export default {
  name: 'HeaderMenuButton',
  components: { IonIcon },
  data() {
    return {
      icons: {
        cash: cashOutline,
        settings: settingsOutline,
        logout: logOutOutline,
        menu: ellipsisVertical,
        auditLog: listOutline,
      },
    };
  },
  methods: {
    async openMenu() {
      const auth = useAuthStore();
      const buttons = [];
      if (auth.isOwner) {
        buttons.push({ text: 'Касса', icon: this.icons.cash, handler: () => this.$router.push('/tabs/cash') });
        buttons.push({ text: 'Настройки', icon: this.icons.settings, handler: () => this.$router.push('/tabs/settings') });
        buttons.push({ text: 'Журнал событий', icon: this.icons.auditLog, handler: () => this.$router.push('/tabs/audit-log') });
      }
      buttons.push({ text: 'Выйти', icon: this.icons.logout, role: 'destructive', handler: () => this.logout() });

      const sheet = await actionSheetController.create({ buttons });
      await sheet.present();
    },
    async logout() {
      const ok = await showConfirm('Вы точно хотите выйти?', { header: 'Выход', confirmText: 'Выйти' });
      if (ok) {
        useAuthStore().logout();
        this.$router.replace('/login');
      }
    },
  },
};
</script>

<style scoped>
.header-btn.menu {
  display: flex;
  align-items: center;
  border: none;
  background: transparent;
  padding: 0;
  color: #9aa0a6;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}
</style>
