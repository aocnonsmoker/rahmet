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
        path: 'tab2',
        component: () => import('@/views/CarWash.vue')
      },
      {
        path: 'tab3',
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
