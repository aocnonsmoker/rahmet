import { createRouter, createWebHistory } from '@ionic/vue-router';
import TabsPage from '../views/TabsPage.vue'

const routes = [
  {
    path: '/',
    redirect: '/tabs/spa'
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
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
