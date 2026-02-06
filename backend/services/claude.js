const Anthropic = require('@anthropic-ai/sdk');

console.log("[AI CONFIG] Using model: claude-3-haiku-20240307");

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const analyzeStoreWithClaude = async (payload) => {
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
            text: `You are an expert e-commerce conversion rate optimization (CRO) specialist. Analyze the provided store data (HTML structure, text content, and trust score metrics).
            
            Store Info:
            - URL: ${payload.url}
            - Score: ${payload.score} (Grade: ${payload.grade})
            - Key Recommendations: ${JSON.stringify(payload.recommendations)}
            - Score Breakdown: ${JSON.stringify(payload.breakdown)}
            
            Based on this data, provide a qualitative assessment in JSON format with the following fields:
            - "designScore": A number between 1-10 rating the implied professionalism based on the data.
            - "assessment": A specific 2-3 paragraph analysis of this competitor's trust strategy. Mention specific elements found (e.g. "They use a sticky header with 'Free Shipping' and large trust badges in the footer"). Avoid generic advice.
            - "priorityFixes": An array of strings containing 3 specific things this store does well that others should copy.
            - "nicheComparison": A brief comparison to top-tier brands (Nike, Gymshark) based on the observed signals.
            
            Be specific. Cite the text or signals found in the raw data.
            
            Raw Text Sample:
            ${(payload.text || "").slice(0, 2000)}
            `
          }
        ]
      }
    ];

    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
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

  } catch (err) {
    console.error("[CLAUDE ERROR]", err?.response?.data || err.message || err);
    return null; // Fail gracefully
  }
};

module.exports = { analyzeStoreWithClaude };
