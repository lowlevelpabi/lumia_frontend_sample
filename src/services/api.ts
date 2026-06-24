export const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

// ── IMRAD structured block ───────────────────────────────────────────────────
// Produced by the backend's imrad_structure_service at response time.
// The frontend renders these directly — no client-side text parsing needed.
export interface ImradBlock {
  type: "subheading" | "table-label" | "text" | "table-image";
  text: string;
  id?: string; // For 'table-image' type
}

export interface Paper {
  id: string;
  title: string;
  author: string;
  year: string;
  abstract: string;
  department: string;
  keywords: string;
  project_type: string;
  degree_program: string;
  citation_count: number;
  view_count: number;
  introduction?: string;
  methods?: string;
  results?: string;
  discussion?: string;
  references?: string;
  introduction_summary?: string | null;
  methods_summary?: string | null;
  results_summary?: string | null;
  discussion_summary?: string | null;
  // Structured IMRAD blocks — pre-parsed by backend, ready for direct rendering
  imrad_structured?: {
    introduction?: ImradBlock[];
    methods?: ImradBlock[];
    results?: ImradBlock[];
    discussion?: ImradBlock[];
  };
  sections?: Record<string, string>;
  section_pages?: Record<string, number[]>;
  detected_subheadings?: string[];
  trim_points?: Record<string, string>;
  uploaded_by?: string;
  uploader_role?: string;
  media?: Record<string, string>; // Table images/visuals indexed by ID
  is_manuscript?: boolean;
  is_scanned?: boolean;
  // Soft-delete / Recycle Bin
  deleted_at?: string | null;
  deleted_by?: string | null;
  status?: string;
  created_at?: string;
  approved_by?: string;
  approved_at?: string;
}

export type PaperMetadata = Omit<Paper, "id" | "view_count" | "citation_count">;
export type PartialPaperMetadata = Partial<PaperMetadata>;

export interface SearchResult {
  id: string;
  score: number;
  recommendation_reason?: string;
  payload: {
    title: string;
    author: string;
    year: string;
    abstract: string;
    department: string;
    project_type: string;
    degree_program: string;
    citation_count: number;
    created_at?: string;
    uploaded_by?: string;
    uploader_role?: string;
    status?: string;
  };
}

export interface PaginatedSearchResults {
  results: SearchResult[];
  total: number;
  page: number;
  page_size: number;
}

// ── Token helpers ────────────────────────────────────────────────

/** Returns token only if it exists and is not expired. Auto-clears stale tokens. */
const getValidToken = (): string | null => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const payload = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      localStorage.removeItem("token");
      return null;
    }
    return token;
  } catch {
    localStorage.removeItem("token");
    return null;
  }
};

const getAuthHeaders = (): Record<string, string> => {
  const token = getValidToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

import { useToastStore } from "../stores/toast";

const hasAuthHeader = (headers?: HeadersInit): boolean => {
  if (!headers) return false
  if (headers instanceof Headers) {
    return headers.has('Authorization') || headers.has('authorization')
  }
  if (Array.isArray(headers)) {
    return headers.some(([key]) => key.toLowerCase() === 'authorization')
  }
  return Object.keys(headers).some(key => key.toLowerCase() === 'authorization')
}

async function fetchWithToast(input: RequestInfo, init?: RequestInit): Promise<Response> {
  try {
    const response = await fetch(input, init);
    if (!response.ok) {
      const isAuthRequest = hasAuthHeader(init?.headers)
      // Only ignore 401 if it's an authenticated request (which will auto-redirect in apiFetch)
      if (response.status !== 401 || !isAuthRequest) {
        let errorMessage = "An error occurred while fetching data.";
        try {
          const errData = await response.clone().json();
          errorMessage = errData.detail || errData.message || errorMessage;
        } catch {
          try {
            const errText = await response.clone().text();
            if (errText && errText.length < 150) {
              errorMessage = errText;
            }
          } catch {}
        }

        const toastStore = useToastStore();
        toastStore.addToast({
          title: `Data Fetch Failure (${response.status})`,
          description: errorMessage,
          type: "error",
        });
      }
    }
    return response;
  } catch (error: unknown) {
    const toastStore = useToastStore();
    const errMsg =
      error instanceof Error
        ? error.message
        : "Failed to connect to the backend server. The server might be offline.";
    toastStore.addToast({
      title: "Failed to Fetch",
      description: errMsg,
      type: "error",
    });
    throw error;
  }
}

/**
 * Fetch wrapper for authenticated requests.
 * On 401 (expired/invalid token): clears token and redirects to /login.
 */
async function apiFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const response = await fetchWithToast(input, init);
  if (response.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    return new Promise(() => {}); // halt — redirect is in progress
  }
  return response;
}

