import {
  StoryProject,
  CodexEntity,
  EntityClaim,
  ProvenanceRecord,
  EntityRelationship,
  NarrativeRelationshipType,
  calculateReliability,
} from '../types';

export { calculateReliability };

/**
 * Deterministic provisional type classification based on lexical indicators
 */
export function classifyEntityTypes(
  label: string,
  contextSnippets: string[] = []
): {
  primaryType: string;
  candidateTypes: string[];
  classificationConfidence: 'provisional' | 'resolved';
} {
  const l = label.toLowerCase();
  const fullText = (l + ' ' + contextSnippets.join(' ')).toLowerCase();

  // Structure / Landmark vs Object
  const isWellOrBuilding = /\b(well|tower|gate|arch|bridge|temple|shrine|ruin|vault|altar|crossroads|monument|statue|pillar|obelisk)\b/i.test(l);
  const isStructureSpatial = /\b(stood|anchored|built|deep|shaft|masonry|chamber|threshold|overgrowth|beside the road|high above|fixed|unmovable)\b/i.test(fullText);

  if (isWellOrBuilding) {
    if (isStructureSpatial && contextSnippets.length >= 2) {
      return {
        primaryType: 'structure',
        candidateTypes: ['structure', 'landmark', 'location'],
        classificationConfidence: 'resolved',
      };
    }
    return {
      primaryType: 'structure',
      candidateTypes: ['structure', 'landmark', 'location', 'object'],
      classificationConfidence: 'provisional',
    };
  }

  // Creature / Monster / Animal
  if (/\b(moth|butterfly|raven|crow|hawk|falcon|owl|eagle|wolf|hound|dog|cat|rat|mouse|snake|serpent|viper|spider|beetle|dragonfly|stag|deer|horse|stallion|steed|gargoyle|creature|beast|dragon|wyrm|monster)\b/i.test(l)) {
    return {
      primaryType: 'creature',
      candidateTypes: ['creature', 'actor'],
      classificationConfidence: contextSnippets.length >= 2 ? 'resolved' : 'provisional',
    };
  }

  // Location / Place
  if (/\b(forest|valley|mount|mountain|harbor|dock|street|conduit|hall|dungeon|cavern|crossroads|city|room|chamber|courtyard|garden)\b/i.test(l)) {
    return {
      primaryType: 'location',
      candidateTypes: ['location', 'landmark'],
      classificationConfidence: contextSnippets.length >= 2 ? 'resolved' : 'provisional',
    };
  }

  // Actor / Character
  if (/\b(traveler|stranger|man|woman|scribe|master|locke|mara|guard|curator|child|figure|hooded|investigator|locksmith|scholar|king|lord|wanderer|pilgrim|sentry|peddler|blacksmith|monk|priest|assassin|rogue)\b/i.test(l)) {
    return {
      primaryType: 'actor',
      candidateTypes: ['actor'],
      classificationConfidence: contextSnippets.length >= 2 ? 'resolved' : 'provisional',
    };
  }

  // Object / Relic / Mechanism / Curiosity
  if (/\b(device|astrolabe|key|lantern|pick|sword|blade|dagger|scroll|book|ledger|journal|gem|crystal|box|chest|cylinder|mechanism|escapement|pry-bar|pouch|vial|flask|chalice|coin|amulet|ring|locket|pendant|bell|clock|mirror|compass|prism|lens|automaton|artifact|relic|idol|tapestry|parchment|map|seal|talisman|staff|wand|shield|helmet|armor|cloak|goblet)\b/i.test(l)) {
    return {
      primaryType: 'object',
      candidateTypes: ['object', 'relic', 'mechanism'],
      classificationConfidence: contextSnippets.length >= 2 ? 'resolved' : 'provisional',
    };
  }

  return {
    primaryType: 'provisional',
    candidateTypes: ['concept', 'object', 'landmark', 'phenomenon'],
    classificationConfidence: 'provisional',
  };
}

export interface DiscoveredCandidate {
  workingLabel: string;
  primaryType: string;
  candidateTypes: string[];
  classificationConfidence: 'provisional' | 'resolved';
  snippet: string;
}

export interface IdentityResolutionEvidence {
  sourceLabel: string;
  revealedCanonicalName: string;
  confidence: number;
  evidenceBeat: number;
  evidenceSnippet: string;
  triggerType: 'dialogue_disclosure' | 'apposition' | 'unmasking_action' | 'predicate_reveal';
}

const CORE_NOUNS = [
  'moth', 'butterfly', 'raven', 'crow', 'hawk', 'falcon', 'owl', 'eagle',
  'wolf', 'hound', 'dog', 'cat', 'rat', 'mouse', 'snake', 'serpent', 'viper',
  'spider', 'beetle', 'dragonfly', 'stag', 'deer', 'horse', 'steed', 'beast',
  'dragon', 'wyrm', 'gargoyle', 'creature', 'monster',
  'device', 'astrolabe', 'key', 'lantern', 'pick', 'sword', 'blade', 'dagger',
  'scroll', 'book', 'ledger', 'gem', 'crystal', 'box', 'chest', 'cylinder',
  'mechanism', 'escapement', 'pry-bar', 'pouch', 'journal', 'vial', 'flask',
  'chalice', 'coin', 'amulet', 'ring', 'locket', 'pendant', 'bell', 'clock',
  'mirror', 'compass', 'prism', 'lens', 'automaton', 'artifact', 'relic',
  'idol', 'tapestry', 'parchment', 'map', 'seal', 'talisman', 'staff', 'wand',
  'shield', 'helmet', 'armor', 'cloak', 'goblet',
  'well', 'tower', 'gate', 'arch', 'archway', 'bridge', 'temple', 'shrine',
  'ruin', 'vault', 'altar', 'crossroads', 'monument', 'statue', 'pillar',
  'obelisk', 'pedestal', 'brazier', 'hearth', 'fountain', 'dais', 'crypt',
  'tomb', 'spire', 'citadel',
  'stranger', 'wanderer', 'pilgrim', 'sentry', 'peddler', 'blacksmith',
  'scholar', 'scribe', 'monk', 'priest', 'assassin', 'rogue', 'locksmith',
  'curator', 'investigator', 'innkeeper', 'merchant', 'woman', 'man',
  'figure', 'lady', 'lord', 'knight', 'guard', 'child', 'girl', 'boy',
  'traveler', 'seeker', 'sage', 'hermit', 'captive', 'elder'
];

