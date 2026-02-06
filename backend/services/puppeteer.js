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
    },
    html: "",
    text: ""
  };

  try {
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Extract raw content for AI
    result.html = await page.content();
    result.text = await page.evaluate(() => document.body.innerText);
    
    // Check for trust badges (simplified heuristic: images with keywords)
    const images = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('img, svg')).map(el => {
            const isImg = el.tagName === 'IMG';
            return {
                src: isImg ? el.src : null,
                alt: isImg ? el.alt : (el.getAttribute('aria-label') || el.getAttribute('title')),
                top: el.getBoundingClientRect().top,
                outerHTML: el.outerHTML
            };
        });
    });

    const badgeKeywords = ['trust', 'secure', 'guarantee', 'verified', 'safe', 'payment', 'visa', 'mastercard', 'amex', 'paypal', 'stripe', 'shipping', 'return', 'money back', 'lock', 'shield'];
    
    // Check for text-based trust signals
    const trustTextKeywords = ['free shipping', 'money back', 'secure checkout', 'easy returns', 'warranty', 'satisfaction guarantee', 'privacy policy'];
    const pageText = result.text.toLowerCase();
    const foundTextSignals = trustTextKeywords.filter(k => pageText.includes(k));

    result.trustBadges.badges = images.filter(img => 
        badgeKeywords.some(k => 
            (img.src && img.src.toLowerCase().includes(k)) || 
            (img.alt && img.alt.toLowerCase().includes(k)) ||
            (img.outerHTML && img.outerHTML.toLowerCase().includes(k))
        )
    );
    result.trustBadges.count = result.trustBadges.badges.length;
    result.trustBadges.aboveFold = result.trustBadges.badges.filter(b => b.top < 900); // Increased fold to 900px
    result.trustBadges.textSignals = foundTextSignals; // Pass text signals to scoring

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
