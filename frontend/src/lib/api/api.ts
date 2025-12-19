/**
 * Backend API Client for RDF Data
 * 
 */

// API base URL - can be overridden via environment variable
const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

/**
 * Check if the backend API is available
 * @returns true if the backend is healthy
 */
export async function checkHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE}/health`);
        return response.ok;
    } catch {
        return false;
    }
}

