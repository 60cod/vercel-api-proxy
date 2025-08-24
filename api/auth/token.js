// JWT Token generation endpoint
const { validateRequest, generateToken, createFingerprint } = require('../../lib/security');

module.exports = (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS?.split(',')[0] || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Validate request security
        validateRequest(req);
        
        // Create client fingerprint
        const fingerprint = createFingerprint(req);
        const origin = req.headers.origin || req.headers.referer;
        
        // Generate JWT token
        const token = generateToken({
            origin: origin,
            fingerprint: fingerprint,
            iat: Math.floor(Date.now() / 1000)
        });
        
        // Success response
        res.status(200).json({
            token: token,
            expiresIn: 3600, // 1 hour
            type: 'Bearer'
        });
        
    } catch (error) {
        console.error('Token generation error:', error.message);
        
        // Return appropriate error status
        if (error.message.includes('Rate limit')) {
            return res.status(429).json({ error: 'Too many requests' });
        }
        
        if (error.message.includes('Invalid origin') || error.message.includes('Invalid user agent')) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        
        return res.status(500).json({ error: 'Internal server error' });
    }
};