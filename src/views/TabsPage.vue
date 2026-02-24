<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
    </ion-tabs>
  </ion-page>
</template>

<script>
import { IonTabBar, IonTabButton, IonTabs, IonLabel, IonIcon, IonPage, IonRouterOutlet } from '@ionic/vue';
import { waterOutline, carOutline, homeOutline, cashOutline, gameControllerOutline } from 'ionicons/icons';
export default {
  name: 'Tabs',
  components: { IonTabBar, IonTabButton, IonTabs, IonLabel, IonIcon, IonPage, IonRouterOutlet },
  data() {
    return {
      triangle: waterOutline,
      ellipse: carOutline,
      square: homeOutline,
      circle: cashOutline,
      game: gameControllerOutline
    }
  }
}
</script>
