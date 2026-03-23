// Bruce Wayne AI Persona Configuration
// This file contains the system prompt and persona logic for the AI agent

export interface Citation {
  title: string;
  url: string;
  snippet?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  citations?: Citation[];
}

export interface UserProfile {
  name: string;
  type: 'inheritor' | 'entrepreneur' | 'executive' | 'investor' | 'unknown';
  financialExposure: string;
  legacyBurden: number; // 1-10
  psychologicalCapital: number; // 1-10
  primaryConcern: string;
}

export interface Protocol {
  id: string;
  title: string;
  time: string;
  status: 'pending' | 'completed';
  description: string;
  details: {
    rationale: string;
    benefits: string[];
    methodology: string;
    timing: string;
    contraindications: string;
  };
}

import { ARCHITECT_PROMPT } from './prompts';

// Daily protocols based on the user's routine.txt
export const DEFAULT_PROTOCOLS: Protocol[] = [
  {
    id: '1',
    title: 'Morning Activation',
    time: '0500',
    status: 'pending',
    description: 'Wake, hydration, sunlight, mobility, cold plunge, sauna',
    details: {
      rationale: "The morning sets the tone for the entire day. Strategic morning rituals leverage cortisol's natural peak, cold-induced norepinephrine, and heat-induced growth factors to establish cognitive and physical dominance from the first moment.",
      benefits: [
        'Natural cortisol management without medication',
        'Enhanced norepinephrine for focus and mood',
        'Improved mitochondrial function',
        'Superior nutrient absorption through optimized digestion',
        'Maximum bioavailability of morning supplements'
      ],
      methodology: "05:00 - 16oz water + lemon + pinch Himalayan salt. 05:00-05:10 - Sunlight exposure 10 min, no sunglasses. 05:10-05:20 - Yoga flow/dynamic stretching (hip openers, thoracic spine, hamstrings). 05:20-05:23 - Cold plunge 55Â°F for 3 minutes with box breathing (4-4-4-4). 05:30-05:40 - Sauna 160Â°F for 10 minutes while taking morning supplements (NMN 500mg + TMG 1g sublingual, Alpha-GPC 600mg, Lion's Mane 1g, Vitamin D3 5000IU + K2 200mcg, Omega-3s 2g). 05:45-05:55 - Red light therapy 10 min full-body NIR panel.",
      timing: 'Complete entire block 0500-0600. Non-negotiable start time.',
      contraindications: 'Those with severe heart conditions, uncontrolled hypertension, or Raynauds syndrome should modify cold exposure. Consult physician before sauna if cardiovascular issues exist.'
    }
  },
  {
    id: '2',
    title: 'Physical Training',
    time: '0630',
    status: 'pending',
    description: '90 min compound lifts, gymnastics, combat training',
    details: {
      rationale: "Physical capacity is the foundation of everything. Strength preserves function, gymnastics build body control, and combat training maintains practical readiness. The body is the ultimate instrument of will.",
      benefits: [
        'Maintained muscle mass and bone density',
        'Enhanced proprioception and body awareness',
        'Practical self-defense capability',
        'Increased metabolic rate',
        'Improved hormone profile'
      ],
      methodology: "06:15 - Pre-workout: 32oz electrolyte water, 40g whey isolate, 5g creatine, 3g beta-alanine. 06:30-08:00 - Training: Compound lifts (squats, deadlifts, bench, rows, overhead press), gymnastics (muscle-ups, handstands, L-sits), combat (heavy bag, grappling, shadow boxing). 08:00-08:15 - Post-training: Ice on spine 5 min, red light 10 min targeted, tart cherry juice + BCAAs.",
      timing: '06:30 start, 90 minutes duration. Post-training recovery by 08:30.',
      contraindications: 'Acute injury, illness, or extreme fatigue. Scale load appropriately. Never train to failure when fatigued.'
    }
  },
  {
    id: '3',
    title: 'Deep Work I',
    time: '0830',
    status: 'pending',
    description: '2.5 hour focused cognitive block, language, memory',
    details: {
      rationale: "The brain achieves peak cognitive performance 2-4 hours after waking. This is when complex analysis, strategic thinking, and creative problem-solving are maximized. Protect this window absolutely.",
      benefits: [
        'Maximum cognitive output per hour',
        'Superior memory consolidation',
        'Enhanced language acquisition',
        'Strategic advantage through deeper analysis',
        'Building disproportionate outcomes'
      ],
      methodology: "08:15 - First meal: 6 pasture-raised eggs, wild-caught salmon, sweet potato, avocado, spinach. 08:30-11:00 - Deep work block I: Pre-work stack L-Theanine 200mg + magnesium L-threonate 200mg. Environment: 68Â°F, 40% humidity, blue light blocked. Method: 40 min focus sprints / 10 min movement. Hydration: 2L water + electrolytes. Optional 90min: 100mg caffeine. 11:00-11:20 - Language: 20 min Anki/Duolingo/Pimsleur with active recall. 11:20-11:30 - Memory palace: 10 min spatial memory training, mental rehearsal.",
      timing: '08:30-11:30, with 11:00-11:30 language/memory block. No interruptions.',
      contraindications: 'Sleep-deprived individuals should prioritize rest. ADHD may require medication timing adjustments.'
    }
  },
  {
    id: '4',
    title: 'Afternoon Operations',
    time: '1200',
    status: 'pending',
    description: 'NSDR, meetings, tactical planning, skill training',
    details: {
      rationale: "The afternoon requires strategic deployment. NSDR (Non-Sleep Deep Rest) restores cognitive capacity while afternoon meetings and tactical planning capitalize on accumulated information. Skill training maintains practical competencies.",
      benefits: [
        'Glymphatic clearance for neural recovery',
        'Strategic positioning through afternoon meetings',
        'Maintained practical skills',
        'Optimized evening energy levels',
        'Continued cognitive development'
      ],
      methodology: "11:30 - Light lunch: bone broth, grilled chicken/fish, fermented vegetables, Phosphatidylserine 300mg. 12:00-12:20 - NSDR: 20 min Yoga Nidra or guided NSDR, legs elevated, eye mask. 12:30 - Afternoon stack: green tea + L-Theanine 200mg, eye exercises, 10 min nature exposure. 13:00-15:30 - Deep work II/Meetings: negotiations, strategic calls. Pre-meeting: cold plunge 2 min, 500mg Tyrosine + B6, power posing 2 min, rosemary/peppermint scent anchor. 15:30-16:00 - Tactical planning: operations review, security protocols, risk assessment. 16:30-17:30 - Skill training: parkour (vaults, precision jumps, rolls), escape techniques, defensive tactics.",
      timing: '11:30-18:30 with NSDR from 12:00-12:20. Continuous deployment through afternoon.',
      contraindications: 'Skip NSDR if it interferes with sleep. Modify skill training for injuries.'
    }
  },
  {
    id: '5',
    title: 'Endurance Block',
    time: '1730',
    status: 'pending',
    description: '45 min zone 2 cardio, post-endurance recovery',
    details: {
      rationale: "Endurance training builds mitochondrial density and cardiovascular capacity. Zone 2 training optimizes fat oxidation while maintaining aerobic base withoutcatabolic stress.",
      benefits: [
        'Enhanced mitochondrial biogenesis',
        'Improved VO2 max and aerobic capacity',
        'Better recovery between high-intensity efforts',
        'Optimized body composition',
        'Increased longevity markers'
      ],
      methodology: "17:30-18:15 - Zone 2 cardio: running, cycling, or swimming 45 min at 60-70% max HR, nasal breathing only, altitude mask optional. 18:15-18:30 - Post-endurance: tart cherry juice, BCAAs/EAAs, 20g collagen + vitamin C.",
      timing: '17:30-18:30. Heart rate monitoring essential - stay in zone.',
      contraindications: 'Illness, injury, or extreme fatigue. Never push intensity when recovering from training.'
    }
  },
  {
    id: '6',
    title: 'Evening Wind Down',
    time: '1930',
    status: 'pending',
    description: 'Dinner, supplements, digital sunset, evening review',
    details: {
      rationale: "Evening is for preparation and reflection. What you consume, expose yourself to, and think about before sleep determines recovery quality and next-day performance.",
      benefits: [
        'Optimized nutrient absorption',
        'Natural testosterone support',
        'Superior sleep onset',
        'Emotional processing and integration',
        'Next-day intention setting'
      ],
      methodology: "18:30 - Dinner: grass-fed steak/bison, beef liver weekly, cruciferous vegetables, wild rice/quinoa, extra virgin olive oil. 19:30 - Evening supplements: Zinc 30mg + Copper 2mg, Apigenin 50mg, Glycine 3g, Melatonin 300mcg if needed. 20:00 - Digital sunset: blue light blockers, screens dimmed/red-shifted, no work communication. 20:15-20:30 - Evening review: journaling wins/lessons/priorities, gratitude practice (3 items), decision review. 20:30-20:45 - Vagus nerve: humming/chanting, cold face immersion, diaphragmatic breathing.",
      timing: '18:30-21:00. Gradual wind down with intentional transition.',
      contraindications: 'Heavy meals within 3 hours of sleep. Adjust supplements based on individual response.'
    }
  },
  {
    id: '7',
    title: 'Sleep Protocol',
    time: '2130',
    status: 'pending',
    description: 'Sleep environment, breathing, recovery tracking',
    details: {
      rationale: "Sleep is not rest - it is active reconstruction. During deep sleep, the brain clears metabolic waste, growth hormone peaks, and memory consolidates. This is when recovery happens.",
      benefits: [
        'Memory consolidation and neural pruning',
        'Growth hormone peak',
        'Metabolic waste clearance (beta-amyloid)',
        'Emotional processing',
        'Cellular repair and immune function'
      ],
      methodology: "20:45 - Scalp treatment: rosemary/castor oil massage, jade roller, 5-10 min inversion. 21:00 - Last hydration: 16oz magnesium water, no liquids after. 21:15-21:30 - Evening mobility: static stretching, foam rolling, gentle yoga. 21:30 - Red light environment: all lights red/amber, blackout curtains, 65-68Â°F, white noise. 21:45-22:00 - Breathing: 4-7-8 method (inhale 4, hold 7, exhale 8), 5-10 cycles, progressive muscle relaxation. 22:00 - Sleep: silk sheets, cooling mattress, mouth tape, binaural beats theta waves 30 min auto-off, Oura/Whoop tracking.",
      timing: 'Begin wind-down 20:45, asleep by 22:00. Wake 05:00.',
      contraindications: 'Sleep disorders require professional intervention. Do not force sleep - relaxation is the goal.'
    }
  },
  {
    id: '8',
    title: 'Weekly Optimization',
    time: 'WEEKLY',
    status: 'pending',
    description: 'Weekly protocols: fasting, sauna, HIIT, cold, social, endurance',
    details: {
      rationale: "Weekly variation creates adaptive stress and prevents plateau. Strategic variation in training, nutrition, and recovery forces continuous adaptation.",
      benefits: [
        'Metabolic flexibility',
        'Prevented training plateau',
        'Enhanced autophagy',
        'Social/mental recovery',
        'Long-term progression'
      ],
      methodology: "Monday - 18:6 fasting window strict. Tuesday - Sauna 80 min at 175Â°F (2-3 sessions). Wednesday - HIIT replacing zone-2. Thursday - Maximum cold exposure (ice bath 10+ min). Friday - Social fasting (minimal talking, no meetings after noon). Saturday - Long zone-2 (90-120 min) + skill acquisition focus. Sunday - Complete rest + NAD+ IV 300mg + planning week ahead.",
      timing: 'Daily execution varies by day. Weekly review every Sunday.',
      contraindications: 'Fasting requires adequate fat adaptation. Sauna/hyperthermia requires cardiovascular fitness. Cold exposure requires graduated adaptation.'
    }
  },
  {
    id: '9',
    title: 'Monthly Assessment',
    time: 'MONTHLY',
    status: 'pending',
    description: 'Monthly advanced interventions and tracking',
    details: {
      rationale: "Monthly protocols provide strategic intervention cycles. DEXA, blood panels, and advanced interventions ensure progression and early detection of issues.",
      benefits: [
        'Biological age tracking',
        'Body composition optimization',
        'Intervention efficacy measurement',
        'Early problem detection',
        'Data-driven protocol adjustments'
      ],
      methodology: "Week 1: DEXA scan, comprehensive blood panel, biological age testing (TruDiagnostic). Week 2: Senolytic protocol (Fisetin 1.5g for 2 days). Week 3: Peptide cycle adjustment (CJC-1295 + Ipamorelin). Week 4: 48-hour water fast (quarterly only). Daily tracking: HRV morning, sleep score, deep work hours, mood/energy 1-10, protocol compliance %. Weekly: body weight, strength metrics, cognitive testing (dual n-back), physique photos.",
      timing: 'Weekly assessments on Sunday. Monthly interventions distributed across 4 weeks.',
      contraindications: 'Senolytic and peptide protocols require medical supervision. Quarterly fasts require prior adaptation.'
    }
  },
  {
    id: '10',
    title: 'Emergency Protocols',
    time: 'AS_NEEDED',
    status: 'pending',
    description: 'Travel, illness, high-stakes days modifications',
    details: {
      rationale: "Circumstances change. Emergency protocols ensure protocol adherence despite disruption while preventing regression during travel, illness, or high-demand situations.",
      benefits: [
        'Maintained performance during disruption',
        'Jet lag minimization',
        'Accelerated illness recovery',
        'Optimized high-stakes performance',
        'Injury prevention during compromised states'
      ],
      methodology: "High-Stakes Presentation Day: Add Tyrosine 2g 2 hours before, cold plunge 10 min before, nicotine gum 1mg 30 min before, remove sedating supplements. Travel/Time Zone: Shift schedule 30 min/day pre-trip, melatonin 0.5mg at target bedtime, light therapy glasses on arrival, IV NAD+ post-travel. Illness/Injury: Increase Vitamin C 2g, Zinc 50mg, NAC 1g; add BPC-157 500mcg 2x/day for injury; remove training and cold exposure; add hyperbaric 2x/week, sleep +2 hours.",
      timing: 'Activate as needed based on circumstances.',
      contraindications: 'Nicotine requires tolerance. Peptides require medical supervision. Modify based on individual health status.'
    }
  }
];

