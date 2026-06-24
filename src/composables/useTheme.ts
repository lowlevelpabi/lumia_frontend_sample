import { ref, onMounted } from 'vue'
import { api } from '../services/api'

// Shared global state to sync theme across all components
const isDark = ref(false)

export function useTheme() {

  const toggleTheme = async () => {
    isDark.value = !isDark.value
    applyTheme()
    
    // Always store in session storage for current tab persistence
    sessionStorage.setItem('theme', isDark.value ? 'dark' : 'light')
    
    // Sync with DB if user is logged in
    if (localStorage.getItem('token')) {
      // For logged-in users, we also store a hint in localStorage to prevent 
      // the "light flash" when opening new tabs.
      localStorage.setItem('theme_hint', isDark.value ? 'dark' : 'light')
      try {
        await api.updateThemePreference(isDark.value)
      } catch (e) {
        console.error('Failed to sync theme preference:', e)
      }
    }
  }

  const setTheme = (dark: boolean) => {
    isDark.value = dark
    applyTheme()
    sessionStorage.setItem('theme', dark ? 'dark' : 'light')
    if (localStorage.getItem('token')) {
      localStorage.setItem('theme_hint', dark ? 'dark' : 'light')
    }
  }

  const resetTheme = () => {
    isDark.value = false
    applyTheme()
    sessionStorage.removeItem('theme')
    localStorage.removeItem('theme_hint')
  }

  const applyTheme = () => {
    if (isDark.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  onMounted(() => {
    const savedTheme = sessionStorage.getItem('theme')
    const themeHint = localStorage.getItem('theme_hint')
    const hasToken = localStorage.getItem('token')

    if (savedTheme) {
      // Use current session preference first
      isDark.value = savedTheme === 'dark'
    } else if (hasToken && themeHint) {
      // If logged in, use the persistent hint to prevent flickering
      isDark.value = themeHint === 'dark'
    } else {
      // Guest users default to light mode
      isDark.value = false
    }
    applyTheme()
  })

  return {
    isDark,
    toggleTheme,
    setTheme,
    resetTheme
  }
}
