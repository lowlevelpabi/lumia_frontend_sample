const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'

export interface Paper {
  id: number
  title: string
  author: string
  year: string
  abstract: string
  department: string
  keywords: string
  project_type: string
  degree_program: string
  citation_count: number
  view_count: number
  introduction?: string
  methods?: string
  results?: string
  discussion?: string
  sections?: Record<string, string>
  section_pages?: Record<string, number[]>
  detected_subheadings?: string[]
}

export type PaperMetadata = Omit<Paper, 'id' | 'view_count' | 'citation_count'>
export type PartialPaperMetadata = Partial<PaperMetadata>

export interface SearchResult {
  id: number
  score: number
  payload: {
    title: string
    author: string
    year: string
    abstract: string
    department: string
    project_type: string
    degree_program: string
    citation_count: number
  }
}

// ── Token helpers ────────────────────────────────────────────────

/** Returns token only if it exists and is not expired. Auto-clears stale tokens. */
const getValidToken = (): string | null => {
  const token = localStorage.getItem('token')
  if (!token) return null
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')))
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      localStorage.removeItem('token')
      return null
    }
    return token
  } catch {
    localStorage.removeItem('token')
    return null
  }
}

const getAuthHeaders = (): Record<string, string> => {
  const token = getValidToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * Fetch wrapper for authenticated requests.
 * On 401 (expired/invalid token): clears token and redirects to /login.
 */
async function apiFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init)
  if (response.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
    return new Promise(() => {}) // halt — redirect is in progress
  }
  return response
}

export interface PaperUpdate {
  title?: string
  author?: string
  year?: string
  abstract?: string
  department?: string
  keywords?: string
  project_type?: string
  degree_program?: string
  citation_count?: number
  sections?: Record<string, string>
  section_pages?: Record<string, number[]>
  detected_subheadings?: string[]
}

export interface UserData {
  username: string
  email: string
  password?: string
  role: string
}

export interface UserResponse extends UserData {
  id: number
}

export interface HealthStatus {
  status: 'online' | 'offline'
  details: {
    message?: string
    latency_ms?: number
    points_count?: number
    model?: string
    engine?: string
    collection?: string
    error?: string
  }
}

export type SystemHealth = Record<string, HealthStatus>

export interface SearchParams {
  query: string
  threshold?: number
  author?: string
  year?: string
  minYear?: number
  maxYear?: number
  department?: string
  projectType?: string
  degreeProgram?: string
  section?: string
}

export interface BorrowRecord {
  id: number
  paper_id: number
  user_id: number
  borrow_date: string
  due_date: string
  return_date?: string
  status: 'Borrowed' | 'Returned' | 'Overdue'
}

export interface Penalty {
  id: number
  user_id: number
  borrow_record_id: number
  amount: number
  reason: string
  status: 'Unpaid' | 'Paid'
  created_at: string
}

export interface DashboardStats {
  total_papers: number
  total_theses: number
  total_capstone: number
  active_borrows: number
  total_penalties: number
}