export interface PaperUpdate {
  title?: string;
  author?: string;
  year?: string;
  abstract?: string;
  department?: string;
  keywords?: string;
  project_type?: string;
  degree_program?: string;
  citation_count?: number;
  sections?: Record<string, string>;
  section_pages?: Record<string, number[]>;
  detected_subheadings?: string[];
  references?: string;
  status?: string;
}

export interface UserData {
  username: string;
  full_name?: string;
  password?: string;
  role: string;
}

export interface UserResponse extends UserData {
  id: string;
  created_at?: string;
  dark_mode?: boolean;
  avatar_url?: string;
}

export interface HealthStatus {
  status: "online" | "offline";
  details: {
    message?: string;
    latency_ms?: number;
    points_count?: number;
    model?: string;
    engine?: string;
    collection?: string;
    error?: string;
  };
}

export type SystemHealth = Record<string, HealthStatus>;

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

export interface SystemInfo {
  version: string;
  academic_year: string;
  release_date: string;
  department: string;
  changelog: ChangelogEntry[];
}

export interface SearchParams {
  query?: string;
  threshold?: number;
  author?: string;
  year?: string;
  minYear?: number;
  maxYear?: number;
  department?: string;
  projectType?: string;
  degreeProgram?: string;
  section?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export interface BorrowRecord {
  id: number;
  paper_id: string;
  user_id: string;
  borrow_date: string;
  due_date: string;
  return_date?: string;
  status: "Borrowed" | "Returned" | "Overdue";
}

export interface Penalty {
  id: number;
  user_id: string;
  borrow_record_id: number;
  amount: number;
  reason: string;
  status: "Unpaid" | "Paid";
  created_at: string;
}

export interface DashboardStats {
  total_papers: number;
  total_theses: number;
  total_capstone: number;
  active_borrows: number;
  total_penalties: number;
}

export interface RepositoryStats {
  total_papers: number;
  by_project_type: Record<string, number>;
  by_program: Record<string, number>;
}

export interface ActivityLog {
  id: number;
  action: "Upload" | "Edit" | "Delete" | "Restore" | "Purge";
  paper_title: string;
  performed_by: string;
  performed_at: string;
  performed_by_role?: string;
}

// ── Sample Documents (System Evaluation Feature) ────────────────────────────
// Returned by GET /papers/sample-documents when ENABLE_SAMPLE_DOCS=true.
// No file bytes are included — only metadata for display.
export interface SampleDocument {
  id: string; // slug used in the fetch URL (e.g. "sample-1")
  name: string; // Human-readable display label
  size_bytes: number;
}

export const api = {
  // Auth
  async login(formData: FormData) {
    const response = await fetchWithToast(`${BASE_URL}/auth/login`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error("Login failed");
    const data = await response.json();
    localStorage.setItem("token", data.access_token);
    return data;
  },

  async register(userData: UserData) {
    const response = await fetchWithToast(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Registration failed");
    }
    return response.json();
  },

  logout() {
    localStorage.removeItem("token");
  },

  // Papers Search & Details
  async searchPapers(params: SearchParams): Promise<PaginatedSearchResults> {
    const url = new URL(`${BASE_URL}/papers/search`);
    if (params.query) url.searchParams.append("query", params.query);
    if (params.threshold) url.searchParams.append("threshold", params.threshold.toString());
    if (params.author) url.searchParams.append("author", params.author);
    if (params.year) url.searchParams.append("year", params.year);
    if (params.minYear) url.searchParams.append("min_year", params.minYear.toString());
    if (params.maxYear) url.searchParams.append("max_year", params.maxYear.toString());
    if (params.department) url.searchParams.append("department", params.department);
    if (params.projectType) url.searchParams.append("project_type", params.projectType);
    if (params.degreeProgram) url.searchParams.append("degree_program", params.degreeProgram);
    if (params.section) url.searchParams.append("section", params.section);
    if (params.sort) url.searchParams.append("sort", params.sort);
    if (params.page) url.searchParams.append("page", params.page.toString());
    if (params.pageSize) url.searchParams.append("page_size", params.pageSize.toString());

    const response = await fetchWithToast(url.toString());
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Search failed");
    }
    return response.json();
  },

  async getSearchConfig(): Promise<{ default_threshold: number }> {
    const response = await fetchWithToast(`${BASE_URL}/papers/search/config`);
    if (!response.ok) throw new Error("Failed to fetch search config");
    return response.json();
  },

  async getRecommendations(paperId: string): Promise<SearchResult[]> {
    const response = await fetchWithToast(`${BASE_URL}/papers/${paperId}/recommendations`);
    if (!response.ok) throw new Error("Failed to fetch recommendations");
    return response.json();
  },

  async getPaperDetails(id: string): Promise<Paper | undefined> {
    const response = await fetchWithToast(`${BASE_URL}/papers/${id}`);
    if (!response.ok) return undefined;
    return response.json();
  },

  // Management
  async listAllPapers(status?: string): Promise<Paper[]> {
    const url = new URL(`${BASE_URL}/papers/`);
    if (status) url.searchParams.append("status", status);
    const response = await fetchWithToast(url.toString());
    if (!response.ok) throw new Error("Failed to list papers");
    return response.json();
  },

  async uploadPaper(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiFetch(`${BASE_URL}/papers/upload`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData,
    });
    if (!response.ok) throw new Error("Upload failed");
    return response.json();
  },

