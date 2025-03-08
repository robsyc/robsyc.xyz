/**
 * CORS utilities for content negotiation
 * Provides functions for generating CORS headers
 */

// Generate common CORS headers for all responses
export function getCorsHeaders(): Record<string, string> {
    return {
        'Access-Control-Allow-Origin': '*', // Allow requests from any origin
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
        'Access-Control-Max-Age': '86400' // 24 hours
    };
} 