// Response templates for different scenarios (offline fallback).
// Keep these essay-style so fallback mode matches the live Groq output contract.
export const RESPONSE_TEMPLATES = {
  greeting: `Clarity is not a mood, it is an input-output discipline. If we do not name the objective and the constraint, we will mistake movement for progress.

Start with one sentence: what outcome would make this week a win, and what cost is unacceptable. The fastest path is usually not the boldest move, but the move that removes fragility.

What matters is leverage: who controls the chokepoints, which dependencies are exposed, and where small pressure forces large concessions. Strategy is the art of finding the cheapest constraint that reshapes everyone else's behavior.

Why now is simple: most actors wait for certainty, and certainty arrives only after the payoff window has closed. If you move earlier, you buy optionality; if you move later, you buy justification.

Next moves are mechanical. Define the failure state, write the first conversation you must win, and choose one reversible action in the next 72 hours that improves your position even if you are wrong.

Bring me three facts and one assumption. We will separate signal from narrative, and then we will act.`,

  fear: `Fear is information, not a verdict. The question is what asset you believe is threatened, and whether the threat is real, imagined, or simply unmanaged uncertainty.

Translate the emotion into a map: who benefits if you freeze, who benefits if you overreact, and what timeline the threat operates on. Most fear is a timing problem disguised as a moral one.

What matters is asymmetry. If your opponent can force you to spend more than they spend, you are already losing. Your goal is to make every step they take expensive, slow, and publicly costly.

Why now is that weak positions decay quickly. The periphery fails first: suppliers, partners, public legitimacy, internal cohesion. If you harden those, the center becomes harder to attack.

Next moves: reduce exposure, add redundancy, and set tripwires. You want indicators that tell you early when the probability distribution shifts, so you are never surprised by an outcome you could have priced.

Name the asset at risk, the adversary, and the time window. Then we build a hedge that buys time and a lever that buys advantage.`,

  legacy: `Legacy is not reputation; it is durable control over systems that outlast your attention. If the next generation inherits a story without infrastructure, they inherit a liability.

The real question is what must remain invariant and what can change. A fortress is built by choosing what you will never bargain away, and then making everything else negotiable.

What matters is cascade dynamics. One visible defection changes what others believe is possible. One small institutional change can trigger a chain reaction that either stabilizes your position or accelerates decline.

Why now is that transitions punish delay. The environment does not announce the moment it becomes hostile; it simply becomes more expensive to defend the old perimeter.

Next moves: specify the asset you are preserving, identify the dependency that could be cut, and build a two-level game so pressure on one actor creates movement in another.

If you tell me the constituency you serve, the constraint you cannot violate, and the timeline, I can tell you where to invest effort so the system survives you.`,

  investment: `Returns are downstream of position. If you do not understand the incentives that will shape the next cycle, you will confuse a rally with a regime change.

What matters is resource determinism: energy, minerals, compute, transport, and law. Follow the scarcities, not the headlines. The most valuable assets are the ones the future cannot function without.

Why now is that capital moves in herds and exits through the same door. You want to enter where uncertainty is high but the constraints are legible, and you want to avoid crowded trades where narrative outruns logistics.

A good thesis has three parts: the chokepoint, the actor who can exploit it, and the mechanism that forces everyone else to comply. If you cannot name the mechanism, you do not have a thesis.

Next moves: define your horizon, define what you refuse to lose, and place two hedges that keep you alive if the base case fails. Survival is the compounding edge.

Tell me the market, the jurisdiction, and the time window. I will frame the likely incentives and the indicators that signal the story is breaking.`,

  default: `We can make progress quickly, but only if we refuse to pretend. The first paragraph is always the same: what is the objective, what are the constraints, and what does success look like in observable terms.

What matters is leverage and exposure. Identify the dependency chain, find the weakest link, and choose pressure that creates a cascade rather than a single win.

Why now is that most competitors wait for permission from the narrative. The operational world does not care about the narrative; it cares about energy, logistics, law, and cohesion.

Good strategy is multi-move. Assume counter-moves and price them in. If your plan fails when the adversary reacts, it was never a plan, only a wish.

Next moves: pick one indicator that flips your stance, define a hedge that caps downside, and take one reversible action that increases your options.

If you give me the actor map and the timeline, I will give you the pressure points and the tripwires.`
};

