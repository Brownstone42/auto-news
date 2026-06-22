import { createRouter, createWebHistory } from 'vue-router'
import GeneratorView from '@/views/GeneratorView.vue'
import HistoryView from '@/views/HistoryView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: GeneratorView },
    { path: '/history', component: HistoryView },
  ],
})

export default router
