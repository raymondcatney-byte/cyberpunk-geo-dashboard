// POST /api/protocol-consultant
// Wayne Protocol Consultant AI endpoint

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

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
- For substitutions: Match macronutrient and micronutrient profile
- Keep responses concise but complete
- Use clear formatting with sections when adjusting protocols`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, biomarkers } = req.body;
    
    const enrichedQuery = biomarkers 
      ? `[Biomarkers detected: ${JSON.stringify(biomarkers)}] ${query}`
      : query;
    
    const response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: enrichedQuery }
        ],
        temperature: 0.3,
        max_tokens: 800
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'API request failed');
    }
    
    const data = await response.json();
    return res.status(200).json({ 
      response: data.choices[0].message.content 
    });
  } catch (error) {
    console.error('Protocol Consultant error:', error);
    return res.status(500).json(
      { error: 'Protocol system temporarily unavailable. Check API configuration.' }
    );
  }
}
