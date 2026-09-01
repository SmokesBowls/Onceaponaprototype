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

  // Creature / Monster
  if (/\b(wolf|hound|beast|dragon|serpent|raven|crow|horse|stallion|steed|gargoyle|creature)\b/i.test(l)) {
    return {
      primaryType: 'creature',
      candidateTypes: ['creature', 'actor'],
      classificationConfidence: contextSnippets.length >= 2 ? 'resolved' : 'provisional',
    };
  }

  // Location / Place
  if (/\b(forest|valley|mount|mountain|harbor|dock|street|conduit|hall|dungeon|cavern|crossroads|city|room|chamber)\b/i.test(l)) {
    return {
      primaryType: 'location',
      candidateTypes: ['location', 'landmark'],
      classificationConfidence: contextSnippets.length >= 2 ? 'resolved' : 'provisional',
    };
  }

  // Actor / Character
  if (/\b(traveler|stranger|man|woman|scribe|master|locke|mara|guard|curator|child|figure|hooded|investigator|locksmith|scholar|king|lord)\b/i.test(l)) {
    return {
      primaryType: 'actor',
      candidateTypes: ['actor'],
      classificationConfidence: contextSnippets.length >= 1 ? 'resolved' : 'provisional',
    };
  }

  // Object / Relic / Mechanism
  if (/\b(device|astrolabe|key|lantern|pick|sword|blade|dagger|scroll|book|ledger|gem|filing|box|cylinder|mechanism|escapement|pry-bar|pouch)\b/i.test(l)) {
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

/**
 * Strict Possession & Relational Grammar Detection
 * Distinguishes: mentions, sees, notices, approaches, touches, uses, carries, holds, owns, possesses, stands_beside, is_located_near, rests_on
 */
export function detectEntityInteractions(
  prose: string,
  entityLabel: string,
  actorLabel?: string
): {
  relationshipType: NarrativeRelationshipType;
  isPossession: boolean;
  isRelease: boolean;
  targetId?: string;
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
    /\b(picked up|took up|slipped into (his|her|their) (pocket|bag|pouch)|drew (his|her|their)|grasped|seized|lifted the|pocketed|clasped the|drew the)\b/i.test(lowerSentence) &&
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

  if (isPickup || isHolding) {
    return {
      relationshipType: 'holds',
      isPossession: true,
      isRelease: false,
      quoteSnippet: matchedSentence.trim(),
    };
  }

  if (isRelease) {
    return {
      relationshipType: 'rests_on',
      isPossession: false,
      isRelease: true,
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
      quoteSnippet: matchedSentence.trim(),
    };
  }

  if (isTouch) {
    return {
      relationshipType: 'touches',
      isPossession: false,
      isRelease: false,
      quoteSnippet: matchedSentence.trim(),
    };
  }

  if (isApproach) {
    return {
      relationshipType: 'approaches',
      isPossession: false,
      isRelease: false,
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
  beatNumber: number
): EntityClaim[] {
  const claims: EntityClaim[] = [];
  const lowerProse = prose.toLowerCase();
  const lowerEnt = entityLabel.toLowerCase();

  // Find relevant sentences
  const sentences = prose.split(/(?<=[.!?])\s+/).filter((s) => s.toLowerCase().includes(lowerEnt));

  for (const s of sentences) {
    const ls = s.toLowerCase();

    // Material claims
    if (/\bstone\b/i.test(ls) && /\bwell\b/i.test(lowerEnt)) {
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

    if (/\b(abandoned|ruined|dormant|disused)\b/i.test(ls)) {
      claims.push({
        id: `claim_${entityLabel.replace(/\s+/g, '_')}_abandoned_${beatNumber}`,
        claim: 'is abandoned/disused',
        status: 'supported',
        evidence_beats: [beatNumber],
        evidence_quotes: [s.trim()],
        evidence_count: 1,
        first_seen_beat: beatNumber,
        last_seen_beat: beatNumber,
      });
    }

    if (/\b(brass|copper|iron|bronze|wood|gold|silver|crystal|glass)\b/i.test(ls)) {
      const match = ls.match(/\b(brass|copper|iron|bronze|wood|gold|silver|crystal|glass)\b/i);
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

    // Light emission claims (and check for contradictions)
    if (/\b(amber|blue|crimson|green|white|golden|emerald|scarlet)\s+(light|glow|beam|luminescence|pulse)\b/i.test(ls) ||
        /\b(emitted|emanated|pulsed with|glowed with)\s+(amber|blue|crimson|green|white|golden|emerald|scarlet)\b/i.test(ls)) {
      const colorMatch = ls.match(/\b(amber|blue|crimson|green|white|golden|emerald|scarlet)\b/i);
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
    }

    // Spatial rest claims
    if (/\b(resting on|rested on|atop|upon)\s+(the\s+)?([a-z\s]+)/i.test(ls)) {
      const restMatch = ls.match(/\b(?:resting on|rested on|atop|upon)\s+(?:the\s+)?([a-z0-9_\-\s]{3,30})/i);
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

  // Base classification claim
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

  for (const beat of project.manuscript) {
    const bNum = beat.beatNumber;
    const prose = beat.text;
    const lowerProse = prose.toLowerCase();

    for (const [entId, ent] of Array.from(codexMap.entries())) {
      const labelsToCheck = [
        ent.working_label,
        ent.canonical_label,
        ...(ent.aliases || []),
      ].filter(Boolean) as string[];

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

        const interaction = detectEntityInteractions(prose, ent.working_label);
        matchedSnippet = interaction.quoteSnippet;
        quotesByEntity.get(entId)!.push(matchedSnippet);

        if (interaction.isPossession) {
          ent.current_holder_id = beat.povActorId;
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

        const rel: EntityRelationship = {
          id: `rel_${entId}_${beat.povActorId}_b${bNum}`,
          type: interaction.relationshipType,
          source_id: beat.povActorId,
          target_id: entId,
          status: 'supported',
          established_beat: bNum,
          evidence_quote: matchedSnippet,
        };
        ent.relationships.push(rel);

        const extractedClaims = extractClaimsFromProse(prose, ent.working_label, bNum);
        ent.claims = mergeClaims(ent.claims, extractedClaims);

        ent.last_seen = `Beat ${bNum} (T${bNum})`;
      }
    }
  }

  // 7. Deterministically calculate reliability, distinct evidence, and classification confidence
  for (const [entId, ent] of Array.from(codexMap.entries())) {
    const distinctBeats = distinctBeatsByEntity.get(entId);
    const count = distinctBeats ? distinctBeats.size : (ent.distinct_evidence_count || 0);
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
