/**
 * useAuth — shared auth composable for Lumia
 *
 * Decodes the JWT stored in localStorage to expose role-based flags.
 * No extra API call required — the role is embedded in the token payload.
 *
 * Roles (match backend UserRole enum exactly):
 *   "Admin"   — UserRole.ADMIN   — full access
 *   "Faculty" — UserRole.FACULTY — upload + repository, NO user manager
 *   "User"    — UserRole.USER    — student, public access only
 */

import { computed } from 'vue'

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

function getTokenPayload(): Record<string, unknown> | null {
  const token = localStorage.getItem('token')
  if (!token) return null
  const payload = decodeToken(token)
  if (!payload) {
    localStorage.removeItem('token')
    return null
  }
  // Auto-clear if expired (exp is Unix seconds)
  if (payload.exp && Date.now() / 1000 > (payload.exp as number)) {
    localStorage.removeItem('token')
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
  const isAdmin   = computed(() => userRole.value === 'Admin')
  const isFaculty = computed(() => userRole.value === 'Faculty')
  const isStudent = computed(() => userRole.value === 'User')

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
    return(payload?.full_name as string) ?? ''
  })

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
  }
}

// ── Standalone helper for router guard (outside component context) ─
export function getAuthState(): { isLoggedIn: boolean; role: string } {
  const payload = getTokenPayload()  // already clears expired tokens
  if (!payload) return { isLoggedIn: false, role: '' }
  return {
    isLoggedIn: true,
    role: (payload.role as string) ?? '',
  }
}
