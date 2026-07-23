import { alertController } from '@ionic/vue';

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
