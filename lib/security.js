// Security validation utilities
const jwt = require('jsonwebtoken');

// Allowed origins configuration
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [];

/**
 * Validate request origin and referer
 */
function validateOrigin(req) {
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    
    // Check if origin matches allowed origins
    const isValidOrigin = ALLOWED_ORIGINS.some(allowedOrigin => 
        origin === allowedOrigin || referer?.startsWith(allowedOrigin)
    );
    
    return isValidOrigin;
}

/**
 * Validate user agent (basic browser detection)
 */
function validateUserAgent(req) {
    const userAgent = req.headers['user-agent'];
    
    // Basic check for browser patterns
    if (!userAgent) return false;
    
    // Must contain Mozilla (all modern browsers)
    return userAgent.includes('Mozilla');
}

/**
 * Create client fingerprint for additional security
 */
function createFingerprint(req) {
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const acceptEncoding = req.headers['accept-encoding'] || '';
    
    // Create hash-like fingerprint
    const fingerprint = Buffer.from(
        userAgent + acceptLanguage + acceptEncoding
    ).toString('base64').substring(0, 16);
    
    return fingerprint;
}

/**
 * Rate limiting (simple memory-based)
 */
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 30; // 30 requests per minute

function checkRateLimit(req) {
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || 
                     req.headers['x-real-ip'] || 
                     'unknown';
    
    const now = Date.now();
    const windowStart = Math.floor(now / RATE_LIMIT_WINDOW);
    const key = `${clientIP}-${windowStart}`;
    
    const count = requestCounts.get(key) || 0;
    
    if (count >= RATE_LIMIT_MAX) {
        return false; // Rate limit exceeded
    }
    
    requestCounts.set(key, count + 1);
    
    // Cleanup old entries (every 10 requests)
    if (Math.random() < 0.1) {
        const cutoff = windowStart - 2; // Keep last 2 windows
        for (const [oldKey] of requestCounts) {
            if (oldKey.split('-')[1] < cutoff) {
                requestCounts.delete(oldKey);
            }
        }
    }
    
    return true;
}

/**
 * Generate JWT token
 */
function generateToken(payload) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET not configured');
    }
    
    return jwt.sign(payload, secret, {
        expiresIn: '1h',
        issuer: 'vercel-api-proxy'
    });
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET not configured');
    }
    
    try {
        return jwt.verify(token, secret);
    } catch (error) {
        throw new Error('Invalid token: ' + error.message);
    }
}

/**
 * Complete security validation
 */
function validateRequest(req) {
    // 1. Origin validation
    if (!validateOrigin(req)) {
        throw new Error('Invalid origin');
    }
    
    // 2. User-Agent validation
    if (!validateUserAgent(req)) {
        throw new Error('Invalid user agent');
    }
    
    // 3. Rate limiting
    if (!checkRateLimit(req)) {
        throw new Error('Rate limit exceeded');
    }
    
    return true;
}

module.exports = {
    validateOrigin,
    validateUserAgent,
    createFingerprint,
    checkRateLimit,
    generateToken,
    verifyToken,
    validateRequest
};