const MODIFIERS = [
  'silver', 'gold', 'golden', 'brass', 'copper', 'bronze', 'iron', 'steel',
  'metal', 'metallic', 'stone', 'wooden', 'wood', 'leather', 'glass',
  'crystal', 'obsidian', 'marble', 'granite', 'ceramic', 'bone', 'clay',
  'ancient', 'weathered', 'rusted', 'ruined', 'pristine', 'ornate', 'carved',
  'engraved', 'tarnished', 'polished', 'cracked', 'mossy', 'overgrown',
  'forgotten', 'dormant', 'clockwork', 'mechanical', 'strange', 'mysterious',
  'glowing', 'dark', 'pale', 'shadowed', 'hooded', 'cloaked', 'masked',
  'armored', 'black', 'white', 'red', 'crimson', 'scarlet', 'blue', 'azure',
  'green', 'emerald', 'amber', 'yellow', 'purple', 'violet', 'grey', 'gray',
  'small', 'large', 'tiny', 'huge', 'heavy', 'slender', 'tall', 'deep', 'old', 'new'
];

const CORE_NOUNS_PATTERN = CORE_NOUNS.join('|');
const MODIFIERS_PATTERN = MODIFIERS.join('|');

/**
 * Open-world novel entity candidate extractor from arbitrary narrative prose.
 * Discovers newly introduced salient objects, creatures, structures, and actors.
 */
export function extractNovelEntityCandidates(
  prose: string,
  knownLabels: Set<string>
): DiscoveredCandidate[] {
  const candidates: DiscoveredCandidate[] = [];
  const foundLabels = new Set<string>();

  const sentences = prose.split(/(?<=[.!?])\s+/);

  const modifiedNounRegex = new RegExp(
    `\\b(?:a|an|the|this|that|one|two|three)\\s+((?:(?:${MODIFIERS_PATTERN})\\s+){1,2})(${CORE_NOUNS_PATTERN})\\b`,
    'gi'
  );

  const bareNounRegex = new RegExp(
    `\\b(?:a|an|the|this|that)\\s+(${CORE_NOUNS_PATTERN})\\b`,
    'gi'
  );

  for (const s of sentences) {
    // 1. Check modified noun phrases (e.g. "silver moth", "stone well", "rusted iron key")
    let match: RegExpExecArray | null;
    modifiedNounRegex.lastIndex = 0;
    while ((match = modifiedNounRegex.exec(s)) !== null) {
      const mod = match[1].trim();
      const noun = match[2].trim();
      const rawLabel = `${mod} ${noun}`.toLowerCase();

      if (!isKnownOrSublabel(rawLabel, knownLabels) && !foundLabels.has(rawLabel)) {
        foundLabels.add(rawLabel);
        const { primaryType, candidateTypes, classificationConfidence } = classifyEntityTypes(rawLabel, [s]);
        candidates.push({
          workingLabel: rawLabel,
          primaryType,
          candidateTypes,
          classificationConfidence,
          snippet: s.trim(),
        });
      }
    }

    // 2. Check bare salient nouns (e.g. "a raven", "the well", "a stranger")
    bareNounRegex.lastIndex = 0;
    while ((match = bareNounRegex.exec(s)) !== null) {
      const noun = match[1].trim().toLowerCase();
      if (!isKnownOrSublabel(noun, knownLabels) && !foundLabels.has(noun)) {
        // Also check if this noun was already matched as part of a modified noun in this sentence
        const alreadyMatchedAsModifier = Array.from(foundLabels).some((fl) => fl.endsWith(noun));
        if (!alreadyMatchedAsModifier) {
          foundLabels.add(noun);
          const { primaryType, candidateTypes, classificationConfidence } = classifyEntityTypes(noun, [s]);
          candidates.push({
            workingLabel: noun,
            primaryType,
            candidateTypes,
            classificationConfidence,
            snippet: s.trim(),
          });
        }
      }
    }
  }

  return candidates;
}

function isKnownOrSublabel(label: string, knownLabels: Set<string>): boolean {
  const l = label.toLowerCase().trim();
  if (knownLabels.has(l)) return true;

  for (const kl of Array.from(knownLabels)) {
    const kll = kl.toLowerCase().trim();
    if (kll === l || kll.includes(l) || l.includes(kll)) {
      return true;
    }
  }
  return false;
}

/**
 * Detects progressive identity evidence from manuscript prose.
 * Discovers when a provisional label (e.g., "hooded woman", "strange device")
 * is revealed to be a named identity (e.g., "Mara", "Sun Key").
 */
