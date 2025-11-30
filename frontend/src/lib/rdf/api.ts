/**
 * Backend API Client for RDF Data
 * 
 * Provides a single function to fetch RDF graphs from the FastAPI backend.
 * The backend serves data from the Tentris triple store as Turtle (TTL) format.
 * 
 * Uses targeted fetching with optional targetClass filter to minimize
 * the number of triples transferred to the frontend.
 */

// API base URL - can be overridden via environment variable
const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

/** Graph types available from the backend */
export type GraphName = 'home' | 'data' | 'shapes';

/** Options for fetching a graph */
export interface FetchGraphOptions {
    /** Filter by target class (e.g., 'schema:BlogPosting' or full IRI) */
    targetClass?: string;
}

/**
 * Fetch a named graph from the backend
 * 
 * @param name - Graph name: 'home', 'data', or 'shapes'
 * @param options - Optional parameters including targetClass filter
 * @returns Turtle string containing the requested graph
 * 
 * @example
 * // Fetch home graph (entry point)
 * const homeTurtle = await fetchGraph('home');
 * 
 * @example
 * // Fetch shapes for a specific class
 * const shapeTurtle = await fetchGraph('shapes', { targetClass: 'schema:BlogPosting' });
 * 
 * @example
 * // Fetch data instances of a specific type
 * const dataTurtle = await fetchGraph('data', { targetClass: 'schema:BlogPosting' });
 */
export async function fetchGraph(
    name: GraphName,
    options?: FetchGraphOptions
): Promise<string> {
    const url = new URL(`${API_BASE}/sparql/graphs/${name}`);
    
    if (options?.targetClass) {
        url.searchParams.set('target_class', options.targetClass);
    }
    
    const response = await fetch(url.toString(), {
        headers: {
            'Accept': 'text/turtle',
        },
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch graph '${name}': ${response.status} ${response.statusText}`);
    }
    
    return response.text();
}

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

