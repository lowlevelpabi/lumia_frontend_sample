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
    { path: '/', name: 'home', component: HomeView },
    { path: '/results', name: 'results', component: ResultsView },
    { path: '/paper/:id', name: 'detail', component: DetailView },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/register', name: 'register', component: RegisterView },
    { path: '/management', name: 'management', component: ManagementView },
    { path: '/upload', name: 'upload', component: UploadView },
  ],
})

export default router
