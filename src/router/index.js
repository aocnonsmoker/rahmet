import { createRouter, createWebHistory } from '@ionic/vue-router';
import TabsPage from '../views/TabsPage.vue'

const routes = [
  {
    path: '/',
    redirect: '/tabs/spa'
  },
  {
    // Public QR menu — no login, not nested under the authenticated tab bar.
    path: '/menu',
    component: () => import('@/views/PublicMenu.vue')
  },
  {
    // Menu admin — standalone, doesn't share the Баня/Автомойка/Гостиница tab bar.
    path: '/menu-admin',
    component: () => import('@/views/Menu.vue')
  },
  {
    // Waiter order-taking — standalone, doesn't share the Баня/Автомойка/Гостиница tab bar.
    path: '/orders',
    component: () => import('@/views/Orders.vue')
  },
  {
    path: '/tabs/',
    component: TabsPage,
    children: [
      {
        path: '',
        redirect: '/tabs/spa'
      },
      {
        path: 'spa',
        component: () => import('@/views/SPA.vue')
      },
      {
        path: 'car',
        component: () => import('@/views/CarWash.vue')
      },
      {
        path: 'cash',
        component: () => import('@/views/Cash.vue')
      },
      {
        path: 'ps',
        component: () => import('@/views/PS.vue')
      },
      {
        path: 'hotel',
        component: () => import('@/views/Hotel.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
