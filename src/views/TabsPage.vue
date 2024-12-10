<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="tab1" href="/tabs/spa">
          <ion-icon aria-hidden="true" :icon="triangle" />
          <ion-label>Баня</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="tab2" href="/tabs/car">
          <ion-icon aria-hidden="true" :icon="ellipse" />
          <ion-label>Автомойка</ion-label>
        </ion-tab-button>

        <ion-tab-button disabled tab="tab3" href="/tabs/tab3">
          <ion-icon aria-hidden="true" :icon="square" />
          <ion-label>Гостиница</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="tab3" href="/tabs/cash">
          <ion-icon aria-hidden="true" :icon="circle" />
          <ion-label>Касса</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script>
import { IonTabBar, IonTabButton, IonTabs, IonLabel, IonIcon, IonPage, IonRouterOutlet } from '@ionic/vue';
import { waterOutline, carOutline, homeOutline, cashOutline } from 'ionicons/icons';
export default {
  name: 'Tabs',
  components: { IonTabBar, IonTabButton, IonTabs, IonLabel, IonIcon, IonPage, IonRouterOutlet },
  data() {
    return {
      triangle: waterOutline,
      ellipse: carOutline,
      square: homeOutline,
      circle: cashOutline
    }
  }
}
</script>
