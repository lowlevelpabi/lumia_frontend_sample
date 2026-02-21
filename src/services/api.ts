const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'

export interface Paper {
  id: number
  title: string
  author: string
  year: string
  abstract: string
  department: string
  keywords: string
  citation_count: number
}

export interface SearchResult {
  id: number
  score: number
  payload: {
    title: string
    author: string
    year: string
    abstract: string
    department: string
    citation_count: number
  }
}

// Token helper
const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

export interface PaperUpdate {
  title?: string
  author?: string
  year?: string
  abstract?: string
  department?: string
  keywords?: string
  citation_count?: number
}

export interface UserData {
  username: string
  email: string
  password?: string
  role: string
}

export interface SearchParams {
  query: string
  threshold?: number
  author?: string
  year?: string
  minYear?: number
  department?: string
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
    if (params.department) url.searchParams.append('department', params.department)

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
    const response = await fetch(`${BASE_URL}/papers/`)
    if (!response.ok) throw new Error('Failed to fetch details')
    const papers: Paper[] = await response.json()
    return papers.find(p => p.id === id)
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
    const response = await fetch(`${BASE_URL}/papers/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    })
    if (!response.ok) throw new Error('Upload failed')
    return response.json()
  },

  async updatePaper(id: number, updates: PaperUpdate) {
    const response = await fetch(`${BASE_URL}/papers/${id}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates),
    })
    if (!response.ok) throw new Error('Update failed')
    return response.json()
  },

  async deletePaper(id: number) {
    const response = await fetch(`${BASE_URL}/papers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    if (!response.ok) throw new Error('Delete failed')
    return response.json()
  }
}