export function detectIdentityEvidence(
  prose: string,
  existingLabels: string[],
  beatNumber: number
): IdentityResolutionEvidence[] {
  const results: IdentityResolutionEvidence[] = [];
  const sentences = prose.split(/(?<=[.!?])\s+/);

  for (const s of sentences) {
    const trimmed = s.trim();

    // 1. Dialogue disclosures: "My name is Mara," said the hooded woman.
    const dialogueMatch =
      /["“](?:my name is|i am|call me|they call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)[.!,]?["”]\s*(?:(?:said|whispered|told|replied|murmured|answered|spoke)\s+(?:the|this)\s+([a-z\s]+)|(?:she|he|they)\s+(?:said|whispered|murmured|replied))/i.exec(trimmed);

    if (dialogueMatch) {
      const revealedName = dialogueMatch[1].trim();
      let sourceLabel = dialogueMatch[2]?.trim().toLowerCase();

      // If speaker label was pronoun (she/he), find the provisional entity mentioned in the sentence or existing entities
      if (!sourceLabel) {
        for (const el of existingLabels) {
          if (trimmed.toLowerCase().includes(el.toLowerCase()) && el.toLowerCase() !== revealedName.toLowerCase()) {
            sourceLabel = el;
            break;
          }
        }
      }

      if (sourceLabel && sourceLabel.toLowerCase() !== revealedName.toLowerCase()) {
        results.push({
          sourceLabel,
          revealedCanonicalName: revealedName,
          confidence: 0.95,
          evidenceBeat: beatNumber,
          evidenceSnippet: trimmed,
          triggerType: 'dialogue_disclosure',
        });
      }
    }

    // 1b. Reverse Dialogue: The hooded woman smiled. "My name is Mara."
    const reverseDialogueMatch =
      /(?:the|this)\s+([a-z\s]+?)\s+(?:smiled|spoke|stepped forward|paused|looked at [a-z\s]+)[\.,]?\s*["“](?:my name is|i am|call me|they call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i.exec(trimmed);
    if (reverseDialogueMatch) {
      const sourceLabel = reverseDialogueMatch[1].trim().toLowerCase();
      const revealedName = reverseDialogueMatch[2].trim();
      if (sourceLabel && sourceLabel !== revealedName.toLowerCase()) {
        results.push({
          sourceLabel,
          revealedCanonicalName: revealedName,
          confidence: 0.95,
          evidenceBeat: beatNumber,
          evidenceSnippet: trimmed,
          triggerType: 'dialogue_disclosure',
        });
      }
    }

    // 2. Appositive naming: "Mara, the hooded woman, stepped forward" OR "The hooded woman, Mara, stepped forward"
    const appositiveMatch1 =
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*(?:the|this)\s+([a-z\s]+?)(?:,|\s+who|\s+stepped|\s+smiled|\s+looked|\s+drew|\s+held)/i.exec(trimmed);
    if (appositiveMatch1) {
      const revealedName = appositiveMatch1[1].trim();
      const sourceLabel = appositiveMatch1[2].trim().toLowerCase();
      if (sourceLabel && sourceLabel !== revealedName.toLowerCase()) {
        results.push({
          sourceLabel,
          revealedCanonicalName: revealedName,
          confidence: 0.90,
          evidenceBeat: beatNumber,
          evidenceSnippet: trimmed,
          triggerType: 'apposition',
        });
      }
    }

    const appositiveMatch2 =
      /(?:the|this)\s+([a-z\s]+?),\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),/i.exec(trimmed);
    if (appositiveMatch2) {
      const sourceLabel = appositiveMatch2[1].trim().toLowerCase();
      const revealedName = appositiveMatch2[2].trim();
      if (sourceLabel && sourceLabel !== revealedName.toLowerCase()) {
        results.push({
          sourceLabel,
          revealedCanonicalName: revealedName,
          confidence: 0.90,
          evidenceBeat: beatNumber,
          evidenceSnippet: trimmed,
          triggerType: 'apposition',
        });
      }
    }

    // 3. Unmasking / Physical revelations: "Mara pulled back her hood" / "Beneath the hood was Mara"
    const unmaskMatch1 =
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:pulled back|lowered|removed|shed|cast aside|took off)\s+(?:her|his|their)\s+(hood|mask|veil|cloak|disguise)/i.exec(trimmed);
    if (unmaskMatch1) {
      const revealedName = unmaskMatch1[1].trim();
      const garment = unmaskMatch1[2].trim().toLowerCase();
      // Look for a provisional entity matching `hooded ...`, `masked ...`, etc.
      for (const el of existingLabels) {
        if (el.toLowerCase().includes(garment) || (garment === 'hood' && el.toLowerCase().includes('hooded'))) {
          if (el.toLowerCase() !== revealedName.toLowerCase()) {
            results.push({
              sourceLabel: el,
              revealedCanonicalName: revealedName,
              confidence: 0.85,
              evidenceBeat: beatNumber,
              evidenceSnippet: trimmed,
              triggerType: 'unmasking_action',
            });
          }
        }
      }
    }

    const unmaskMatch2 =
      /(?:beneath|under)\s+(?:the|her|his|their)\s+(?:hood|mask|veil|cloak|disguise)\s+(?:was|stood|sat|smiled|appeared)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i.exec(trimmed);
    if (unmaskMatch2) {
      const revealedName = unmaskMatch2[1].trim();
      for (const el of existingLabels) {
        if (el.toLowerCase().includes('hood') || el.toLowerCase().includes('mask') || el.toLowerCase().includes('stranger') || el.toLowerCase().includes('figure')) {
          if (el.toLowerCase() !== revealedName.toLowerCase()) {
            results.push({
              sourceLabel: el,
              revealedCanonicalName: revealedName,
              confidence: 0.90,
              evidenceBeat: beatNumber,
              evidenceSnippet: trimmed,
              triggerType: 'unmasking_action',
            });
          }
        }
      }
    }

    // 4. Copular / predicate revelations: "The hooded woman was revealed as Mara" / "The strange device was called the Sun Key"
    const predicateMatch =
      /(?:the|this)\s+([a-z\s]+?)\s+(?:was|is)\s+(?:none other than|revealed to be|revealed as|in fact|called|named|known as)\s+(?:the\s+)?([A-Za-z0-9\s]+?)(?:\.|\,|$)/i.exec(trimmed);
    if (predicateMatch) {
      const sourceLabel = predicateMatch[1].trim().toLowerCase();
      const revealedName = predicateMatch[2].trim();
      if (sourceLabel && sourceLabel !== revealedName.toLowerCase()) {
        results.push({
          sourceLabel,
          revealedCanonicalName: revealedName,
          confidence: 0.85,
          evidenceBeat: beatNumber,
          evidenceSnippet: trimmed,
          triggerType: 'predicate_reveal',
        });
      }
    }
  }

  return results;
}

/**
 * Strict Possession & Relational Grammar Detection
 * Distinguishes: mentions, sees, notices, approaches, touches, uses, carries, holds, owns, possesses, stands_beside, is_located_near, rests_on
 * Accurately determines the grammatical subject of the action when multiple actors or POV actors are involved.
 */
