/**
 * useAuth — shared auth composable for Lumia
 *
 * Decodes the JWT stored in localStorage to expose role-based flags.
 * No extra API call required — the role is embedded in the token payload.
 *
 * Roles (match backend UserRole enum exactly):
 *   "Admin"   — UserRole.ADMIN   — full access
 *   "Faculty" — UserRole.FACULTY — upload + repository, NO user manager
 *   "Student" — UserRole.STUDENT — student, public access only
 */

import { computed, ref } from 'vue'

// ── JWT decode (no library needed — just base64 the payload) ─────
function decodeToken(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

// ── Shared Reactive State ─────────────────────────────────────────
// This ref is shared across all useAuth calls to ensure UI sync
const globalToken = ref<string | null>(localStorage.getItem('token'))

function getTokenPayload(): Record<string, unknown> | null {
  const token = globalToken.value
  if (!token) return null
  const payload = decodeToken(token)
  if (!payload) {
    localStorage.removeItem('token')
    globalToken.value = null
    return null
  }
  // Auto-clear if expired (exp is Unix seconds)
  if (payload.exp && Date.now() / 1000 > (payload.exp as number)) {
    localStorage.removeItem('token')
    globalToken.value = null
    return null
  }
  return payload
}

// ── Composable ────────────────────────────────────────────────────
export function useAuth() {
  const isLoggedIn = computed(() => getTokenPayload() !== null)

  const userRole = computed<string>(() => {
    const payload = getTokenPayload()
    // Backend stores role in "role" claim
    return (payload?.role as string) ?? ''
  })

  // Exact match against backend UserRole enum values
  const isAdmin = computed(() => userRole.value === 'Admin')
  const isFaculty = computed(() => userRole.value === 'Faculty')
  const isStudent = computed(() => userRole.value === 'Student')

  // Staff = anyone allowed into the management dashboard
  const isStaff = computed(() => isAdmin.value || isFaculty.value)

  // Admin-only: user manager, role changes
  const canManageUsers = computed(() => isAdmin.value)

  // Staff can upload and manage papers
  const canUpload = computed(() => isStaff.value)

  const username = computed<string>(() => {
    const payload = getTokenPayload()
    return (payload?.sub as string) ?? ''
  })

  const fullName = computed<string>(() => {
    const payload = getTokenPayload()
    return (payload?.full_name as string) ?? ''
  })

  /**
   * Manual refresh from localStorage (useful after login/logout 
   * in components that aren't destroyed/re-mounted)
   */
  const refreshAuth = () => {
    globalToken.value = localStorage.getItem('token')
  }

  return {
    isLoggedIn,
    username,
    fullName,
    userRole,
    isAdmin,
    isFaculty,
    isStudent,
    isStaff,
    canManageUsers,
    canUpload,
    refreshAuth,
  }
}

// ── Standalone helper for router guard (outside component context) ─
export function getAuthState(): { isLoggedIn: boolean; role: string } {
  const payload = getTokenPayload() // already clears expired tokens
  if (!payload) return { isLoggedIn: false, role: '' }
  return {
    isLoggedIn: true,
    role: (payload.role as string) ?? '',
  }
}
