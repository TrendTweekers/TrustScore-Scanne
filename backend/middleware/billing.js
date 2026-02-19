const { getShop, getScanCount } = require('../db.js');

const checkBillingMiddleware = async (req, res, next) => {
    try {
        const session = res.locals.shopify.session;
        if (!session) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const shopData = await getShop(session.shop);
        const plan = shopData?.plan || 'FREE';

        // Attach plan to request for downstream use
        req.userPlan = plan;

        // Only restrict the /scan endpoint for now
        // If we had more endpoints, we'd check req.path or apply this middleware only to specific routes
        if (req.path === '/scan' && req.method === 'POST') {
            const scanCount = await getScanCount(session.shop);
            
            console.log(`[Billing Check] Shop: ${session.shop} | Plan: ${plan} | Scans: ${scanCount}`);

            if (plan === 'FREE' && scanCount >= 1) {
                return res.status(403).json({
                    error: 'Free limit reached',
                    requiresUpgrade: true,
                    message: 'You have used your free scan. Upgrade to Pro for unlimited scans.'
                });
            }
        }

        next();
    } catch (error) {
        console.error('Billing middleware error:', error);
        next(error);
    }
};

module.exports = { checkBillingMiddleware };
