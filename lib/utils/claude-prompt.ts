// ============================================================
// Claude API Prompt Template for Question Generation
// Generates 3 parallel candidate questions per batch
// ============================================================

import type { OceanTrait, QuestionType, TraitVariances } from '../types/index.js';

interface PromptContext {
  sessionSeed: string;
  traitsMeasured: Partial<Record<OceanTrait, number[]>>;
  traitVariances: TraitVariances;
  previousScenarios: string[];
  targetIndustry: string;
  questionCount: number;
}

/**
 * Build the system prompt for Claude API question generation.
 */
export function buildSystemPrompt(): string {
  return `You are a psychometric assessment engine for SME credit scoring.
You generate business scenario questions that measure OCEAN personality traits.

RULES:
1. Generate exactly 3 candidate questions, each targeting a different trait
2. Each question must have 4 response options scored 1-5
3. Each question must include: visual_description (for rendering), text_clue (3-8 words), options[] with {visual_hint, label, score, trait}
4. Scenario context must be business/SME-relevant
5. NEVER repeat a scenario theme used in this session
6. Vary question_type across: grid, bars, budget, timeline, reaction, tradeoff
7. Each response option must be plausible - no obviously "right" answer
8. Scores across the 4 options should span the 1-5 range (e.g., 1.5, 2.5, 3.5, 4.5) to maximize measurement resolution
9. Visual descriptions should be specific enough for rendering (colors, layout, icon suggestions)
10. Questions should feel like a game, not a psychological test

QUESTION TYPES:
- "grid": 2x2 grid of illustrated scenario cards, user taps one. Measures primarily C and N.
- "bars": 5 vertical bars of varying height (spectrum). User taps position. Measures all traits.
- "budget": Hypothetical budget with 3-4 categories. User allocates percentages. Measures C, O, A.
- "timeline": 4-5 business tasks to reorder by priority. User drags to reorder. Measures C, N.
- "reaction": Scenario flashes for 3 seconds, two buttons appear. Time-to-tap measured. Measures N, C.
- "tradeoff": Two options with clear trade-offs, neither obviously right. Measures A, O, E.

RESPOND WITH: A JSON array of exactly 3 question objects. No markdown, no explanation, just valid JSON.

Each question object schema:
{
  "question_id": "unique-id-string",
  "question_type": "grid|bars|budget|timeline|reaction|tradeoff",
  "trait": "O|C|E|A|N",
  "visual_description": "Detailed description for visual rendering",
  "text_clue": "3-8 word prompt shown to user",
  "scenario_theme": "one-word theme tag for dedup",
  "options": [
    {
      "visual_hint": "color/icon/position hint for rendering",
      "label": "Short option label (3-8 words)",
      "score": 1.5,
      "trait": "C"
    }
  ]
}`;
}

/**
 * Build the user prompt with session context for each question generation call.
 */
export function buildUserPrompt(context: PromptContext): string {
  const { sessionSeed, traitsMeasured, traitVariances, previousScenarios, targetIndustry, questionCount } = context;

  // Determine which traits need more measurement
  const traitPriority = Object.entries(traitVariances)
    .sort(([, a], [, b]) => b - a)
    .map(([trait, variance]) => `${trait}: variance=${variance.toFixed(2)}, measurements=${(traitsMeasured[trait as OceanTrait] || []).length}`);

  // Determine which question types haven't been used recently
  const allTypes: QuestionType[] = ['grid', 'bars', 'budget', 'timeline', 'reaction', 'tradeoff'];

  return `SESSION CONTEXT:
- Session seed: ${sessionSeed}
- Question number: ${questionCount + 1}
- Target industry: ${targetIndustry}
- Previous scenario themes (DO NOT reuse): [${previousScenarios.join(', ')}]

TRAIT MEASUREMENT STATUS (prioritize traits with HIGH variance):
${traitPriority.join('\n')}

INSTRUCTIONS:
- Target the 3 traits with HIGHEST variance for your 3 questions
- Use industry "${targetIndustry}" for scenario context
- Choose from question types: ${allTypes.join(', ')}
- Make each question feel like a natural business decision, not a personality test
- Ensure visual_description is detailed enough for game rendering
- Options should have scores that meaningfully differentiate trait levels

Generate 3 candidate questions as a JSON array:`;
}

/**
 * Select the optimal question from 3 candidates.
 * Uses Bayesian adaptive logic: picks the question that
 * maximizes information gain (targets highest-variance trait).
 */
export function selectOptimalQuestion(
  candidates: Array<{ trait: OceanTrait; question_type: QuestionType }>,
  traitVariances: TraitVariances,
  previousTypes: QuestionType[],
): number {
  let bestIndex = 0;
  let bestScore = -Infinity;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    let score = traitVariances[candidate.trait]; // Base: higher variance = better

    // Bonus for question type diversity
    if (!previousTypes.includes(candidate.question_type)) {
      score += 0.2;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}