export const api = {
  // Auth
  async login(formData: FormData) {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) throw new Error('Login failed')
    const data = await response.json()
    localStorage.setItem('token', data.access_token)
    return data
  },

  async register(userData: UserData) {
    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Registration failed')
    }
    return response.json()
  },

  logout() {
    localStorage.removeItem('token')
  },

  // Papers Search & Details
  async searchPapers(params: SearchParams): Promise<SearchResult[]> {
    const url = new URL(`${BASE_URL}/papers/search`)
    url.searchParams.append('query', params.query)
    if (params.threshold) url.searchParams.append('threshold', params.threshold.toString())
    if (params.author) url.searchParams.append('author', params.author)
    if (params.year) url.searchParams.append('year', params.year)
    if (params.minYear) url.searchParams.append('min_year', params.minYear.toString())
    if (params.maxYear) url.searchParams.append('max_year', params.maxYear.toString())
    if (params.department) url.searchParams.append('department', params.department)
    if (params.projectType) url.searchParams.append('project_type', params.projectType)
    if (params.degreeProgram) url.searchParams.append('degree_program', params.degreeProgram)
    if (params.section) url.searchParams.append('section', params.section)

    const response = await fetch(url.toString())
    if (!response.ok) throw new Error('Search failed')
    return response.json()
  },

  async getRecommendations(paperId: number): Promise<SearchResult[]> {
    const response = await fetch(`${BASE_URL}/papers/${paperId}/recommendations`)
    if (!response.ok) throw new Error('Failed to fetch recommendations')
    return response.json()
  },

  async getPaperDetails(id: number): Promise<Paper | undefined> {
    const response = await fetch(`${BASE_URL}/papers/${id}`)
    if (!response.ok) return undefined
    return response.json()
  },

  // Management
  async listAllPapers(): Promise<Paper[]> {
    const response = await fetch(`${BASE_URL}/papers/`)
    if (!response.ok) throw new Error('Failed to list papers')
    return response.json()
  },

  async uploadPaper(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiFetch(`${BASE_URL}/papers/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    })
    if (!response.ok) throw new Error('Upload failed')
    return response.json()
  },

  async getUploadPreview(
    file: File,
    autoExtract: boolean = true,
  ): Promise<{
    session_id: string
    metadata: PartialPaperMetadata
    pages: { page_num: number; thumbnail: string; preview_text: string }[]
    sections?: Record<string, string>
    section_pages?: Record<string, number[]>
  }> {
    const formData = new FormData()
    formData.append('file', file)
    const url = new URL(`${BASE_URL}/papers/preview`)
    url.searchParams.append('auto_extract', autoExtract.toString())

    const response = await apiFetch(url.toString(), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    })
    if (!response.ok) throw new Error('Preview failed')
    return response.json()
  },

  async confirmUpload(data: {
    session_id: string
    metadata: PartialPaperMetadata
    selected_pages: number[]
    introduction?: string
    methods?: string
    results?: string
    discussion?: string
  }) {
    const response = await apiFetch(`${BASE_URL}/papers/confirm-upload`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Confirmation failed')
    return response.json()
  },

  async updatePaper(id: number, updates: PaperUpdate) {
    const response = await apiFetch(`${BASE_URL}/papers/${id}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    })
    if (!response.ok) throw new Error('Update failed')
    return response.json()
  },

  async deletePaper(id: number) {
    const response = await apiFetch(`${BASE_URL}/papers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    if (!response.ok) throw new Error('Delete failed')
    return response.json()
  },

  // Engagement
  async viewPaper(id: number): Promise<{ view_count: number }> {
    const response = await fetch(`${BASE_URL}/papers/${id}/view`, { method: 'POST' })
    if (!response.ok) throw new Error('View record failed')
    return response.json()
  },

  async getCiteStatus(id: number): Promise<{ has_cited: boolean; citation_count: number }> {
    const response = await apiFetch(`${BASE_URL}/papers/${id}/cite-status`, {
      headers: getAuthHeaders(),
    })
    if (!response.ok) throw new Error('Cite status failed')
    return response.json()
  },

  async citePaper(id: number): Promise<{ has_cited: boolean; citation_count: number }> {
    const response = await apiFetch(`${BASE_URL}/papers/${id}/cite`, {
      method: 'POST',
      headers: getAuthHeaders(),
    })
    if (!response.ok) throw new Error('Citation failed')
    return response.json()
  },

  async listUsers(): Promise<UserResponse[]> {
    const response = await apiFetch(`${BASE_URL}/users/`, {
      headers: getAuthHeaders(),
    })
    if (!response.ok) throw new Error('Failed to list users')
    return response.json()
  },

  async changeUserRole(userId: number, role: string): Promise<UserResponse> {
    const response = await apiFetch(`${BASE_URL}/users/${userId}/role`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json'},
      body: JSON.stringify({ role}),
    })
    if (!response.ok) throw new Error('Failed to change user role')
      return response.json()
  },

  async getSystemHealth(): Promise<SystemHealth> {
    const response = await apiFetch(`${BASE_URL}/system/health`, {
      headers: getAuthHeaders(),
    })
    if (!response.ok) throw new Error('Failed to fetch system health')
    return response.json()
  },

  // Borrowing & Penalties
  async listBorrowRecords(): Promise<BorrowRecord[]> {
    const response = await apiFetch(`${BASE_URL}/borrowing/`, {
      headers: getAuthHeaders(),
    })
    if (!response.ok) throw new Error('Failed to list borrow records')
    return response.json()
  },

  async createBorrowRecord(data: { paper_id: number; user_id: number; due_date: string }) {
    const response = await apiFetch(`${BASE_URL}/borrowing/`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to create borrow record')
    return response.json()
  },

  async returnBook(recordId: number) {
    const response = await apiFetch(`${BASE_URL}/borrowing/${recordId}/return`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    })
    if (!response.ok) throw new Error('Failed to return book')
    return response.json()
  },

  async listPenalties(): Promise<Penalty[]> {
    const response = await apiFetch(`${BASE_URL}/borrowing/penalties`, {
      headers: getAuthHeaders(),
    })
    if (!response.ok) throw new Error('Failed to list penalties')
    return response.json()
  },

  async payPenalty(penaltyId: number) {
    const response = await apiFetch(`${BASE_URL}/borrowing/penalties/${penaltyId}/pay`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    })
    if (!response.ok) throw new Error('Failed to pay penalty')
    return response.json()
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiFetch(`${BASE_URL}/borrowing/dashboard/stats`, {
      headers: getAuthHeaders(),
    })
    if (!response.ok) throw new Error('Failed to fetch dashboard stats')
    return response.json()
  },
}