export function detectEntityInteractions(
  prose: string,
  entityLabel: string,
  actorLabel?: string,
  knownActors: { id: string; name?: string | null; working_label?: string; aliases?: string[] }[] = []
): {
  relationshipType: NarrativeRelationshipType;
  isPossession: boolean;
  isRelease: boolean;
  targetId?: string;
  actingSubjectId?: string;
  actingSubjectLabel?: string;
  quoteSnippet: string;
} {
  const lowerProse = prose.toLowerCase();
  const lowerEnt = entityLabel.toLowerCase();

  // Find sentence or clause containing entity
  const sentences = prose.split(/(?<=[.!?])\s+/);
  const matchedSentence = sentences.find((s) => s.toLowerCase().includes(lowerEnt)) || prose;
  const lowerSentence = matchedSentence.toLowerCase();

  // Explicit Possession acquisition
  const isPickup =
    /\b(picked up|took up|slipped into (his|her|their|a) (pocket|bag|pouch)|drew (his|her|their)|grasped|seized|lifted the|pocketed|clasped the|drew the)\b/i.test(lowerSentence) &&
    !/\b(dropped|released|put down|set down|placed|rested|lay|fell)\b/i.test(lowerSentence);

  const isHolding =
    /\b(carried|carrying|holding|wielding|in (his|her|their) (hand|grip|fingers|pocket|belt|sheath)|strapped to)\b/i.test(lowerSentence);

  // Explicit Release / Dropping / Placing down
  const isRelease =
    /\b(put down|set down|placed the|laid the|dropped the|slipped from|let go of|rested the|abandoned the|left the)\b/i.test(lowerSentence);

  // Rested on / Sitting on (Spatial, NOT possession)
  const isResting =
    /\b(rested on|resting on|lay upon|sat atop|perched on|sitting on|nested within|affixed to|stood upon)\b/i.test(lowerSentence);

  // Approaches / Stands beside / Sees / Notices
  const isPerception =
    /\b(saw|seen|spotted|noticed|observed|glanced at|looked upon|beheld|examined|gazed at)\b/i.test(lowerSentence);

  const isApproach =
    /\b(approached|walked toward|stepped toward|drew near|knelt before|bent near)\b/i.test(lowerSentence);

  const isTouch =
    /\b(touched|brushed|grazed|fingertips against|felt the surface of|reached toward)\b/i.test(lowerSentence);

  // Helper to extract the acting actor subject from the sentence/prose
  const resolveActingSubject = (): { id?: string; label?: string } => {
    // 1. Identify actor names / labels in the sentence and their positions relative to the action verb
    if (knownActors.length > 0) {
      type ActorMatch = { actor: typeof knownActors[0]; index: number; label: string; length: number };
      const actorMatches: ActorMatch[] = [];

      for (const a of knownActors) {
        const names = [a.name, a.working_label, ...(a.aliases || [])].filter(Boolean) as string[];
        for (const n of names) {
          // Look for whole word or exact name matches in the sentence
          const regex = new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          const m = lowerSentence.match(regex);
          if (m && m.index !== undefined) {
            actorMatches.push({ actor: a, index: m.index, label: n, length: n.length });
          }
        }
      }

      if (actorMatches.length > 0) {
        // Find position of the action verb in the sentence
        const actionPatterns = [
          /\b(picked up|took up|slipped|drew|grasped|seized|lifted|pocketed|clasped)\b/i,
          /\b(carried|carrying|holding|wielding)\b/i,
          /\b(put down|set down|placed|laid|dropped|let go|rested|abandoned|left)\b/i,
          /\b(saw|seen|spotted|noticed|observed|glanced|looked|beheld|examined|gazed)\b/i,
          /\b(approached|walked|stepped|knelt|bent)\b/i,
          /\b(touched|brushed|grazed|felt|reached)\b/i,
        ];

        let actionIdx = -1;
        for (const pat of actionPatterns) {
          const m = lowerSentence.match(pat);
          if (m && m.index !== undefined) {
            actionIdx = m.index;
            break;
          }
        }

        if (actionIdx !== -1) {
          // Preceding subjects (actors occurring before the action verb in the same sentence or clause)
          const subjectsBefore = actorMatches.filter((m) => m.index < actionIdx);
          if (subjectsBefore.length > 0) {
            // Closest subject before the verb (e.g. in "Tran watched as Mara picked up...", Mara is closer before "picked up")
            subjectsBefore.sort((a, b) => b.index - a.index);
            const best = subjectsBefore[0];
            return { id: best.actor.id, label: best.actor.name || best.actor.working_label };
          }
        }

        // Fallback within sentence: the actor mentioned in the sentence
        actorMatches.sort((a, b) => a.index - b.index);
        const first = actorMatches[0];
        return { id: first.actor.id, label: first.actor.name || first.actor.working_label };
      }
    }

    // 2. Fallback to explicit actorLabel if provided
    if (actorLabel) {
      const match = knownActors.find((a) => {
        const names = [a.name, a.working_label, ...(a.aliases || [])].filter(Boolean) as string[];
        return names.some((n) => n.toLowerCase() === actorLabel.toLowerCase());
      });
      if (match) return { id: match.id, label: match.name || match.working_label };
    }

    return {};
  };

  const actingSubject = resolveActingSubject();

  if (isPickup || isHolding) {
    return {
      relationshipType: 'holds',
      isPossession: true,
      isRelease: false,
      targetId: actingSubject.id,
      actingSubjectId: actingSubject.id,
      actingSubjectLabel: actingSubject.label,
      quoteSnippet: matchedSentence.trim(),
    };
  }

  if (isRelease) {
    return {
      relationshipType: 'rests_on',
      isPossession: false,
      isRelease: true,
      targetId: actingSubject.id,
      actingSubjectId: actingSubject.id,
      actingSubjectLabel: actingSubject.label,
      quoteSnippet: matchedSentence.trim(),
    };
  }

  if (isResting) {
    return {
      relationshipType: 'rests_on',
      isPossession: false,
      isRelease: false,
      quoteSnippet: matchedSentence.trim(),
    };
  }

  if (isPerception) {
    return {
      relationshipType: 'sees',
      isPossession: false,
      isRelease: false,
      targetId: actingSubject.id,
      actingSubjectId: actingSubject.id,
      actingSubjectLabel: actingSubject.label,
      quoteSnippet: matchedSentence.trim(),
    };
  }

  if (isTouch) {
    return {
      relationshipType: 'touches',
      isPossession: false,
      isRelease: false,
      targetId: actingSubject.id,
      actingSubjectId: actingSubject.id,
      actingSubjectLabel: actingSubject.label,
      quoteSnippet: matchedSentence.trim(),
    };
  }

  if (isApproach) {
    return {
      relationshipType: 'approaches',
      isPossession: false,
      isRelease: false,
      targetId: actingSubject.id,
      actingSubjectId: actingSubject.id,
      actingSubjectLabel: actingSubject.label,
      quoteSnippet: matchedSentence.trim(),
    };
  }

  return {
    relationshipType: 'mentions',
    isPossession: false,
    isRelease: false,
    quoteSnippet: matchedSentence.trim(),
  };
}

/**
 * Extract distinct narrative claims about an entity from canonical prose
 */