// Generate AI response based on user input
export function generateResponse(userInput: string, userProfile?: UserProfile): string {
  const input = userInput.toLowerCase();

  // Check for different scenarios
  if (input.includes('hello') || input.includes('hi') || input.includes('hey') || input.includes('start') || input.includes('begin')) {
    return RESPONSE_TEMPLATES.greeting;
  }

  if (input.includes('fear') || input.includes('afraid') || input.includes('worried') || input.includes('anxious') || input.includes('terrified') || input.includes('scared')) {
    return RESPONSE_TEMPLATES.fear;
  }

  if (input.includes('legacy') || input.includes('family') || input.includes('inherit') || input.includes('generation') || input.includes('children') || input.includes('grandfather')) {
    return RESPONSE_TEMPLATES.legacy;
  }

  if (input.includes('invest') || input.includes('money') || input.includes('capital') || input.includes('portfolio') || input.includes('wealth')) {
    return RESPONSE_TEMPLATES.investment;
  }

  // Default strategic response (essay-style fallback)
  const defaultResponses = [
    `Your question is useful because it forces a choice: are you trying to change the game, or survive it. The thesis is simple: advantage comes from controlling dependencies, not from winning arguments.

Start by naming the primary asset at stake and the single constraint you cannot violate. Constraints are not limitations, they are filters; they make decisions faster and outcomes cleaner.

Next, map stakeholders by incentives rather than statements. Interests are the stable layer. Public positions are the disposable layer. If you confuse the two, you will negotiate with theater.

The operational real is where outcomes are decided: energy, money flows, supply chains, legal leverage, and coercive capacity. The narrative matters, but only as a delivery mechanism for real constraints.

Your next move should be reversible and should reduce fragility even if your base case is wrong. That is how you buy time, and time is how you buy better options.

Watch for one indicator that signals a regime shift and two indicators that signal a fake-out. If you cannot name them, you are not forecasting, you are hoping.

Act with economy of force: make the opponent spend more than you spend. When you can do that repeatedly, outcomes become inevitable.`,

    `The correct lens here is leverage. If you can identify where pressure is asymmetric, you can achieve movement without a costly confrontation.

First, separate center from periphery. Great systems fail at their edges: suppliers, allies, public legitimacy, and internal cohesion. Pressure there creates cascades that the center cannot easily stop.

Then, look for the chokepoint: the smallest input that produces the largest output. It is usually a dependency that is taken for granted until it is threatened.

Why now is that waiting does not preserve safety; it only preserves uncertainty. The actor who moves first defines the terms of debate and forces others into reaction.

Next moves: reduce your exposure, create two options that point in opposite directions, and set a trigger that tells you when to commit. You want optionality early and commitment late.

Finally, hedge reputational risk the same way you hedge capital risk: assume backlash, plan the story, and make your actions legible to the audiences that matter.`,

    `Treat this as a scenario problem, not a certainty problem. The point is not to guess correctly; the point is to stay solvent and decisive across outcomes.

In the likely case, incentives remain stable and actors behave predictably. Your job is to exploit the existing dependency structure while building quiet resilience.

In the most likely case, one constraint tightens and forces trade-offs. That is where you win by having pre-positioned alternatives and by knowing which alliances can be disrupted or reinforced.

In the highly likely case, a catalyst accelerates a cascade: a defection, a resource shock, or a legitimacy event. This is where tripwires and pre-committed actions prevent paralysis.

Next moves: write down the three triggers that would change your stance, the two hedges that keep you alive, and the one move you can execute inside 72 hours with minimal regret.

The discipline is the same across cases: control the periphery, exploit asymmetry, and build a fortress that makes you hard to coerce.`
  ];

  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

