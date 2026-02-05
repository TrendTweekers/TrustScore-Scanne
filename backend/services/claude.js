import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const analyzeStoreWithClaude = async (screenshots, textData) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY is missing. Skipping AI analysis.');
    return null;
  }

  try {
    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are an expert e-commerce conversion rate optimization (CRO) specialist. Analyze the provided screenshots of an online store (Homepage and potentially Product Page).
            
            Based on the visual design and content, provide a qualitative assessment in JSON format with the following fields:
            - "designScore": A number between 1-10 rating the professionalism of the design.
            - "assessment": A 2-3 paragraph qualitative assessment of the store's trustworthiness, copy quality, and layout.
            - "priorityFixes": An array of strings containing the top 3 priority fixes in plain English.
            - "nicheComparison": A brief comparison to what is expected for similar stores in this niche.
            
            Be critical but constructive. Look for red flags like typos, poor image quality, inconsistent fonts, or missing trust signals.
            `
          }
        ]
      }
    ];

    // Add screenshots to the message
    if (screenshots.desktop) {
        messages[0].content.push({
            type: 'image',
            source: {
                type: 'base64',
                media_type: 'image/png',
                data: screenshots.desktop
            }
        });
    }

    // Only add mobile if distinct or if needed, but let's stick to desktop for main analysis to save tokens/complexity 
    // or add both if available. Let's add mobile too if it fits.
    // Note: Claude has image size limits. Puppeteer screenshots might be large.
    // We assume the base64 strings are valid.

    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: messages,
    });

    // Extract JSON from response
    const textResponse = msg.content[0].text;
    
    // Find JSON block if wrapped in markdown
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
    }
    
    return JSON.parse(textResponse);

  } catch (error) {
    console.error('Claude Analysis Failed:', error);
    return null; // Fail gracefully
  }
};
