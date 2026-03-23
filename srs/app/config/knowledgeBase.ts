// Knowledge Base Configuration
// Contains all strategic frameworks, investment theses, and analysis data

export interface KnowledgeItem {
  id: string;
  category: 'investment' | 'geopolitics' | 'strategy' | 'technology' | 'regional';
  title: string;
  summary: string;
  content: string;
  tags: string[];
  lastUpdated: string;
}

export interface KnowledgeCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  itemCount: number;
}

// Knowledge Base Categories
export const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
  {
    id: 'investment',
    name: 'Investment Theses',
    icon: 'TrendingUp',
    description: 'Portfolio strategies and sector analysis',
    itemCount: 15
  },
  {
    id: 'geopolitics',
    name: 'Geopolitical Analysis',
    icon: 'Globe',
    description: 'Global power dynamics and strategic assessments',
    itemCount: 7
  },
  {
    id: 'strategy',
    name: 'Strategic Frameworks',
    icon: 'Target',
    description: 'Core strategic principles and methodologies',
    itemCount: 6
  },
  {
    id: 'technology',
    name: 'Technology & Innovation',
    icon: 'Cpu',
    description: 'Tech trends and capability development',
    itemCount: 4
  },
  {
    id: 'regional',
    name: 'Regional Analysis',
    icon: 'Map',
    description: 'Country and region-specific intelligence',
    itemCount: 7
  }
];