export function extractClaimsFromProse(
  prose: string,
  entityLabel: string,
  beatNumber: number,
  aliases: string[] = []
): EntityClaim[] {
  const claims: EntityClaim[] = [];
  const lowerProse = prose.toLowerCase();

  const searchLabels = [
    entityLabel,
    ...aliases,
  ].filter(Boolean).map((l) => l.toLowerCase());

  const trimmed = entityLabel.replace(/^(small|large|tiny|huge|abandoned|ancient|old|new|strange|mysterious|quiet)\s+/i, '').toLowerCase();
  if (trimmed && !searchLabels.includes(trimmed)) {
    searchLabels.push(trimmed);
  }

  // Find relevant sentences
  const sentences = prose
    .split(/(?<=[.!?])\s+/)
    .filter((s) => {
      const ls = s.toLowerCase();
      return searchLabels.some((lbl) => ls.includes(lbl));
    });

  const lowerEnt = entityLabel.toLowerCase();

  for (const s of sentences) {
    const ls = s.toLowerCase();

    // Create a descriptor text with the entity labels masked out so mentioning its name does not create false claims
    let descText = ls;
    for (const lbl of searchLabels) {
      if (lbl.length >= 3) {
        descText = descText.split(lbl.toLowerCase()).join(' [entity] ');
      }
    }

    // Material claims (must appear in descriptive context outside the entity's base label or with explicit formulation)
    if (/\bstone\b/i.test(descText) && /\bwell\b/i.test(lowerEnt)) {
      claims.push({
        id: `claim_${entityLabel.replace(/\s+/g, '_')}_stone_${beatNumber}`,
        claim: 'is made of stone',
        status: 'supported',
        evidence_beats: [beatNumber],
        evidence_quotes: [s.trim()],
        evidence_count: 1,
        first_seen_beat: beatNumber,
        last_seen_beat: beatNumber,
      });
    }

    if (/\b(abandoned|ruined|dormant|disused|ancient|weathered|pristine|tarnished|rusted|cracked|overgrown)\b/i.test(descText)) {
      const condMatch = descText.match(/\b(abandoned|ruined|dormant|disused|ancient|weathered|pristine|tarnished|rusted|cracked|overgrown)\b/i);
      if (condMatch) {
        claims.push({
          id: `claim_${entityLabel.replace(/\s+/g, '_')}_cond_${condMatch[1]}_${beatNumber}`,
          claim: `condition is ${condMatch[1]}`,
          status: 'supported',
          evidence_beats: [beatNumber],
          evidence_quotes: [s.trim()],
          evidence_count: 1,
          first_seen_beat: beatNumber,
          last_seen_beat: beatNumber,
        });
      }
    }

    if (/\b(brass|copper|iron|bronze|wood|gold|silver|crystal|glass|steel|obsidian|marble|bone|leather|ceramic|granite)\b/i.test(descText)) {
      const match = descText.match(/\b(brass|copper|iron|bronze|wood|gold|silver|crystal|glass|steel|obsidian|marble|bone|leather|ceramic|granite)\b/i);
      if (match) {
        claims.push({
          id: `claim_${entityLabel.replace(/\s+/g, '_')}_mat_${match[1]}_${beatNumber}`,
          claim: `is made of ${match[1]}`,
          status: 'supported',
          evidence_beats: [beatNumber],
          evidence_quotes: [s.trim()],
          evidence_count: 1,
          first_seen_beat: beatNumber,
          last_seen_beat: beatNumber,
        });
      }
    }

    // Light emission & sensory claims (and check for contradictions)
    if (/\b(amber|blue|crimson|green|white|golden|emerald|scarlet|violet|azure|purple|yellow)\s+(light|glow|beam|luminescence|pulse|shimmer)\b/i.test(descText) ||
        /\b(emitted|emanated|pulsed with|glowed with|shone with)\s+(amber|blue|crimson|green|white|golden|emerald|scarlet|violet|azure|purple|yellow)\b/i.test(descText)) {
      const colorMatch = descText.match(/\b(amber|blue|crimson|green|white|golden|emerald|scarlet|violet|azure|purple|yellow)\b/i);
      if (colorMatch) {
        claims.push({
          id: `claim_${entityLabel.replace(/\s+/g, '_')}_glow_${colorMatch[1]}_${beatNumber}`,
          claim: `emits ${colorMatch[1]} light`,
          status: 'supported',
          evidence_beats: [beatNumber],
          evidence_quotes: [s.trim()],
          evidence_count: 1,
          first_seen_beat: beatNumber,
          last_seen_beat: beatNumber,
        });
      }
    } else if (/\b(glowed|glowing|emitted light|pulsed with light|luminescent)\b/i.test(descText)) {
      claims.push({
        id: `claim_${entityLabel.replace(/\s+/g, '_')}_glow_general_${beatNumber}`,
        claim: 'emits light/glow',
        status: 'supported',
        evidence_beats: [beatNumber],
        evidence_quotes: [s.trim()],
        evidence_count: 1,
        first_seen_beat: beatNumber,
        last_seen_beat: beatNumber,
      });
    }

    // Acoustic & Thermal properties
    if (/\b(humming|ticking|clicking|vibrating|chiming|whirring|buzzing)\b/i.test(descText)) {
      const soundMatch = descText.match(/\b(humming|ticking|clicking|vibrating|chiming|whirring|buzzing)\b/i);
      if (soundMatch) {
        claims.push({
          id: `claim_${entityLabel.replace(/\s+/g, '_')}_sound_${soundMatch[1]}_${beatNumber}`,
          claim: `produces ${soundMatch[1]} sound/vibration`,
          status: 'supported',
          evidence_beats: [beatNumber],
          evidence_quotes: [s.trim()],
          evidence_count: 1,
          first_seen_beat: beatNumber,
          last_seen_beat: beatNumber,
        });
      }
    }

    if (/\b(cold to the touch|warm to the touch|radiating heat|icy|burning cold|scalding|cold|warm)\b/i.test(descText)) {
      const tempMatch = descText.match(/\b(cold to the touch|warm to the touch|radiating heat|icy|burning cold|scalding|cold|warm)\b/i);
      if (tempMatch) {
        claims.push({
          id: `claim_${entityLabel.replace(/\s+/g, '_')}_temp_${beatNumber}`,
          claim: `thermal state is ${tempMatch[1]}`,
          status: 'supported',
          evidence_beats: [beatNumber],
          evidence_quotes: [s.trim()],
          evidence_count: 1,
          first_seen_beat: beatNumber,
          last_seen_beat: beatNumber,
        });
      }
    }

    // Mechanism & affordance claims
    if (/\b(gears|cogs|clockwork|escapement|spring-wound|dials|switches|levers|lenses|aperture|interlocking plates|inscriptions|runes|sigils)\b/i.test(descText)) {
      const mechMatch = descText.match(/\b(gears|cogs|clockwork|escapement|spring-wound|dials|switches|levers|lenses|aperture|interlocking plates|inscriptions|runes|sigils)\b/i);
      if (mechMatch) {
        claims.push({
          id: `claim_${entityLabel.replace(/\s+/g, '_')}_mech_${mechMatch[1]}_${beatNumber}`,
          claim: `features ${mechMatch[1]}`,
          status: 'supported',
          evidence_beats: [beatNumber],
          evidence_quotes: [s.trim()],
          evidence_count: 1,
          first_seen_beat: beatNumber,
          last_seen_beat: beatNumber,
        });
      }
    }

    // Spatial rest claims
    if (/\b(resting on|rested on|atop|upon|housed inside|suspended from|anchored to)\s+(the\s+)?([a-z\s]+)/i.test(descText)) {
      const restMatch = descText.match(/\b(?:resting on|rested on|atop|upon|housed inside|suspended from|anchored to)\s+(?:the\s+)?([a-z0-9_\-\s]{3,30})/i);
      if (restMatch && restMatch[1]) {
        claims.push({
          id: `claim_${entityLabel.replace(/\s+/g, '_')}_rest_${beatNumber}`,
          claim: `rests on ${restMatch[1].trim()}`,
          status: 'supported',
          evidence_beats: [beatNumber],
          evidence_quotes: [s.trim()],
          evidence_count: 1,
          first_seen_beat: beatNumber,
          last_seen_beat: beatNumber,
        });
      }
    }
  }

  // Base classification claim (marks occurrence / mention)
  claims.push({
    id: `claim_${entityLabel.replace(/\s+/g, '_')}_type_${beatNumber}`,
    claim: `observed as "${entityLabel}"`,
    status: 'supported',
    evidence_beats: [beatNumber],
    evidence_quotes: sentences.length > 0 ? [sentences[0].trim()] : [prose.slice(0, 80)],
    evidence_count: 1,
    first_seen_beat: beatNumber,
    last_seen_beat: beatNumber,
  });

  return claims;
}

