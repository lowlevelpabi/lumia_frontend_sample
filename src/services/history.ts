const MAX_HISTORY = 10;
const HISTORY_KEY = 'lumia_search_history';

export const historyService = {
  saveQuery(query: string) {
    if (!query || query.trim().length === 0) return;
    
    let history = this.getHistory();
    const cleanQuery = query.trim();
    
    // Remove if already exists (to move it to top)
    history = history.filter(q => q.toLowerCase() !== cleanQuery.toLowerCase());
    
    // Add to top
    history.unshift(cleanQuery);
    
    // Limit size
    if (history.length > MAX_HISTORY) {
      history = history.slice(0, MAX_HISTORY);
    }
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  },

  getHistory(): string[] {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse search history', e);
      return [];
    }
  },

  clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
  },

  removeQuery(query: string) {
    let history = this.getHistory();
    history = history.filter(q => q !== query);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }
};
