import puppeteer from 'puppeteer';

export async function takeScreenshots(url) {
  const browser = await puppeteer.launch();
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
    emails: [],
    hasReviews: false,
    pageText: '',
    screenshots: {
      desktop: null,
      mobile: null
    }
  };

  try {
    // 1. Desktop View (1920x1080)
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    // Perform Technical Checks
    // Extract domain for email validation
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./, '');
    
    console.log('Starting page analysis...');

    let checkResults = {
      hasContact: false,
      hasAbout: false,
      hasReturnPolicy: false,
      hasPrivacyPolicy: false,
      emails: [],
      rawEmails: [],
      hasReviews: false,
      pageText: '',
      // New Signals
      shipping: { free: false, estimates: false },
      guarantees: { moneyBack: false, warranty: false },
      security: { secureCheckout: false, badges: false },
      socialProof: { customerCount: false, media: false },
      support: { liveChat: false, hours: false }
    };

    try {
      checkResults = await page.evaluate((domain) => {
        const links = Array.from(document.querySelectorAll('a')).map(a => a.href.toLowerCase());
        const bodyText = document.body.innerText;
        const lowerBodyText = bodyText.toLowerCase();
        
        let filteredEmails = [];
        let rawEmails = [];
        let debugInfo = {
          textLength: bodyText.length,
          regexMatches: 0,
          mailtoCount: 0,
          simpleMatches: 0
        };

        // Email Detection Block
        try {
          // Regex for emails - Improved
          const emailRegex = /[\w.+-]+@[\w.-]+\.\w{2,}/gi;
          
          // 1. Search full body text
          const bodyEmails = bodyText.match(emailRegex) || [];
          debugInfo.regexMatches = bodyEmails.length;

          // 2. Search in footer specifically
          const footer = document.querySelector('footer');
          const footerText = footer ? footer.innerText : '';
          const footerEmails = footerText.match(emailRegex) || [];

          // 3. Search in contact sections (heuristic)
          const contactSections = document.querySelectorAll('[class*="contact"], [id*="contact"]');
          let contactText = '';
          contactSections.forEach(section => contactText += ' ' + section.innerText);
          const contactEmails = contactText.match(emailRegex) || [];

          // 4. Check mailto: links
          const mailtoEmails = links
            .filter(l => l.startsWith('mailto:'))
            .map(l => l.replace('mailto:', '').split('?')[0]);
          debugInfo.mailtoCount = mailtoEmails.length;

          // 5. Fallback: Common patterns check (simple string search)
          const commonPrefixes = ['support', 'info', 'hello', 'contact', 'help', 'sales'];
          const simpleEmails = [];
          if (domain) {
             commonPrefixes.forEach(prefix => {
                 const pattern = `${prefix}@${domain}`;
                 if (lowerBodyText.includes(pattern)) {
                     simpleEmails.push(pattern);
                 }
             });
          }
          debugInfo.simpleMatches = simpleEmails.length;

          const allEmails = [...bodyEmails, ...footerEmails, ...contactEmails, ...mailtoEmails, ...simpleEmails];
          
          rawEmails = allEmails;

          // Dedupe, clean, and filter
          const uniqueEmails = [...new Set(allEmails.map(e => e.toLowerCase().trim()))];
          
          filteredEmails = uniqueEmails.filter(email => {
            // Filter out common non-business/automated emails
            if (email.startsWith('noreply') || email.startsWith('no-reply')) return false;
            if (email.startsWith('email@') || email.startsWith('name@')) return false; // Placeholders
            
            // Filter out image/code false positives (if regex is too loose)
            if (/\.(png|jpg|jpeg|gif|svg|webp|js|css|woff|woff2)$/i.test(email)) return false;

            return true;
          });

          // Sort/Prioritize by domain match
          // Emails matching the store domain are preferred
          filteredEmails.sort((a, b) => {
            const aMatch = a.includes(domain);
            const bMatch = b.includes(domain);
            if (aMatch && !bMatch) return -1;
            if (!aMatch && bMatch) return 1;
            return 0;
          });
        } catch (emailError) {
          // Fail silently for email detection to ensure other checks pass
          // We can return the error in a debug field if needed
          console.error('Email detection failed inside evaluate:', emailError); 
          debugInfo.error = emailError.toString();
        }

        // Check for keywords in links or text that indicate specific pages
        const hasContact = links.some(l => l.includes('contact') || l.includes('support'));
        const hasAbout = links.some(l => l.includes('about'));
        const hasReturnPolicy = links.some(l => l.includes('return') || l.includes('refund') || l.includes('policy'));
        const hasPrivacyPolicy = links.some(l => l.includes('privacy'));

        // Check for reviews indicators
        const hasReviews = lowerBodyText.includes('reviews') || 
                           lowerBodyText.includes('★★★★★') || 
                           !!document.querySelector('.stars, .review-widget, [class*="review"], [id*="review"]');

        // --- New Trust Signals ---

        // 1. Shipping Transparency
        const shipping = {
            free: lowerBodyText.includes('free shipping') || lowerBodyText.includes('free delivery'),
            estimates: /\d+\s*-\s*\d+\s*(day|business day|week)/i.test(bodyText) || lowerBodyText.includes('arrives by') || lowerBodyText.includes('estimated delivery')
        };

        // 2. Money-back Guarantee
        const guarantees = {
            moneyBack: lowerBodyText.includes('money back') || lowerBodyText.includes('money-back') || lowerBodyText.includes('refund guarantee'),
            warranty: lowerBodyText.includes('warranty') || lowerBodyText.includes('guarantee') || lowerBodyText.includes('risk-free') || lowerBodyText.includes('risk free')
        };

        // 3. Security Badges (Text/DOM proxies)
        const security = {
            secureCheckout: lowerBodyText.includes('secure checkout') || lowerBodyText.includes('ssl secured') || lowerBodyText.includes('encrypted payment'),
            badges: lowerBodyText.includes('norton') || lowerBodyText.includes('mcafee') || !!document.querySelector('[class*="secure"], [id*="secure"], [class*="lock"]')
        };

        // 4. Social Proof
        const socialProof = {
            customerCount: /\d{1,3}(,\d{3})*\+?\s*(happy|loyal)?\s*customers/i.test(bodyText) || /\d+k\+?\s*customers/i.test(bodyText),
            media: lowerBodyText.includes('featured in') || lowerBodyText.includes('as seen on') || lowerBodyText.includes('press') || !!document.querySelector('[class*="press"], [class*="media"], [id*="press"]')
        };

        // 5. Live Chat / Support
        const support = {
            liveChat: !!document.querySelector('iframe[title*="chat"], #shopify-chat, .intercom-messenger, [id*="launcher"], [class*="chat-widget"]'),
            hours: /\d{1,2}(:\d{2})?\s*(am|pm)?\s*-\s*\d{1,2}(:\d{2})?\s*(am|pm)/i.test(bodyText) || lowerBodyText.includes('support 24/7') || lowerBodyText.includes('24/7 support') || lowerBodyText.includes('response time')
        };

        return {
          hasContact,
          hasAbout,
          hasReturnPolicy,
          hasPrivacyPolicy,
          emails: filteredEmails,
          rawEmails, 
          hasReviews,
          pageText: bodyText,
          debugInfo,
          shipping,
          guarantees,
          security,
          socialProof,
          support
        };
      }, domain);
    } catch (evalError) {
      console.error('Page evaluation failed:', evalError);
      // Fallback is the initial checkResults object
    }
    
    console.log('Email detection complete.');
    if (checkResults.debugInfo) {
        console.log('Email Debug Info:', JSON.stringify(checkResults.debugInfo, null, 2));
    }

    // Populate result with check results
    result.pages.hasContact = checkResults.hasContact;
    result.pages.hasAbout = checkResults.hasAbout;
    result.pages.hasReturnPolicy = checkResults.hasReturnPolicy;
    result.pages.hasPrivacyPolicy = checkResults.hasPrivacyPolicy;
    result.emails = checkResults.emails;
    result.hasReviews = checkResults.hasReviews;
    result.pageText = checkResults.pageText;
    
    // New Signals
    result.shipping = checkResults.shipping;
    result.guarantees = checkResults.guarantees;
    result.security = checkResults.security;
    result.socialProof = checkResults.socialProof;
    result.support = checkResults.support;

    console.log('Raw Emails Found:', checkResults.rawEmails);
    console.log('Final Emails:', result.emails);

    // Detect Trust Badges (Images or Keywords)
    const badgeAnalysis = await page.evaluate(() => {
      const badges = [];
      const debugLogs = [];
      const viewportHeight = window.innerHeight;
      
      // Keywords to match
      const paymentKeywords = ['visa', 'mastercard', 'amex', 'paypal', 'discover', 'maestro', 'stripe', 'apple pay', 'google pay', 'klarna', 'afterpay', 'affirm', 'shopify pay', 'diners club', 'jcb'];
      const trustKeywords = ['secure', 'guarantee', 'verified', 'mcafee', 'norton', 'trustpilot', 'bbb', 'ssl', 'encrypted', 'money back', 'satisfaction'];
      const genericKeywords = ['payment', 'badge', 'seal', 'trust', 'card', 'icon', 'checkout'];
      
      const allKeywords = [...paymentKeywords, ...trustKeywords, ...genericKeywords];
      const socialKeywords = ['facebook', 'twitter', 'instagram', 'youtube', 'tiktok', 'social', 'pinterest', 'linkedin'];

      // Helper to check text against keywords
      const hasKeyword = (text) => {
        if (!text) return false;
        const lower = text.toLowerCase();
        return allKeywords.some(k => lower.includes(k));
      };

      const isSocial = (text) => {
         if (!text) return false;
         const lower = text.toLowerCase();
         return socialKeywords.some(k => lower.includes(k));
      };

      // Check footer visibility
      const footer = document.querySelector('footer');
      const footerRect = footer ? footer.getBoundingClientRect() : null;
      // If footer top is visible within viewport, then everything in footer is effectively "above fold" (visible without scroll)
      const isFooterVisible = footerRect && footerRect.top < viewportHeight;

      // Select potential candidates
      // We look for images, SVGs, and generic containers that might hold badges
      // Expanded selectors to catch more potential elements
      const candidates = document.querySelectorAll('img, svg, .payment-icons img, .trust-badges img, footer img, [class*="payment"] img, [class*="trust"] img');
      
      candidates.forEach(el => {
        const rect = el.getBoundingClientRect();
        
        // Visibility check: must have size and be within reasonable vertical bounds
        if (rect.width < 10 || rect.height < 10 || rect.top < -100) return;

        let isBadge = false;
        let reason = '';
        const type = el.tagName.toLowerCase();
        
        // Safely get attributes
        const src = (el.src || '').toLowerCase();
        const alt = (el.getAttribute('alt') || '').toLowerCase();
        const title = (el.getAttribute('title') || '').toLowerCase();
        const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
        
        // Handle className for SVG vs HTML
        let className = '';
        if (el.classList && el.classList.value) {
            className = el.classList.value;
        } else if (el.className instanceof SVGAnimatedString) {
            className = el.className.baseVal;
        } else {
            className = String(el.className);
        }
        className = className.toLowerCase();

        const id = (el.id || '').toLowerCase();
        
        // Parent context
        const parent = el.parentElement;
        let parentClass = '';
        if (parent) {
             if (parent.classList && parent.classList.value) parentClass = parent.classList.value;
             else if (parent.className instanceof SVGAnimatedString) parentClass = parent.className.baseVal;
             else parentClass = String(parent.className);
        }
        parentClass = parentClass.toLowerCase();

        // Combined text for checking
        const combinedText = `${alt} ${title} ${ariaLabel} ${className} ${id} ${src}`;

        // Skip if social media icon
        if (isSocial(combinedText)) return;

        // Check 1: Direct Keyword Match in Attributes
        if (hasKeyword(combinedText)) {
            isBadge = true;
            reason = 'keyword_match';
        }
        
        // Check 2: Parent Container Context
        if (!isBadge && (hasKeyword(parentClass) || (el.closest && (el.closest('[class*="payment"]'), el.closest('[class*="trust"]'))))) {
            isBadge = true;
            reason = 'container_context';
        }

        // Check 3: Footer Heuristic (loosest check)
        // If in footer, small-ish, and not social, assume it might be a payment icon if it looks like one (ratio)
        const inFooter = !!el.closest('footer');
        if (!isBadge && inFooter) {
             // Payment icons are usually rectangular (wider than tall) or square
             // Avoid huge hero images in footer
             if (rect.width < 150 && rect.height < 100) {
                 // Additional heuristic: many payment icons are in a list/row
                 const siblings = parent ? parent.querySelectorAll('img, svg').length : 0;
                 if (siblings > 1) {
                     isBadge = true;
                     reason = 'footer_heuristic_list';
                 } else if (hasKeyword(src) || hasKeyword(alt)) {
                     // Even if single, if it has a keyword
                     isBadge = true;
                     reason = 'footer_heuristic_keyword';
                 }
             }
        }

        if (isBadge) {
             // Deduplicate by src/alt/rect to avoid counting same badge multiple times if multiple selectors hit it
             const isDuplicate = badges.some(b => 
                 (b.src && b.src === src && src !== '') || 
                 (b.alt && b.alt === alt && alt !== '') ||
                 (Math.abs(b.top - rect.top) < 5 && Math.abs(b.left - rect.left) < 5)
             );

             if (!isDuplicate) {
                 // Calculate above fold status
                 // We use the full viewport height (generous definition of fold)
                 // Also count if it's in a visible footer
                 const isAboveFold = rect.top < viewportHeight || (inFooter && isFooterVisible);

                 debugLogs.push(`Badge [${src.substring(0,30)}...] at Y=${Math.round(rect.top)}, viewport=${viewportHeight}, aboveFold=${isAboveFold}`);

                 badges.push({
                   type,
                   src: src.length > 50 ? src.substring(0, 50) + '...' : src,
                   alt,
                   top: rect.top,
                   left: rect.left,
                   isAboveFold,
                   reason
                 });
             }
        }
      });

      return { badges, debugLogs };
    });

    result.trustBadges.badges = badgeAnalysis.badges;
    result.trustBadges.aboveFold = badgeAnalysis.badges.filter(b => b.isAboveFold);
    result.trustBadges.count = badgeAnalysis.badges.length;
    
    // Log detected badges for debugging
    console.log('Badge Debug Logs:', badgeAnalysis.debugLogs);
    console.log('Detected Badges:', JSON.stringify(badgeAnalysis.badges, null, 2));

    result.screenshots.desktop = await page.screenshot({ encoding: 'base64' });

    // 2. Mobile View (iPhone X: 375x812)
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    result.screenshots.mobile = await page.screenshot({ encoding: 'base64' });

    // --- Product Page Analysis ---
    console.log('Starting Product Page Analysis...');
    let productData = {
      found: false,
      url: null,
      reviewsVisible: false,
      trustBadges: false,
      returnPolicy: false,
      sizeGuide: false,
      inStock: false,
      imageQuality: false, // multiple images
      screenshots: {
        desktop: null,
        mobile: null
      }
    };

    try {
      // Find a product link
      const productLink = await page.evaluate(() => {
        // Look for links containing /products/
        const links = Array.from(document.querySelectorAll('a[href*="/products/"]'));
        if (links.length > 0) {
           // Prioritize links that are likely actual products (have images or prices inside)
           // or just take the first one that isn't empty
           return links[0].href;
        }
        return null;
      });

      if (productLink) {
        console.log('Navigating to product page:', productLink);
        productData.found = true;
        productData.url = productLink;

        // Reset viewport to desktop
        await page.setViewport({ width: 1920, height: 1080, isMobile: false, hasTouch: false });
        await page.goto(productLink, { waitUntil: 'networkidle0' });

        // Analyze Product Page
        const analysis = await page.evaluate(() => {
           const bodyText = document.body.innerText.toLowerCase();
           
           // Reviews
           const reviewsVisible = bodyText.includes('review') || 
                                  !!document.querySelector('.stars, .review-widget, [class*="review"], [id*="review"], [class*="rating"]');

           // Trust Badges near Add to Cart
           // Look for payment icons or trust words near the form
           const form = document.querySelector('form[action*="/cart/add"]');
           let trustBadges = false;
           if (form) {
             const formText = form.innerText.toLowerCase();
             const formHtml = form.innerHTML.toLowerCase();
             trustBadges = formText.includes('secure') || 
                           formText.includes('guarantee') || 
                           formHtml.includes('svg') || 
                           formHtml.includes('img'); 
             // Logic can be improved to be more specific to badges
             if (!trustBadges) {
                // Check siblings of the form
                const parent = form.parentElement;
                if (parent) {
                    const parentText = parent.innerText.toLowerCase();
                    trustBadges = parentText.includes('secure') || parentText.includes('guarantee') || parent.querySelector('img[src*="payment"], img[src*="badge"]');
                }
             }
           }
           // General fallback if form not found or specific check failed
           if (!trustBadges) {
              trustBadges = !!document.querySelector('.payment-icons, [class*="trust"], [class*="badge"], img[alt*="visa"], img[alt*="mastercard"]');
           }

           // Return Policy
           const returnPolicy = bodyText.includes('return policy') || 
                                bodyText.includes('shipping & returns') || 
                                bodyText.includes('money back') ||
                                !!document.querySelector('a[href*="policy"], a[href*="return"]');

           // Size Guide / Details
           const sizeGuide = bodyText.includes('size guide') || 
                             bodyText.includes('size chart') || 
                             bodyText.includes('dimensions') ||
                             bodyText.includes('specifications') ||
                             bodyText.includes('description');

           // In Stock
           const inStock = bodyText.includes('in stock') || 
                           !bodyText.includes('sold out') || 
                           !!document.querySelector('[class*="stock"]'); // Simple heuristic

           // Image Quality (Multiple Images)
           const images = document.querySelectorAll('img[src*="/products/"], .product-single__photo, .product__image');
           // Filter out tiny thumbnails
           const distinctImages = Array.from(images).filter(img => img.naturalWidth > 100);
           const imageQuality = distinctImages.length > 1;

           return {
             reviewsVisible,
             trustBadges,
             returnPolicy,
             sizeGuide,
             inStock,
             imageQuality
           };
        });

        productData = { ...productData, ...analysis };

        // Screenshots
        productData.screenshots.desktop = await page.screenshot({ encoding: 'base64' });
        await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
        productData.screenshots.mobile = await page.screenshot({ encoding: 'base64' });
      } else {
        console.log('No product link found on homepage.');
      }
    } catch (prodError) {
       console.error('Product page analysis failed:', prodError);
    }
    
    result.productPage = productData;

  } catch (error) {
    console.error('Puppeteer error:', error);
  } finally {
    await browser.close();
  }

  console.log('--- Puppeteer Scan Complete ---');
  console.log('Returning Data:', JSON.stringify({
    url: result.url,
    trustBadgesCount: result.trustBadges.count,
    pages: result.pages,
    emails: result.emails,
    hasReviews: result.hasReviews
  }, null, 2));

  return result;
}
