const cron = require('node-cron');
const { getAllShops, getScanHistory } = require('./db');
const { sendWeeklyReport } = require('./services/email');

const initScheduler = () => {
    console.log('[Scheduler] Initializing weekly report cron job...');
    
    // Run every Monday at 9:00 AM
    // Cron syntax: 0 9 * * 1 (Minute Hour DayOfMonth Month DayOfWeek)
    cron.schedule('0 9 * * 1', async () => {
        console.log('[Scheduler] Starting weekly report generation...');
        try {
            const shops = await getAllShops();
            console.log(`[Scheduler] Found ${shops.length} active shops.`);

            for (const shopRow of shops) {
                const shop = shopRow.shop;
                
                // Only send to PRO/PLUS users if we wanted to restrict it, 
                // but user said "Pro only" for the feature.
                if (shopRow.plan === 'FREE') continue;

                try {
                    const history = await getScanHistory(shop);
                    if (history.length > 0) {
                        const currentScan = history[0];
                        const previousScan = history.length > 1 ? history[1] : null;
                        
                        const score = currentScan.score;
                        const trend = previousScan ? score - previousScan.score : 0;

                        console.log(`[Scheduler] Sending report to ${shop} (Score: ${score}, Trend: ${trend})`);
                        await sendWeeklyReport(null, shop, score, trend);
                    }
                } catch (err) {
                    console.error(`[Scheduler] Failed to process shop ${shop}:`, err);
                }
            }
            console.log('[Scheduler] Weekly report generation complete.');
        } catch (error) {
            console.error('[Scheduler] Critical error in weekly report job:', error);
        }
    });
};

module.exports = { initScheduler };
