// DeepL Translation proxy
const { validateRequest, verifyToken } = require('../lib/security');

module.exports = async (req, res) => {
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
        
        // Check if DeepL API key is configured
        const apiKey = process.env.DEEPL_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'DeepL API key not configured' });
        }
        
        // Parse request body
        const { text, target_lang, source_lang } = req.body;
        
        if (!text || !target_lang) {
            return res.status(400).json({ 
                error: 'Missing required parameters: text, target_lang' 
            });
        }
        
        // Prepare DeepL API request
        const deeplUrl = 'https://api-free.deepl.com/v2/translate';
        const formData = new URLSearchParams();
        formData.append('text', text);
        formData.append('target_lang', target_lang);
        if (source_lang) {
            formData.append('source_lang', source_lang);
        }
        
        // Call DeepL API
        const deeplResponse = await fetch(deeplUrl, {
            method: 'POST',
            headers: {
                'Authorization': `DeepL-Auth-Key ${apiKey}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        });
        
        if (!deeplResponse.ok) {
            throw new Error(`DeepL API error: ${deeplResponse.status}`);
        }
        
        const translationData = await deeplResponse.json();
        
        // Success response
        res.status(200).json({
            translations: translationData.translations,
            source_lang: translationData.translations[0]?.detected_source_language,
            provider: 'deepl'
        });
        
    } catch (error) {
        console.error('DeepL proxy error:', error.message);
        
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
        
        if (error.message.includes('DeepL API error')) {
            return res.status(502).json({ error: 'Translation service error' });
        }
        
        return res.status(500).json({ error: 'Internal server error' });
    }
};