import { alertController, toastController } from '@ionic/vue';

// Ionic-styled replacements for the native window.alert/window.confirm,
// matching the look of the logout confirmation in HeaderMenuButton.vue.

export async function showAlert(message, header = '') {
  const alert = await alertController.create({
    header,
    message: String(message),
    buttons: ['ОК'],
  });
  await alert.present();
  await alert.onDidDismiss();
}

// ion-toast positions itself with `:host { position: absolute; top: 0 }` —
// Ionic doesn't stack multiple simultaneous toasts on its own, so back-to-back
// calls (e.g. expiring + debt warnings on load) render exactly on top of each
// other. Track how many are currently up and push each new one down by an
// inline `top` offset (overrides the shadow-DOM default, no ::part needed
// since `top` isn't an exposed part on ion-toast's wrapper).
let openToastCount = 0;
const TOAST_STACK_GAP = 60;

export async function showToast(message, { color = 'warning', duration = 6000 } = {}) {
  const toast = await toastController.create({
    message,
    duration,
    color,
    position: 'top',
    buttons: [{ text: '✕', role: 'cancel' }],
  });
  toast.style.top = `${openToastCount * TOAST_STACK_GAP}px`;
  openToastCount += 1;
  toast.onDidDismiss().then(() => {
    openToastCount = Math.max(0, openToastCount - 1);
  });
  await toast.present();
}

export async function showConfirm(message, { header = '', confirmText = 'Да', cancelText = 'Отмена', destructive = true } = {}) {
  const alert = await alertController.create({
    header,
    message,
    buttons: [
      { text: cancelText, role: 'cancel' },
      { text: confirmText, role: destructive ? 'destructive' : undefined },
    ],
  });
  await alert.present();
  const { role } = await alert.onDidDismiss();
  return role !== 'cancel' && role !== 'backdrop';
}
