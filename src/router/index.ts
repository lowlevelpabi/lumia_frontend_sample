import { createRouter, createWebHistory } from 'vue-router'
import { getAuthState } from '../composables/useAuth'

import HomeView from '../views/home_view.vue'
import ResultsView from '../views/explore_win.vue'
import DetailView from '../views/detail_win.vue'
import LoginView from '../views/auth_win.vue'
import RegisterView from '../views/reg_win.vue'
import ManagementView from '../views/manage_win.vue'
import UploadView from '../views/up_win.vue'
import AboutView from '../views/about_win.vue'
import ProfileView from '../views/profile_win.vue'
import NotFound from '../views/not_found.vue'

const STAFF_ROLES = ['Admin', 'Faculty'] // matches backend UserRole enum

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { title: 'Lumia Discovery' },
    },
    {
      path: '/explore',
      name: 'explore',
      component: ResultsView,
      meta: { title: 'Search Results - Lumia' },
    },
    {
      path: '/paper/:id',
      name: 'detail',
      component: DetailView,
      meta: { title: 'Paper Details - Lumia' },
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { title: 'Login - Lumia' },
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView,
      meta: { title: 'Register - Lumia' },
    },
    {
      path: '/management',
      name: 'management',
      component: ManagementView,
      meta: {
        title: 'Management - Lumia',
        requiresAuth: true,
        requiredRoles: STAFF_ROLES,
      },
    },
    {
      path: '/upload',
      name: 'upload',
      component: UploadView,
      meta: {
        title: 'Upload Research - Lumia',
        requiresAuth: true,
        requiredRoles: STAFF_ROLES,
      },
    },
    {
      path: '/about',
      name: 'about',
      component: AboutView,
      meta: { title: 'About - Lumia' },
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView,
      meta: {
        title: 'My Profile - Lumia',
        requiresAuth: true,
      },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFound,
      meta: { title: 'Not Found - Lumia' },
    },
  ],
})

// ── Navigation Guard ──────────────────────────────────────────────
router.beforeEach((to, _from, next) => {
  // Update page title
  if (to.meta.title) {
    document.title = to.meta.title as string
  }

  const { isLoggedIn, role } = getAuthState()
  const requiresAuth = to.meta.requiresAuth as boolean | undefined
  const requiredRoles = to.meta.requiredRoles as string[] | undefined

  // 1. Route requires authentication
  if (requiresAuth && !isLoggedIn) {
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }

  // 2. Route requires a specific role
  if (requiredRoles && !requiredRoles.includes(role)) {
    return next({ name: 'home' })
  }

  // 3. Already logged-in user visiting login/register — skip to home
  if ((to.name === 'login' || to.name === 'register') && isLoggedIn) {
    return next({ name: 'home' })
  }

  next()
})

export default router