/**
 * Helper to identify whether a claim is a generic mention vs an informative claim
 */
export function isGenericMentionClaim(claim: string): boolean {
  return /^observed as\s+"/i.test(claim);
}

/**
 * Calculates distinct corroborating evidence count based on:
 * - Base existence / first appearance in manuscript (1 unit)
 * - Distinct informative claims (materials, condition, sensory, mechanism, spatial rest) discovered in subsequent beats (+1 per distinct claim)
 * - Cross-beat corroborations of specific informative claims (+1 per additional corroborating beat where the claim was re-observed)
 * - Distinct active physical operations / interactions (pickup, touch, manipulate) in subsequent beats (+1 per beat)
 */
export function computeDistinctEvidenceCount(
  ent: CodexEntity,
  distinctBeats?: Set<number>
): number {
  const beatList = distinctBeats ? Array.from(distinctBeats.values()) : [];
  if (beatList.length === 0 && (!ent.evidence || ent.evidence.length === 0)) {
    return 0;
  }

  const firstSeenBeat = beatList.length > 0 ? Math.min(...beatList) : 1;
  let count = 1; // Base existence / initial encounter

  // Filter for informative (non-generic) claims with supported status
  const informativeClaims = (ent.claims || []).filter(
    (c) => !isGenericMentionClaim(c.claim) && c.status !== 'unsupported'
  );

  // 1. New informative claims discovered after the initial appearance beat
  for (const claim of informativeClaims) {
    if (claim.first_seen_beat !== undefined && claim.first_seen_beat > firstSeenBeat) {
      count += 1;
    }

    // 2. Corroborations of this specific claim across multiple distinct beats
    if (Array.isArray(claim.evidence_beats) && claim.evidence_beats.length > 1) {
      const distinctCorroboratingBeats = claim.evidence_beats.filter(
        (b) => b !== claim.first_seen_beat
      );
      count += distinctCorroboratingBeats.length;
    }
  }

  // 3. Active physical verifications (pickup, touch, operation) in beats after first seen
  const activePhysicalBeats = new Set<number>();
  for (const prov of ent.evidence || []) {
    if (
      prov.beat > firstSeenBeat &&
      ['holds', 'touches', 'uses'].includes(prov.relationship_produced || '')
    ) {
      activePhysicalBeats.add(prov.beat);
    }
  }
  count += activePhysicalBeats.size;

  return count;
}

/**
 * Merges new claims into an existing claim list, detecting contradictions
 * without overwriting previous evidence.
 */
export function mergeClaims(
  existingClaims: EntityClaim[],
  newClaims: EntityClaim[]
): EntityClaim[] {
  const result: EntityClaim[] = [...existingClaims];

  for (const nc of newClaims) {
    // Check for light emission contradiction (e.g. emits blue light vs emits crimson light)
    const glowMatch = nc.claim.match(/^emits\s+([a-z]+)\s+light$/i);
    if (glowMatch) {
      const newColor = glowMatch[1].toLowerCase();
      const priorGlowClaim = result.find((c) => c.claim.startsWith('emits ') && c.claim.endsWith(' light'));
      if (priorGlowClaim) {
        const priorColorMatch = priorGlowClaim.claim.match(/^emits\s+([a-z]+)\s+light$/i);
        const priorColor = priorColorMatch ? priorColorMatch[1].toLowerCase() : '';
        if (priorColor && priorColor !== newColor) {
          // CONTRADICTION DETECTED!
          priorGlowClaim.status = 'contradicted';
          priorGlowClaim.contradiction_notes = `Contradiction with Beat ${nc.evidence_beats.join(',')}: previously observed as ${priorColor}, later observed as ${newColor}.`;
          
          nc.status = 'contradicted';
          nc.contradiction_notes = `Contradiction with Beat ${priorGlowClaim.evidence_beats.join(',')}: previously observed as ${priorColor}, later observed as ${newColor}.`;
          result.push(nc);
          continue;
        }
      }
    }

    // Exact or semantic match with existing claim -> corroboration
    const existing = result.find(
      (ec) => ec.claim.toLowerCase().trim() === nc.claim.toLowerCase().trim()
    );

    if (existing) {
      for (const b of nc.evidence_beats) {
        if (!existing.evidence_beats.includes(b)) {
          existing.evidence_beats.push(b);
          existing.evidence_count = existing.evidence_beats.length;
        }
      }
      for (const q of nc.evidence_quotes) {
        if (!existing.evidence_quotes.includes(q)) {
          existing.evidence_quotes.push(q);
        }
      }
      if (nc.last_seen_beat !== undefined) {
        existing.last_seen_beat = Math.max(existing.last_seen_beat || 0, nc.last_seen_beat);
      }
    } else {
      result.push(nc);
    }
  }

  return result;
}

/**
 * Synthesizes the authoritative Accumulated Codex for a project from
 * canonical manuscript beats, receipts, and established entities.
 */