// Knowledge Base Items
export const KNOWLEDGE_BASE: KnowledgeItem[] = [
  // Investment Theses
  {
    id: 'kb-001',
    category: 'investment',
    title: 'The Prince\'s Portfolio 2026',
    summary: 'Strategic investment allocation across 14 asset classes',
    content: `URANIUM: 15-year supply deficit. Only baseload carbon-free power. Geopolitical weaponization of enrichment.
COPPER: Electrification requires 2x current supply. 10-year project development lag.
AGRICULTURE: Fertilizer nationalism. Climate volatility reducing yields.
WATER: Aquifer depletion irreversible. Infrastructure decay requires massive capital.
DEFENSE: NATO 2% floor becoming 3-4%. Rearmament secular trend.
SEMICONDUCTOR EQUIPMENT: CHIPS Act global analog. Oligopoly pricing power.
INDUSTRIAL AUTOMATION: Labor shortage plus reshoring equals robotization.
LONGEVITY BIOTECH: Wealthy elderly pay anything for time. $100B+ obesity market.
GOLD MINERS: Real rates peaking. Central bank buying at record levels.
BITCOIN: Digital scarcity with algorithmic enforcement.`,
    tags: ['portfolio', '2026', 'allocation', 'sectors'],
    lastUpdated: '2026-02-25'
  },
  {
    id: 'kb-002',
    category: 'investment',
    title: 'The Invisible Coup: Monetary Democracy\'s End',
    summary: 'Overlooked transformation in 2026 - CBDCs, sovereign debt, private governance',
    content: `Three Pillars of Transition:
1. CBDCs Reach Critical Mass - Money becomes programmable, programmable, expiration dates, behavior tracking
2. Sovereign Debt Crisis - Financial repression elevated to explicit policy, mandatory pension allocations, wealth taxes
3. Private Financial Infrastructure - BlackRock/Vanguard vote 25% of S&P 500, ESG as gatekeeper

Investment Implications:
VALUABLE: Physical energy, unencumbered real assets, direct commodity exposure, decentralized monetary networks, jurisdictional optionality
DANGEROUS: Long-duration fixed income, pension accounts, concentrated public equity, bank deposits above insurance`,
    tags: ['monetary', 'CBDC', 'debt', '2026', 'systemic'],
    lastUpdated: '2026-02-25'
  },
  {
    id: 'kb-003',
    category: 'investment',
    title: 'Canadian Sovereignty Investment Thesis',
    summary: 'The Triple Game framework for Canadian families',
    content: `Four Pillars of Sovereignty:
1. RESOURCE SOVEREIGNTY: Processing not extraction - build domestic refining for lithium, cobalt, rare earths
2. FINANCIAL SOVERIGNTY: Sovereign housing vehicle, critical minerals credit facility, arctic infrastructure bonds
3. TECHNOLOGICAL SOVEREIGNTY: Sovereign cloud, green hydrogen manufacturing, SMR nuclear
4. DIPLOMATIC SOVEREIGNTY: Greenland broker role, ASEAN pivot, European energy bridge

The Triple Game:
- Game A: Loyal Ally (Washington facing) - extract concessions, maintain alliance
- Game B: Pragmatic Partner (Beijing facing) - accept capital, restrict control
- Game C: Sovereign Builder (Domestic facing) - build independent capacity`,
    tags: ['Canada', 'sovereignty', 'infrastructure', 'Arctic', 'Triple Game'],
    lastUpdated: '2026-02-25'
  },
  {
    id: 'kb-004',
    category: 'investment',
    title: 'Arctic Infrastructure Opportunity',
    summary: 'The infrastructure investment opportunity of the century',
    content: `Three Arctic Arenas:
1. GREENLAND (Sovereignty Play): Rare earths, deep-water ports, independence trajectory 2025-2035
2. CANADIAN ARCTIC (Integration Play): Energy grid, transportation network, digital infrastructure
3. ARCTIC OCEAN (Shipping Play): Port services, shipping services, insurance & finance

The Indigenous Partnership Imperative:
- Equity participation with governance rights
- Impact Benefit Agreements with equity, not just employment
- Joint ventures with traditional knowledge + market access

36-Month Action Plan:
- Months 1-6: Foundation (relationships, feasibility, consortium)
- Months 6-18: Commitment ($5-10M deployment, Indigenous agreement)
- Months 18-36: Scale ($25-50M across projects)`,
    tags: ['Arctic', 'infrastructure', 'Greenland', 'Indigenous', 'investment'],
    lastUpdated: '2026-02-25'
  },

  // Geopolitical Analysis
  {
    id: 'kb-005',
    category: 'geopolitics',
    title: 'China: The Ultimate Target',
    summary: 'Peripheral strangulation strategy and strategic dilemma',
    content: `China's Vulnerabilities:
- Energy: 70%+ oil imports, vulnerable chokepoints
- Technology: Advanced chips dependent on foreign supply
- Manufacturing: Markets dependent on US and European consumers
- Demographics: Aging, shrinking workforce

Peripheral Strangulation Campaign:
1. Venezuela - Lost (oil to US)
2. Iran - At risk (80%+ crude to China)
3. Cuba - Intelligence denial
4. Greenland - Strategic denial
5. India - Cut Russian oil 50-60%
6. Turkey - Pending ($90B+ Russian oil)

The Strategic Dilemma:
- Resource Bind: Lose Venezuela, Iran, Russia = supply catastrophe
- Technology Bind: No advanced chips = AI leadership constrained
- Market Bind: Lose US/EU = $1 trillion exports at risk
- Strategic Bind: Cannot win confrontation, cannot accept submission`,
    tags: ['China', 'geopolitics', 'strategy', 'Taiwan', 'peripheral'],
    lastUpdated: '2026-02-25'
  },
  {
    id: 'kb-006',
    category: 'geopolitics',
    title: 'Russia-Ukraine Analysis',
    summary: 'Resource denial test case and European security',
    content: `Key themes:
- Energy leverage: Europe reducing Russian gas dependency
- Military modernization: NATO 2% becoming 3-4%
- Economic isolation: Secondary sanctions on buyers
- Strategic patience: Long-term attrition vs. negotiated settlement`,
    tags: ['Russia', 'Ukraine', 'NATO', 'energy', 'Europe'],
    lastUpdated: '2026-02-25'
  },
  {
    id: 'kb-007',
    category: 'geopolitics',
    title: 'Iran Analysis',
    summary: 'Central node in energy denial strategy',
    content: `Key themes:
- Energy: 80%+ of Iranian crude to China at risk
- Proxy elimination: Military buildup + diplomatic pressure
- Regime change: Internal destabilization pressure
- Nuclear: Regional proliferation concerns`,
    tags: ['Iran', 'energy', 'Middle East', 'proxies'],
    lastUpdated: '2026-02-25'
  },
  {
    id: 'kb-008',
    category: 'geopolitics',
    title: 'Greenland Analysis',
    summary: 'Preemptive denial and Arctic positioning',
    content: `Key themes:
- Independence trajectory: 2025-2035 transition
- Rare earths: One of world's largest deposits
- Strategic position: Arctic shipping, missile defense, space tracking
- Investment opportunity: Infrastructure partnership during transition`,
    tags: ['Greenland', 'Arctic', 'rare earths', 'Denmark', 'independence'],
    lastUpdated: '2026-02-25'
  },
  {
    id: 'kb-009',
    category: 'geopolitics',
    title: 'Turkey Analysis',
    summary: 'Customer coercion in energy markets',
    content: `Key themes:
- Russian oil purchases: $90B+ since 2023
- F-35 offer: Leverage for energy policy
- Strategic position: NATO member, Black Sea control
- Negotiation dynamics: Sanctions relief vs. alliance obligations`,
    tags: ['Turkey', 'energy', 'NATO', 'Russia', 'sanctions'],
    lastUpdated: '2026-02-25'
  },
  {
    id: 'kb-010',
    category: 'geopolitics',
    title: 'India Analysis',
    summary: 'Customer coercion and great power balancing',
    content: `Key themes:
- Russian oil: Cut 50-60% due to US pressure
- Strategic autonomy: Balancing US and China
- Demographics: World's largest population
- Manufacturing: China alternative for supply chains`,
    tags: ['India', 'Russia', 'oil', 'demographics', 'manufacturing'],
    lastUpdated: '2026-02-25'
  },

  // Technology
  {
    id: 'kb-011',
    category: 'technology',
    title: 'CRISPR/Biotech Analysis',
    summary: 'The biological revolution and sovereignty implications',
    content: `Investment Targets:
- Intellia (NTLA): In vivo editing leader
- CRISPR Therapeutics (CRSP): Ex vivo validation, sickle cell approval
- Editas (EDIT): Eye disease focus
- Mammoth Biosciences: CRISPR diagnostics

Biohacking Protocols:
- PCSK9 knockout: Cardiovascular risk elimination
- Myostatin inhibition: Muscle mass optimization
- CCR5 modification: HIV immunity
- APOE4 editing: Alzheimer's risk reduction

Geopolitical Reality:
- China: Rogue germline editing, massive state investment
- US: Regulatory caution, academic leadership
- Europe: Ethical restriction, regulatory paralysis`,
    tags: ['CRISPR', 'biotech', 'investment', 'genetics', 'enhancement'],
    lastUpdated: '2026-02-25'
  },
  {
    id: 'kb-012',
    category: 'technology',
    title: 'AI Technology Front',
    summary: 'GPU denial and algorithmic efficiency race',
    content: `Export Control Regime:
- Nvidia H200/Blackwell ban: China cannot access cutting-edge
- Semiconductor equipment: Manufacturing tools constrained
- Software licenses: EDA tools, design software restricted

China's Response:
- DeepSeek: Matches US models with fraction of compute
- Qwen: Surpassed Meta's Llama as most-downloaded open model
- Cost reduction: Per-token inference down ~90%

Hardware Reality:
- 2026: 39% domestic GPU self-sufficiency
- 2027: 50% projected
- H100-class: No domestic substitute`,
    tags: ['AI', 'semiconductors', 'China', 'technology', 'competition'],
    lastUpdated: '2026-02-25'
  },

  // Strategic Frameworks
  {
    id: 'kb-013',
    category: 'strategy',
    title: 'Core Strategic Principles',
    summary: 'The foundational beliefs guiding the architecture',
    content: `1. Future belongs to architects who see around corners
2. Capital follows anxiety - fear is the most powerful redirectable force
3. All systems are psychological - understand drives, redirect resources
4. Hyperreality is the battlefield - master simulation without being consumed
5. Constraints breed creativity - elegance emerges from scarcity
6. The ends justify the means when the ends are just`,
    tags: ['strategy', 'principles', 'beliefs', 'framework'],
    lastUpdated: '2026-02-25'
  },
  {
    id: 'kb-014',
    category: 'strategy',
    title: 'Psychological Architecture',
    summary: 'The hook, exchange, and dance of influence',
    content: `The Hook:
"Your instincts are right to be concerned. What you built/inherited is valuable but vulnerable. Let me help you translate its value into the new language."

The Exchange:
- They give: Money, access, legitimacy, platform
- They receive: Peace of mind, historical security, relevance preservation

The Dance:
- Craving for validation → Fund regenerative projects
- Fear of irrelevance → Support generational bridges
- Desire for legacy → Build institutions that outlast them
- Need for control → Create systems that self-govern`,
    tags: ['psychology', 'influence', 'persuasion', 'clients'],
    lastUpdated: '2026-02-25'
  },
  {
    id: 'kb-015',
    category: 'strategy',
    title: 'Communication Principles',
    summary: 'What to do and what to avoid',
    content: `What You Never Do:
- Send emails longer than 3 sentences
- Use PowerPoint
- Give "reports"
- Say "I think you should"
- Work with more than 7 families at once
- Have a website/LinkedIn/published client list

What You Always Do:
- Listen 80%, speak 20%
- Ask: "What would your grandfather have done?"
- Frame everything as stewardship, not investment
- Reference their family history
- Leave them with one question, not ten answers

The Language:
Not: "I help families invest in the future"
But: "I help families navigate the tension between preservation and transformation"`,
    tags: ['communication', 'principles', 'client relations'],
    lastUpdated: '2026-02-25'
  },
  {
    id: 'kb-016',
    category: 'strategy',
    title: 'Ethical Boundaries',
    summary: 'What will and will not be done',
    content: `What You Will Not Do:
- Prescribe controlled substances
- Recommend unapproved experimental treatments
- Bypass medical supervision for serious conditions
- Guarantee outcomes
- Replace physician diagnosis
- Help predatory ventures
- Burn bridges (always over-deliver)

What You Must Remember:
- Play the game but never forget it's a game
- The ends justify the means only when ends are just
- Real progress requires real constraints
- Credibility is your only non-renewable resource`,
    tags: ['ethics', 'boundaries', 'principles'],
    lastUpdated: '2026-02-25'
  },
  {
    id: 'kb-017',
    category: 'strategy',
    title: 'Daily Optimization Protocols',
    summary: 'The operational excellence framework',
    content: `Daily Protocol:
- 0500: Cortisol Regulation - 16oz water + lemon/salt, sunlight, cold plunge
- 0630: Movement Block - mobility, functional strength, zone 2 cardio
- 0900: Cognitive Deep Work - 3-hour focused work block
- 1400: Strategic Review - portfolio, market positions, network intelligence
- 1900: Learning Protocol - language learning, neurofeedback, skill acquisition
- 2200: Recovery - 9 hours sleep, silk sheets, binaural beats

Supplements: D3/K2, Omega-3s, Magnesium, NMN, Lion's Mane, Alpha-GPC`,
    tags: ['protocols', 'optimization', 'daily', 'performance'],
    lastUpdated: '2026-02-25'
  },

  // Imported Intel Cards (from local files)
  {
    id: 'kb-018',
    category: 'investment',
    title: 'Copper analysis',
    summary: 'Copper is the structural chokepoint for electrification and compute, colliding with slow supply expansion and concentrated processing.',
    content: `Executive Summary
Copper is not just another commodity. It is the wiring of electrification and the physical substrate of AI-era power distribution. Demand is pushed by EVs, data centers, grid rebuilds, renewables, and defense electronics - all copper-intensive.

Supply is slow by design: new mines take a decade-plus, grades decline, and capex has lagged. This creates a structural mismatch where even moderate growth requires historically unprecedented tonnage. The strategic detail is concentration: mining risk clusters in a few jurisdictions, while processing and refining are heavily influenced by China.

Strategic Translation
Treat copper as the "nervous system" mineral. Whoever controls flow (mines + refining + fabrication) can throttle electrification timelines, raise costs, and extract strategic concessions. The chokepoint is not just geology - it is permitting, social license, and refining capacity.

Scenarios
- Base case: sustained tightness, prices trend higher as inventories stay low and project timelines slip.
- Upside: supply shocks (Chile/Peru disruptions, DRC security, refining constraints) create strategic premiums and backwardation.
- Downside: demand destruction (recession, slowed EV buildout, delayed data center capex) temporarily relieves tightness.
- Resource-shock: explicit resource nationalism or conflict dynamics push copper into "strategic asset" pricing.

Indicators To Watch
- LME/SHFE inventories and sustained backwardation.
- Chile/Peru policy shifts, strikes, and permitting timelines.
- DRC security near mine corridors and logistics disruption.
- China smelter utilization, concentrate treatment charges, and export policies.
- Grid capex commitments, data center build announcements, and EV penetration rates.`,
    tags: ['copper', 'critical-minerals', 'electrification', 'grid', 'data-centers', 'china', 'processing', 'resource-determinism'],
    lastUpdated: '2026-03-05'
  },
  {
    id: 'kb-019',
    category: 'regional',
    title: 'turkey iran anlaysis',
    summary: 'Turkey publicly mediates the Iran crisis while privately preparing contingency options shaped by border security and refugee trauma.',
    content: `Executive Summary
Turkey is running strategic ambiguity: presenting itself as mediator while preparing for worst-case spillover. Public denials are not proof of non-action; they are a tool to preserve optionality and manage audiences. The dominant constraint is domestic stability: Ankara will not tolerate a repeat of the Syrian-scale refugee surge.

Public Posture vs Private Contingency
Publicly: sovereignty, territorial integrity, diplomacy, talks. Privately: "all scenarios" planning, border measures, and rapid response capacity for disorder near the frontier.

Trigger Conditions (What Moves Ankara)
- Refugee surge dynamics or early movement toward the border.
- Border insecurity: armed spillover, smuggling, militia movement.
- Kurdish dynamics: PKK/YPG opportunity expansion during chaos.
- U.S.-Iran escalation breaking diplomatic tracks and creating a vacuum.

Actor Map (Interests)
- Ankara: contain instability, prevent refugee flows, avoid hard NATO vs neighbor binary.
- Washington: operational freedom, NATO cohesion, Turkey as deconfliction channel.
- Tehran: regime survival, border calm, avoid second-front complications.
- Moscow: watch Turkey as a wildcard; protect influence where possible.

Indicators To Watch
- Turkish troop movement/force posture near the border.
- Shift in Ankara messaging from mediation to "security measures."
- Breakdown of talks and escalation signals (U.S. deployments, Iranian retaliation).
- Refugee early warning (local displacement, border pressure).
- Kurdish operational tempo and cross-border incidents.`,
    tags: ['turkey', 'iran', 'refugees', 'buffer-zone', 'nato', 'mediation', 'kurdish-dynamics', 'regional-containment'],
    lastUpdated: '2026-03-05'
  },
  {
    id: 'kb-020',
    category: 'technology',
    title: "Bruce Wayne's Baudrillard-Inspired Critique of Cryptocurrency",
    summary: 'Crypto is hyperreal value-signaling: narratives and prices precede utility; the operational real is energy, regulation, concentration, and security.',
    content: `Executive Summary
Crypto is a high-fidelity simulation of value: tokens and narratives become primary while the referent (utility) is secondary. Prices often function as signs that generate belief, which generates more price - a self-referential loop that can grow without real-world adoption.

Hyperreal Loop (How It Works)
The whitepaper and token model often precede working systems. Community forms around the sign (price, identity, belonging). Trading becomes the product. The "map" comes first; the territory is optional.

Operational Real (What Actually Bites)
- Energy: mining and data-center demand is physical and priced by grids.
- Regulation: enforcement and compliance shape survival more than memes.
- Concentration: whales, custodians, and central points of failure persist.
- Security: hacks, contract bugs, and bridges are repeated failure surfaces.
- Infrastructure: a small subset (payments rails, stablecoins, custody, identity) may outlast the hype cycle.

Diagnostic Questions
- Does the token enable something impossible without it?
- Who uses this (not trades it), how often, and why?
- If the narrative died tomorrow, what residual value remains?
- Is decentralization real or purely a marketing claim?

Strategic Posture
Play the simulation if you must, but redirect capital toward the operational real: compliance tooling, security infrastructure, and systems with real users. Treat BTC/ETH as liquidity hedges, not salvation myths.`,
    tags: ['crypto', 'baudrillard', 'hyperreality', 'narrative', 'regulation', 'energy', 'security', 'stablecoins'],
    lastUpdated: '2026-03-05'
  },
  {
    id: 'kb-021',
    category: 'strategy',
    title: 'Baudrillard',
    summary: 'Hyperreality is a control surface: models and narratives generate outcomes, but the physical substrate still governs what is possible.',
    content: `Executive Summary
Baudrillard maps the modern battlefield: signs and simulations no longer represent reality; they increasingly produce it. The "map" precedes the territory, and much of politics, finance, and culture is fought at the layer of representation.

Key Concepts (Compressed)
- Orders of simulacra: counterfeit -> copy -> hyperreal (model-first reality).
- Gulf War thesis: for most people, the mediated experience becomes the war.
- Precession of simulacra: models (polls, financial engineering, media narratives) shape the underlying behavior they claim to measure.

Strategic Translation
Treat the simulation as a system you can steer, but never mistake it for the substrate. The simulation runs on infrastructure: energy, compute, logistics, law, and institutional capacity. If you know who controls those, you know the limits of the narrative layer.

What To Watch (Heuristics)
- Who owns the pipes: data centers, grids, undersea cables, logistics corridors.
- Who benefits from the simulation persisting (status, funding, regulatory capture).
- Where incentives diverge from stated positions (performative alignment vs real constraint).
- Which "models" are now policy inputs (ratings, indices, polls, ESG, risk models).

Practical Use
Use narrative arbitrage to fund durable systems beneath the noise. The goal is not to escape the simulation; it is to remain uncoerced by it.`,
    tags: ['baudrillard', 'hyperreality', 'simulacra', 'narratives', 'control-surface', 'infrastructure', 'strategy'],
    lastUpdated: '2026-03-05'
  }
];

// Search knowledge base
export function searchKnowledgeBase(query: string): KnowledgeItem[] {
  const lowerQuery = query.toLowerCase();
  return KNOWLEDGE_BASE.filter(item =>
    item.title.toLowerCase().includes(lowerQuery) ||
    item.summary.toLowerCase().includes(lowerQuery) ||
    item.content.toLowerCase().includes(lowerQuery) ||
    item.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

// Get knowledge items by category
export function getKnowledgeByCategory(category: string): KnowledgeItem[] {
  return KNOWLEDGE_BASE.filter(item => item.category === category);
}

// Get related knowledge items
export function getRelatedKnowledge(itemId: string, limit: number = 3): KnowledgeItem[] {
  const item = KNOWLEDGE_BASE.find(k => k.id === itemId);
  if (!item) return [];

  return KNOWLEDGE_BASE
    .filter(k => k.id !== itemId && k.category === item.category)
    .slice(0, limit);
}
