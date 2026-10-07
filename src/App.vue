<script setup>
import { RouterLink, RouterView, useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <nav class="business-menu" aria-label="เลือกธุรกิจ">
    <span class="business-menu-label">ธุรกิจ</span>
    <RouterLink to="/" class="business-menu-link" :class="{ selected: route.path === '/' || route.path === '/history' }">
      <span aria-hidden="true">▦</span> Idealglobe
    </RouterLink>
    <RouterLink to="/horoscope" class="business-menu-link horoscope-link" :class="{ selected: route.path === '/horoscope' }">
      <span aria-hidden="true">✦</span> ดวง
    </RouterLink>
  </nav>
  <RouterView />
</template>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
}
body {
  margin: 0;
  padding: 0;
}
.business-menu {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.business-menu-label { color: #64748b; font-size: 12px; margin-right: 6px; }
.business-menu-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  color: #475569;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
}
.business-menu-link:hover { background: #f8fafc; }
.business-menu-link.selected { background: #e8f4f2; border-color: #0a6b5e; color: #0a6b5e; }
.horoscope-link.selected { background: #f3e8ff; border-color: #7c3aed; color: #6d28d9; }
.business-menu-link:focus-visible { outline: 3px solid #a78bfa; outline-offset: 3px; }
@media (max-width: 480px) {
  .business-menu { padding: 10px 14px; gap: 8px; }
  .business-menu-link { padding: 9px 12px; }
}
</style>
