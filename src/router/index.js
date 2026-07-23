import { createRouter, createWebHistory } from '@ionic/vue-router';
import AppShell from '@/layouts/AppShell.vue';
import { useAuthStore } from '@/stores/auth';
import { useSectionsStore } from '@/stores/sections';

const routes = [
  {
    path: '/',
    redirect: '/tabs/'
  },
  {
    path: '/login',
    component: () => import('@/views/Login.vue'),
  },
  {
    path: '/subscription-expired',
    component: () => import('@/views/SubscriptionExpired.vue'),
  },
  {
    // Single entry point for both mobile and desktop — AppShell picks the
    // shell (bottom tabs vs sidebar) by viewport width, see useViewportStore.
    path: '/tabs/',
    component: AppShell,
    children: [
      {
        path: 'cash',
        component: () => import('@/views/CashGate.vue'),
        meta: { ownerOnly: true },
      },
      {
        path: 'settings',
        component: () => import('@/views/Settings.vue'),
        meta: { ownerOnly: true },
      },
      {
        // Any other tab, e.g. /tabs/spa, /tabs/karaoke — resolved at runtime
        // against the tenant's sections list (see SectionView.vue), which
        // also picks the mobile/desktop component by viewport width.
        path: ':sectionKey',
        component: () => import('@/views/SectionView.vue'),
      },
    ]
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

const PUBLIC_PATHS = ['/login', '/subscription-expired'];

function firstAccessibleSectionKey(auth, sections) {
  const match = sections.items.find((s) => s.enabled && auth.hasSection(s.key));
  return match ? match.key : null;
}

router.beforeEach(async (to) => {
  const auth = useAuthStore();

  if (PUBLIC_PATHS.includes(to.path)) {
    return true;
  }
  if (!auth.isAuthenticated) {
    return '/login';
  }
  if (!auth.isSubscriptionActive) {
    return '/subscription-expired';
  }

  const sections = useSectionsStore();
  try {
    await sections.load();
  } catch {
    // apiFetch already redirects on 401/402; nothing else to do here.
  }

  if (to.path === '/tabs/' || to.path === '/tabs') {
    const key = firstAccessibleSectionKey(auth, sections);
    return key ? `/tabs/${key}` : (auth.isOwner ? '/tabs/settings' : '/login');
  }
  if (to.meta.ownerOnly && !auth.isOwner) {
    const key = firstAccessibleSectionKey(auth, sections);
    return key ? `/tabs/${key}` : '/login';
  }
  if (to.params.sectionKey && !auth.hasSection(to.params.sectionKey)) {
    const key = firstAccessibleSectionKey(auth, sections);
    return key ? `/tabs/${key}` : '/tabs/settings';
  }
  return true;
});

export default router
