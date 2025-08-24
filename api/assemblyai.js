// AssemblyAI WebSocket URL proxy
const { validateRequest, verifyToken } = require('../lib/security');

module.exports = (req, res) => {
    // CORS headers
    const allowedOrigin = process.env.ALLOWED_ORIGINS?.split(',')[0] || '*';
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Basic security validation
        validateRequest(req);
        
        // JWT token validation (optional for backward compatibility)
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            const decoded = verifyToken(token);
            console.log('Valid token from:', decoded.origin);
        }
        
        // Check if AssemblyAI API key is configured
        const apiKey = process.env.ASSEMBLYAI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'AssemblyAI API key not configured' });
        }
        
        // Generate AssemblyAI WebSocket URL
        const wsUrl = `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${encodeURIComponent(apiKey)}`;
        
        // Success response
        res.status(200).json({
            wsUrl: wsUrl,
            expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
            provider: 'assemblyai'
        });
        
    } catch (error) {
        console.error('AssemblyAI proxy error:', error.message);
        
        // Return appropriate error status
        if (error.message.includes('Rate limit')) {
            return res.status(429).json({ error: 'Too many requests' });
        }
        
        if (error.message.includes('Invalid token')) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        
        if (error.message.includes('Invalid origin') || error.message.includes('Invalid user agent')) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        
        return res.status(500).json({ error: 'Internal server error' });
    }
};