  async getUploadPreview(
    file: File,
    autoExtract: boolean = true,
    sessionId?: string,
  ): Promise<{
    session_id: string;
    metadata: PartialPaperMetadata;
    pages: { page_num: number; thumbnail: string; preview_text: string }[];
    sections?: Record<string, string>;
    sections_summary?: Record<string, string>;
    section_pages?: Record<string, number[]>;
    trim_points?: Record<string, string>;
    media?: Record<string, string>;
    references?: string;
  }> {
    const formData = new FormData();
    formData.append("file", file);
    const url = new URL(`${BASE_URL}/papers/preview`);
    url.searchParams.append("auto_extract", autoExtract.toString());
    if (sessionId) url.searchParams.append("session_id", sessionId);

    const response = await apiFetch(url.toString(), {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.detail && typeof errorData.detail === "object") {
        throw errorData.detail;
      }
      throw new Error(errorData.detail || "Preview failed");
    }
    return response.json();
  },

  async confirmUpload(data: {
    session_id: string;
    metadata: PartialPaperMetadata;
    selected_pages: number[];
    introduction?: string;
    methods?: string;
    results?: string;
    discussion?: string;
    references?: string;
    sections_summary?: Record<string, string>;
    media?: Record<string, string>;
  }) {
    const response = await apiFetch(`${BASE_URL}/papers/confirm-upload`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Confirmation failed");
    return response.json();
  },

  async updatePaper(id: string, updates: PaperUpdate) {
    const response = await apiFetch(`${BASE_URL}/papers/${id}`, {
      method: "PUT",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error("Update failed");
    return response.json();
  },

  async deletePaper(id: string) {
    const response = await apiFetch(`${BASE_URL}/papers/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Delete failed");
    return response.json();
  },

  // Engagement
  async viewPaper(id: string): Promise<{ view_count: number }> {
    const response = await fetchWithToast(`${BASE_URL}/papers/${id}/view`, { method: "POST" });
    if (!response.ok) throw new Error("View record failed");
    return response.json();
  },

  async getCiteStatus(id: string): Promise<{ has_cited: boolean; citation_count: number }> {
    const response = await apiFetch(`${BASE_URL}/papers/${id}/cite-status`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Cite status failed");
    return response.json();
  },

  async citePaper(id: string): Promise<{ has_cited: boolean; citation_count: number }> {
    const response = await apiFetch(`${BASE_URL}/papers/${id}/cite`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Citation failed");
    return response.json();
  },

  async getBookmarkStatus(id: string): Promise<{ is_bookmarked: boolean }> {
    const response = await apiFetch(`${BASE_URL}/papers/${id}/bookmark`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Bookmark status failed");
    return response.json();
  },

  async bookmarkPaper(id: string): Promise<{ is_bookmarked: boolean }> {
    const response = await apiFetch(`${BASE_URL}/papers/${id}/bookmark`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Bookmark toggle failed");
    return response.json();
  },

  async getFormattedCitations(id: string): Promise<{
    apa_6: string;
    apa_7: string;
    apa_intext: string;
  }> {
    const response = await fetchWithToast(`${BASE_URL}/papers/${id}/formatted-citations`);
    if (!response.ok) throw new Error("Failed to fetch citations");
    return response.json();
  },

  async listUsers(): Promise<UserResponse[]> {
    const response = await apiFetch(`${BASE_URL}/users/`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to list users");
    return response.json();
  },

  async changeUserRole(userId: string, role: string): Promise<UserResponse> {
    const response = await apiFetch(`${BASE_URL}/users/${userId}/role`, {
      method: "PATCH",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!response.ok) throw new Error("Failed to change user role");
    return response.json();
  },

  async createStaffUser(userData: {
    username: string;
    full_name: string;
    role: string;
  }): Promise<{ user: UserResponse; password: string }> {
    const response = await apiFetch(`${BASE_URL}/users/staff`, {
      method: "POST",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to create staff user");
    }
    return response.json();
  },

  async getUserMe(): Promise<UserResponse> {
    const response = await apiFetch(`${BASE_URL}/users/me`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch user data");
    return response.json();
  },

  async uploadAvatar(file: File): Promise<UserResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiFetch(`${BASE_URL}/users/me/avatar`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData,
    });
    if (!response.ok) throw new Error("Failed to upload avatar");
    return response.json();
  },

  async getUserCitations(): Promise<Paper[]> {
    const response = await apiFetch(`${BASE_URL}/users/me/citations`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch citations");
    return response.json();
  },

  async getUserBookmarks(): Promise<Paper[]> {
    const response = await apiFetch(`${BASE_URL}/users/me/bookmarks`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch bookmarks");
    return response.json();
  },

  async updatePassword(data: { current_password: string; new_password: string }): Promise<void> {
    const response = await apiFetch(`${BASE_URL}/users/me/password`, {
      method: "PATCH",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error((error as { detail?: string }).detail || "Failed to update password");
    }
  },

  async getSystemHealth(): Promise<SystemHealth> {
    const response = await apiFetch(`${BASE_URL}/system/health`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch system health");
    return response.json();
  },

  async getSystemInfo(): Promise<SystemInfo> {
    const response = await fetchWithToast(`${BASE_URL}/system/info`);
    if (!response.ok) throw new Error("Failed to fetch system info");
    return response.json();
  },

  // Borrowing & Penalties
  async listBorrowRecords(): Promise<BorrowRecord[]> {
    const response = await apiFetch(`${BASE_URL}/borrowing/`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to list borrow records");
    return response.json();
  },

  async createBorrowRecord(data: { paper_id: string; user_id: string; due_date: string }) {
    const response = await apiFetch(`${BASE_URL}/borrowing/`, {
      method: "POST",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create borrow record");
    return response.json();
  },

  async returnBook(recordId: number) {
    const response = await apiFetch(`${BASE_URL}/borrowing/${recordId}/return`, {
      method: "PUT",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to return book");
    return response.json();
  },

  async listPenalties(): Promise<Penalty[]> {
    const response = await apiFetch(`${BASE_URL}/borrowing/penalties`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to list penalties");
    return response.json();
  },

  async payPenalty(penaltyId: number) {
    const response = await apiFetch(`${BASE_URL}/borrowing/penalties/${penaltyId}/pay`, {
      method: "PUT",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to pay penalty");
    return response.json();
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiFetch(`${BASE_URL}/borrowing/dashboard/stats`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch dashboard stats");
    return response.json();
  },

  async updateThemePreference(darkMode: boolean) {
    const response = await apiFetch(`${BASE_URL}/users/me/theme`, {
      method: "PATCH",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ dark_mode: darkMode }),
    });
    if (!response.ok) throw new Error("Failed to update theme preference");
  },

  async getLogs(): Promise<ActivityLog[]> {
    const response = await apiFetch(`${BASE_URL}/logs/`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch logs");
    return response.json();
  },

  async getTrashedPapers(): Promise<Paper[]> {
    const response = await apiFetch(`${BASE_URL}/papers/trash`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch trashed papers");
    return response.json();
  },

  async restorePaper(id: string): Promise<void> {
    const response = await apiFetch(`${BASE_URL}/papers/${id}/restore`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to restore paper");
  },

  async purgePaper(id: string): Promise<void> {
    const response = await apiFetch(`${BASE_URL}/papers/${id}/purge`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to purge paper");
  },

  async getRepositoryStats(): Promise<RepositoryStats> {
    const response = await apiFetch(`${BASE_URL}/papers/stats`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch repository stats");
    return response.json();
  },

  // ── Sample Documents (System Evaluation Feature) ──────────────────────────

  /**
   * Returns the list of pre-stored sample documents (metadata only, no bytes).
   * Returns an empty array when ENABLE_SAMPLE_DOCS=false on the backend.
   */
  async getSampleDocuments(): Promise<SampleDocument[]> {
    const response = await apiFetch(`${BASE_URL}/papers/sample-documents`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) return []; // Gracefully degrade if feature is disabled
    return response.json();
  },

  /**
   * Fetches a pre-stored sample document from the backend and returns it as
   * an in-memory File object — identical to a user-dropped PDF.
   *
   * Privacy: the bytes never touch the browser's storage, download folder,
   * or any blob URL accessible to the user.
   */
  async fetchSampleDocumentAsFile(docId: string, filename: string): Promise<File> {
    const response = await apiFetch(`${BASE_URL}/papers/sample-documents/${docId}/fetch`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch sample document from server.");
    const blob = await response.blob();
    return new File([blob], filename, { type: "application/pdf" });
  },

  async getUploadStatus(sessionId: string): Promise<{
    progress: number;
    message: string;
    status: string;
  }> {
    const response = await apiFetch(`${BASE_URL}/papers/upload/status/${sessionId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch status");
    return response.json();
  },

  async getUserUploads(): Promise<Paper[]> {
    const response = await apiFetch(`${BASE_URL}/papers/my-uploads`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch uploads");
    return response.json();
  },
};