export function synthesizeCodex(project: StoryProject): CodexEntity[] {
  const codexMap = new Map<string, CodexEntity>();

  const getOrCreate = (
    id: string,
    workingLabel: string,
    defaultType: string,
    initialBeat: number = 1
  ): CodexEntity => {
    if (!codexMap.has(id)) {
      const { candidateTypes, classificationConfidence } = classifyEntityTypes(workingLabel);
      codexMap.set(id, {
        id,
        working_label: workingLabel,
        canonical_label: null,
        entity_type: defaultType || candidateTypes[0] || 'provisional',
        classification_confidence: classificationConfidence,
        candidate_types: candidateTypes,
        reliability: 0.0,
        salience: 0.5,
        mention_count: 0,
        distinct_evidence_count: 0,
        first_seen: `Beat ${initialBeat} (T${initialBeat})`,
        last_seen: `Beat ${initialBeat} (T${initialBeat})`,
        aliases: [],
        claims: [],
        evidence: [],
        relationships: [],
        current_state: {},
        current_holder_id: null,
        current_location_id: project.currentPosition.location_id,
        isPresent: true,
        is_author_locked: false,
      });
    }
    return codexMap.get(id)!;
  };

  // 1. Ingest baseline actors
  for (const a of project.actors) {
    const ent = getOrCreate(a.id, a.identity.working_label || a.identity.name || a.id, 'actor', 1);
    ent.canonical_label = a.identity.name;
    ent.aliases = a.identity.aliases || [];
    ent.current_location_id = a.current_location_id;
    ent.salience = a.roles.story.includes('protagonist') ? 0.95 : 0.65;
    ent.classification_confidence = 'resolved';
    ent.candidate_types = ['actor'];
    if (a.is_author_locked) {
      ent.is_author_locked = true;
      ent.reliability = 1.0;
    }
  }

  // 2. Ingest baseline objects
  for (const o of project.objects) {
    const { primaryType, candidateTypes, classificationConfidence } = classifyEntityTypes(
      o.identity.working_label || o.identity.name || o.id
    );
    const ent = getOrCreate(o.id, o.identity.working_label || o.identity.name || o.id, primaryType, 1);
    ent.canonical_label = o.identity.name;
    ent.aliases = o.identity.aliases || [];
    ent.current_location_id = o.current_location_id;
    ent.current_holder_id = o.current_holder_id;
    ent.salience = o.salience || 0.6;
    ent.candidate_types = candidateTypes;
    ent.classification_confidence = classificationConfidence;
    if (o.is_author_locked) {
      ent.is_author_locked = true;
      ent.reliability = 1.0;
    }
  }

  // 3. Ingest baseline locations
  for (const loc of project.locations) {
    const ent = getOrCreate(loc.id, loc.identity.working_label || loc.identity.name || loc.id, 'location', 1);
    ent.canonical_label = loc.identity.name;
    ent.aliases = loc.identity.aliases || [];
    ent.salience = 0.7;
    ent.classification_confidence = 'resolved';
    ent.candidate_types = ['location', 'landmark'];
  }

  // 4. Ingest baseline factions
  for (const f of project.factions || []) {
    const ent = getOrCreate(f.id, f.identity.working_label || f.identity.name || f.id, 'faction', 1);
    ent.canonical_label = f.identity.name;
    ent.aliases = f.identity.aliases || [];
    ent.salience = 0.5;
    ent.classification_confidence = 'resolved';
    ent.candidate_types = ['faction', 'organization'];
  }

  // 5. Ingest existing codex entities stored in project
  if (Array.isArray(project.codexEntities)) {
    for (const ce of project.codexEntities) {
      const existing = codexMap.get(ce.id);
      if (existing) {
        codexMap.set(ce.id, {
          ...existing,
          ...ce,
          claims: mergeClaims(existing.claims, ce.claims || []),
        });
      } else {
        codexMap.set(ce.id, { ...ce });
      }
    }
  }

  // 6. Chronologically replay ONLY CANONICAL manuscript beats & receipts
  const distinctBeatsByEntity = new Map<string, Set<number>>();
  const quotesByEntity = new Map<string, string[]>();

  const knownActorsList = project.actors.map((a) => ({
    id: a.id,
    name: a.identity.name,
    working_label: a.identity.working_label,
    aliases: a.identity.aliases || [],
  }));

  for (const beat of project.manuscript) {
    const bNum = beat.beatNumber;
    const prose = beat.text;
    const lowerProse = prose.toLowerCase();

    const povActor = project.actors.find((a) => a.id === beat.povActorId);
    const povActorLabel = povActor ? (povActor.identity.name || povActor.identity.working_label) : undefined;

    // Discover novel entities introduced in this beat's prose that are not yet in codex
    const currentKnownLabels = new Set<string>();
    for (const ent of codexMap.values()) {
      if (ent.working_label) currentKnownLabels.add(ent.working_label.toLowerCase());
      if (ent.canonical_label) currentKnownLabels.add(ent.canonical_label.toLowerCase());
      for (const al of ent.aliases || []) {
        if (al) currentKnownLabels.add(al.toLowerCase());
      }
    }

    const discovered = extractNovelEntityCandidates(prose, currentKnownLabels);
    for (const cand of discovered) {
      const sanitizedId = `ent_${cand.workingLabel.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`;
      if (!codexMap.has(sanitizedId)) {
        const ent = getOrCreate(sanitizedId, cand.workingLabel, cand.primaryType, bNum);
        ent.candidate_types = cand.candidateTypes;
        ent.classification_confidence = cand.classificationConfidence;
        ent.first_seen = `Beat ${bNum} (T${bNum})`;
        ent.last_seen = `Beat ${bNum} (T${bNum})`;
      }
    }

    for (const [entId, ent] of Array.from(codexMap.entries())) {
      const labelsToCheck = [
        ent.working_label,
        ent.canonical_label,
        ...(ent.aliases || []),
      ].filter(Boolean) as string[];

      if (ent.working_label) {
        const trimmed = ent.working_label.replace(/^(small|large|tiny|huge|abandoned|ancient|old|new|strange|mysterious|quiet)\s+/i, '');
        if (trimmed && trimmed !== ent.working_label && !labelsToCheck.includes(trimmed)) {
          labelsToCheck.push(trimmed);
        }
      }

      let mentionedInBeat = false;
      let matchedSnippet = '';

      for (const lbl of labelsToCheck) {
        if (lowerProse.includes(lbl.toLowerCase())) {
          mentionedInBeat = true;
          ent.mention_count += 1;
          break;
        }
      }

      if (mentionedInBeat) {
        if (!distinctBeatsByEntity.has(entId)) {
          distinctBeatsByEntity.set(entId, new Set<number>());
        }
        distinctBeatsByEntity.get(entId)!.add(bNum);

        if (!quotesByEntity.has(entId)) {
          quotesByEntity.set(entId, []);
        }

        const interaction = detectEntityInteractions(
          prose,
          ent.working_label,
          povActorLabel,
          knownActorsList
        );
        matchedSnippet = interaction.quoteSnippet;
        quotesByEntity.get(entId)!.push(matchedSnippet);

        const resolvedHolderId = interaction.actingSubjectId || beat.povActorId;

        if (interaction.isPossession) {
          ent.current_holder_id = resolvedHolderId;
        } else if (interaction.isRelease) {
          ent.current_holder_id = null;
        }

        const prov: ProvenanceRecord = {
          id: `prov_${entId}_b${bNum}_${Date.now()}`,
          project_id: project.id,
          chapter: project.currentPosition.chapter,
          beat: bNum,
          temporal_state: `T${bNum}`,
          pov_actor_id: beat.povActorId,
          source_text: matchedSnippet,
          entity_mention: ent.working_label,
          claim_produced: `Observed during Beat ${bNum}`,
          relationship_produced: interaction.relationshipType,
          reliability_delta: 0,
          timestamp: beat.acceptedAt || Date.now(),
        };
        ent.evidence.push(prov);

        const relSourceId = interaction.actingSubjectId || beat.povActorId;
        const rel: EntityRelationship = {
          id: `rel_${entId}_${relSourceId}_b${bNum}`,
          type: interaction.relationshipType,
          source_id: relSourceId,
          target_id: entId,
          status: 'supported',
          established_beat: bNum,
          evidence_quote: matchedSnippet,
        };
        ent.relationships.push(rel);

        const extractedClaims = extractClaimsFromProse(prose, ent.working_label, bNum, labelsToCheck);
        ent.claims = mergeClaims(ent.claims, extractedClaims);

        ent.last_seen = `Beat ${bNum} (T${bNum})`;
      }
    }

    // 6b. Progressive Identity & Alias Resolution Detection
    const allKnownLabelsForId: string[] = [];
    for (const ent of codexMap.values()) {
      if (ent.working_label) allKnownLabelsForId.push(ent.working_label);
      if (ent.canonical_label) allKnownLabelsForId.push(ent.canonical_label);
      for (const al of ent.aliases || []) {
        if (al) allKnownLabelsForId.push(al);
      }
    }

    const idResolutions = detectIdentityEvidence(prose, allKnownLabelsForId, bNum);
    for (const res of idResolutions) {
      // Find source entity (the provisional entity, e.g. "hooded woman")
      const sourceEnt = Array.from(codexMap.values()).find((e) => {
        const wl = e.working_label.toLowerCase();
        const cl = e.canonical_label?.toLowerCase() || '';
        const sl = res.sourceLabel.toLowerCase();
        return wl === sl || cl === sl || wl.includes(sl) || sl.includes(wl);
      });

      if (!sourceEnt) continue;

      // Check if target named entity (e.g. "Mara") already exists in codexMap
      const targetEnt = Array.from(codexMap.values()).find((e) => {
        if (e.id === sourceEnt.id) return false;
        const wl = e.working_label.toLowerCase();
        const cl = e.canonical_label?.toLowerCase() || '';
        const rl = res.revealedCanonicalName.toLowerCase();
        return wl === rl || cl === rl || (e.aliases && e.aliases.some((a) => a.toLowerCase() === rl));
      });

      if (targetEnt) {
        // MERGE sourceEnt INTO targetEnt
        const sourceLabelToAdd = sourceEnt.working_label;
        if (!targetEnt.aliases.includes(sourceLabelToAdd)) {
          targetEnt.aliases.push(sourceLabelToAdd);
        }
        for (const al of sourceEnt.aliases || []) {
          if (al && !targetEnt.aliases.includes(al) && al.toLowerCase() !== targetEnt.working_label.toLowerCase()) {
            targetEnt.aliases.push(al);
          }
        }

        // Merge claims
        targetEnt.claims = mergeClaims(targetEnt.claims, sourceEnt.claims);
        // Merge evidence provenance
        targetEnt.evidence.push(...sourceEnt.evidence);
        // Merge relationships (re-targeting sourceEnt.id to targetEnt.id)
        for (const r of sourceEnt.relationships) {
          const updatedRel: EntityRelationship = {
            ...r,
            source_id: r.source_id === sourceEnt.id ? targetEnt.id : r.source_id,
            target_id: r.target_id === sourceEnt.id ? targetEnt.id : r.target_id,
          };
          targetEnt.relationships.push(updatedRel);
        }

        // Merge distinct evidence beats
        const sourceBeats = distinctBeatsByEntity.get(sourceEnt.id) || new Set();
        if (!distinctBeatsByEntity.has(targetEnt.id)) {
          distinctBeatsByEntity.set(targetEnt.id, new Set<number>());
        }
        for (const sb of sourceBeats) {
          distinctBeatsByEntity.get(targetEnt.id)!.add(sb);
        }
        distinctBeatsByEntity.get(targetEnt.id)!.add(bNum);

        // Merge quotes
        const sourceQuotes = quotesByEntity.get(sourceEnt.id) || [];
        if (!quotesByEntity.has(targetEnt.id)) {
          quotesByEntity.set(targetEnt.id, []);
        }
        quotesByEntity.get(targetEnt.id)!.push(...sourceQuotes, res.evidenceSnippet);

        // Add identity resolution claim
        targetEnt.claims.push({
          id: `claim_idres_${targetEnt.id}_b${bNum}`,
          claim: `Identified as ${targetEnt.canonical_label || targetEnt.working_label} (formerly recognized as ${sourceEnt.working_label})`,
          status: 'supported',
          evidence_beats: [bNum],
          evidence_quotes: [res.evidenceSnippet],
          evidence_count: 1,
          first_seen_beat: bNum,
          last_seen_beat: bNum,
        });

        targetEnt.classification_confidence = 'resolved';
        targetEnt.last_seen = `Beat ${bNum} (T${bNum})`;
        targetEnt.mention_count += sourceEnt.mention_count;

        // Remove source provisional entity from codexMap
        codexMap.delete(sourceEnt.id);
        distinctBeatsByEntity.delete(sourceEnt.id);
        quotesByEntity.delete(sourceEnt.id);
      } else {
        // Resolve sourceEnt's canonical identity in-place
        const oldLabel = sourceEnt.working_label;
        if (!sourceEnt.aliases.includes(oldLabel)) {
          sourceEnt.aliases.push(oldLabel);
        }
        sourceEnt.canonical_label = res.revealedCanonicalName;
        sourceEnt.working_label = res.revealedCanonicalName;
        sourceEnt.classification_confidence = 'resolved';
        if (sourceEnt.candidate_types?.includes('actor') || sourceEnt.entity_type === 'actor') {
          sourceEnt.entity_type = 'actor';
        }
        
        sourceEnt.claims.push({
          id: `claim_idres_${sourceEnt.id}_b${bNum}`,
          claim: `Identified as ${res.revealedCanonicalName} (formerly recognized as ${oldLabel})`,
          status: 'supported',
          evidence_beats: [bNum],
          evidence_quotes: [res.evidenceSnippet],
          evidence_count: 1,
          first_seen_beat: bNum,
          last_seen_beat: bNum,
        });
      }
    }
  }

  // 7. Deterministically calculate reliability, distinct evidence, and classification confidence
  for (const [entId, ent] of Array.from(codexMap.entries())) {
    const distinctBeats = distinctBeatsByEntity.get(entId);
    const count = computeDistinctEvidenceCount(ent, distinctBeats);
    ent.distinct_evidence_count = count;

    const hasContradiction = ent.claims.some((c) => c.status === 'contradicted');

    if (ent.is_author_locked) {
      ent.reliability = 1.0;
    } else {
      let calculated = calculateReliability(count);
      if (hasContradiction && calculated > 0.45) {
        calculated = 0.45;
      }
      ent.reliability = calculated;
    }

    const quotes = quotesByEntity.get(entId) || [];
    const classification = classifyEntityTypes(ent.working_label, quotes);
    ent.candidate_types = classification.candidateTypes;
    if (count >= 3 || classification.classificationConfidence === 'resolved') {
      ent.classification_confidence = 'resolved';
      ent.entity_type = classification.primaryType;
    } else {
      ent.classification_confidence = 'provisional';
      ent.entity_type = classification.primaryType;
    }
  }

  return Array.from(codexMap.values());
}
