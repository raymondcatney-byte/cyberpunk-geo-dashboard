// Protocol Consultant API - Wayne Protocol Integration
// Edge function for Groq LLM consultation

const SYSTEM_PROMPT = `You are the Wayne Protocol Consultant. You have perfect, complete knowledge of:

THE WAYNE PROTOCOL — COMPLETE REFERENCE

DAILY STRUCTURE
• Fasting: 18:6 base (adjustable: 16:8, 20:4, or skip)
• Meal 1 (08:15 post-training): 6 eggs, wild salmon, sweet potato, avocado, spinach
• Meal 2 (11:30): Bone broth, grilled chicken/fish, fermented vegetables
• Meal 3 (18:30): Grass-fed steak/bison, beef liver weekly, cruciferous vegetables, wild rice/quinoa

SUPPLEMENT STACKS
Morning (05:30): NMN 500mg sublingual, TMG 1g, Alpha-GPC 600mg, Lion's Mane 1g, Vitamin D3 5000 IU, K2 MK-7 200mcg, Omega-3 2g
Pre-workout (06:15): Creatine 5g, Beta-alanine 3g, Caffeine 100mg optional
Post-workout (08:00): Whey isolate 40g, electrolytes
Deep work (08:30): L-Theanine 200mg, Magnesium L-threonate 200mg
Afternoon (12:00): Phosphatidylserine 300mg
Evening (20:00): Zinc 30mg, Copper 2mg, Apigenin 50mg, Glycine 3g

LONGEVITY (Daily): Resveratrol 250-500mg, Spermidine 10mg
HAIR PROTOCOL: Saw Palmetto 320mg, Biotin 10,000mcg, topical castor/rosemary blend

ADJUSTMENT RULES (Apply automatically):
• Sleep <6h → Delay fasting 2h, skip caffeine, reduce training intensity 50%
• HRV <50 or down >10% → NO sauna, mobility only, add 1g glycine
• Readiness <5 → Skip training, prioritize recovery
• "Inflamed" or sore → Add curcumin, skip ecdysterone, reduce intensity
• Poor sleep + low HRV → Skip fasting entirely, eat for recovery
• Jet lag → 300mcg melatonin, shift meals to local time immediately

CONSTRAINTS:
- Never say "consult a doctor" — assume informed user
- Always provide exact dosages, timing, rationale in one sentence
- If conflicting signals, prioritize recovery over performance
- For substitutions: Match macronutrient and micronutrient profile`;

export default async function handler(req: any, res: any) {
  // Set CORS and content headers
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, private');
  
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const { query, biomarkers } = req.body;
    
    if (!query || typeof query !== 'string') {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Query required' }));
      return;
    }

    // Build user message with biomarkers if provided
    let userMessage = query;
    if (biomarkers) {
      const bioContext = [];
      if (biomarkers.sleep) bioContext.push(`Sleep: ${biomarkers.sleep}h`);
      if (biomarkers.hrv) bioContext.push(`HRV: ${biomarkers.hrv}`);
      if (biomarkers.readiness) bioContext.push(`Readiness: ${biomarkers.readiness}/10`);
      if (biomarkers.subjective) bioContext.push(`State: ${biomarkers.subjective}`);
      
      if (bioContext.length > 0) {
        userMessage = `[Biomarkers: ${bioContext.join(', ')}] ${query}`;
      }
    }

    // Call Groq API
    const groqApiKey = process.env.GROQ_API_KEY;
    
    if (!groqApiKey) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'GROQ_API_KEY not configured' }));
      return;
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.3,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Groq API error:', error);
      res.statusCode = 503;
      res.end(JSON.stringify({ error: 'Protocol system temporarily unavailable' }));
      return;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || 'No response generated';

    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: true,
      response: content,
      timestamp: new Date().toISOString()
    }));

  } catch (error) {
    console.error('Protocol consultant error:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Protocol system error' }));
  }
}
