const puppeteer = require('puppeteer');

async function takeScreenshots(url) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
  });
  const page = await browser.newPage();
  
  const result = {
    url: url,
    isSSL: url.toLowerCase().startsWith('https'),
    trustBadges: {
      count: 0,
      badges: [],
      aboveFold: []
    },
    pages: {
      hasContact: false,
      hasAbout: false,
      hasReturnPolicy: false,
      hasPrivacyPolicy: false
    },
    screenshots: {
        desktop: null,
        mobile: null
    }
  };

  try {
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Check for trust badges (simplified heuristic: images with keywords)
    const images = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('img')).map(img => ({
            src: img.src,
            alt: img.alt,
            top: img.getBoundingClientRect().top
        }));
    });

    const badgeKeywords = ['trust', 'secure', 'guarantee', 'verified', 'safe', 'payment'];
    result.trustBadges.badges = images.filter(img => 
        badgeKeywords.some(k => (img.src && img.src.includes(k)) || (img.alt && img.alt.toLowerCase().includes(k)))
    );
    result.trustBadges.count = result.trustBadges.badges.length;
    result.trustBadges.aboveFold = result.trustBadges.badges.filter(b => b.top < 800); // Assume 800px fold

    // Check for key pages in links
    const links = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => a.href.toLowerCase()));
    result.pages.hasContact = links.some(l => l.includes('contact'));
    result.pages.hasAbout = links.some(l => l.includes('about'));
    result.pages.hasReturnPolicy = links.some(l => l.includes('return') || l.includes('refund'));
    result.pages.hasPrivacyPolicy = links.some(l => l.includes('privacy'));

    // Take Desktop Screenshot
    await page.setViewport({ width: 1280, height: 800 });
    const desktopBuffer = await page.screenshot({ encoding: 'base64', fullPage: false });
    result.screenshots.desktop = desktopBuffer;

    // Take Mobile Screenshot
    // await page.setViewport({ width: 375, height: 667, isMobile: true });
    // const mobileBuffer = await page.screenshot({ encoding: 'base64', fullPage: false });
    // result.screenshots.mobile = mobileBuffer;

  } catch (error) {
    console.error("Puppeteer error:", error);
  } finally {
    await browser.close();
  }

  return result;
}

module.exports = { takeScreenshots };
