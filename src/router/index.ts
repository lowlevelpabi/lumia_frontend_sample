import { createRouter, createWebHistory } from 'vue-router'

import HomeView from '../views/home_view.vue'
import ResultsView from '../views/result_win.vue'
import DetailView from '../views/detail_win.vue'
import LoginView from '../views/auth_win.vue'
import RegisterView from '../views/reg_win.vue'
import ManagementView from '../views/manage_win.vue'
import UploadView from '../views/up_win.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { title: 'Home - Lumia' }
    },
    {
      path: '/results',
      name: 'results',
      component: ResultsView,
      meta: { title: 'Search Results - Lumia' }
    },
    {
      path: '/paper/:id',
      name: 'detail',
      component: DetailView,
      meta: { title: 'Paper Details - Lumia' }
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { title: 'Login - Lumia' }
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView,
      meta: { title: 'Register - Lumia' }
    },
    {
      path: '/management',
      name: 'management',
      component: ManagementView,
      meta: { title: 'Management - Lumia' }
    },
    {
      path: '/upload',
      name: 'upload',
      component: UploadView,
      meta: { title: 'Upload Research - Lumia' }
    },
  ],
})

// Navigation Guard to update page title
router.beforeEach((to, from, next) => {
  const title = to.meta.title as string
  if (title) {
    document.title = title
  }
  next()
})

export default router
