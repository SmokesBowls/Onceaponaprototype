import {
  StoryProject,
  StoryPosition,
  OperatingMode,
  NarrativeDistance,
  RewriteContract,
  GenerationContext,
  ValidationContext,
} from '../src/types';

/**
 * Dedicated Context Compiler for Onceaponatime Literary Mechanics
 *
 * CRITICAL RULE: Knowledge boundaries MUST be enforced by context exclusion,
 * not by prompt instructions.
 *
 * If a generation-stage model is not authorized to know a fact, that fact must
 * not appear anywhere in that model invocation:
 * - NOT in system instructions
 * - NOT in JSON context
 * - NOT under a "forbidden" field
 * - NOT as a locked reveal with instructions not to disclose it
 */

export interface CompileGenerationContextParams {
  project: StoryProject;
  activePovActorId: string;
  currentPosition: StoryPosition;
  operation: OperatingMode;
  narrativeDistance: NarrativeDistance;
  rewriteContract?: RewriteContract | null;
  recentBeatCount?: number;
}

export function compileGenerationContext(
  params: CompileGenerationContextParams
): GenerationContext {
  const {
    project,
    activePovActorId,
    currentPosition,
    operation,
    narrativeDistance,
    rewriteContract = null,
    recentBeatCount = 3,
  } = params;

  // 1. Identify the POV Actor
  const povActor = project.actors.find((a) => a.id === activePovActorId) || project.actors[0];
  if (!povActor) {
    throw new Error(`POV Actor with ID '${activePovActorId}' not found in project.`);
  }

  // 2. Fetch Epistemic Permissions for POV Actor
  const actorKnowledge = project.knowledge.actor_knowledge[povActor.id] || {
    known_facts: [],
    beliefs: [],
    forbidden_knowledge: [],
  };

  const knownFactIdSet = new Set<string>(actorKnowledge.known_facts || []);

  // 3. Compile ONLY facts explicitly known by this POV Actor
  // (Exclude all forbidden knowledge and hidden world truth)
  const knownFacts = project.facts
    .filter((f) => knownFactIdSet.has(f.id))
    .map((f) => ({
      id: f.id,
      statement: f.statement,
      status: f.status,
      provenance: f.provenance,
    }));

  // 4. Sincere Beliefs (beliefs the actor holds, which may differ from world truth)
  const sincereBeliefs = [...(actorKnowledge.beliefs || [])];

  // 5. Filter Currently Perceptible / Local Entities
  // Actors present at the current location
  const presentActors = project.actors.filter(
    (a) => a.isPresent && a.current_location_id === currentPosition.location_id
  );
  const presentActorIdSet = new Set(presentActors.map((a) => a.id));

  // Objects present at the current location OR held by present actors
  const presentObjects = project.objects.filter((o) => {
    if (!o.isPresent) return false;
    if (o.current_location_id === currentPosition.location_id) return true;
    if (o.current_holder_id && presentActorIdSet.has(o.current_holder_id)) return true;
    return false;
  });

  // Current Location info
  const currentLocationEntity = project.locations.find(
    (l) => l.id === currentPosition.location_id
  );

  const currentLocation = currentLocationEntity
    ? {
        id: currentLocationEntity.id,
        name: currentLocationEntity.identity.name,
        working_label: currentLocationEntity.identity.working_label,
        description_summary: currentLocationEntity.description_summary,
        connected_locations: currentLocationEntity.connected_locations,
      }
    : null;

  // Normalized present entities list for the generator
  const presentEntities: GenerationContext['presentEntities'] = [
    ...presentActors.map((a) => ({
      id: a.id,
      type: 'actor' as const,
      label: a.identity.working_label || a.identity.name || a.id,
      name: a.identity.name,
      aliases: a.identity.aliases || [],
      roleOrStatus: a.roles?.scene?.[0] || a.roles?.story?.[0] || 'character',
      locationId: a.current_location_id,
      currentHolderId: null,
      traitsOrDescription: a.traits,
      currentState: a.current_state,
    })),
    ...presentObjects.map((o) => {
      const holder = project.actors.find((a) => a.id === o.current_holder_id);
      return {
        id: o.id,
        type: 'object' as const,
        label: o.identity.working_label || o.identity.name || o.id,
        name: o.identity.name,
        aliases: o.identity.aliases || [],
        roleOrStatus: o.status,
        locationId: o.current_location_id,
        currentHolderId: o.current_holder_id,
        traitsOrDescription: {
          salience: o.salience,
          holder: holder ? holder.identity.working_label || holder.identity.name : 'unheld',
        },
        currentState: { status: o.status },
      };
    }),
  ];

  // 6. Relevant Possessions (belonging to POV or visible present actors)
  const relevantPossessions = presentObjects.map((o) => {
    const holder = project.actors.find((a) => a.id === o.current_holder_id);
    return {
      id: o.id,
      label: o.identity.working_label || o.identity.name || o.id,
      holderId: o.current_holder_id,
      holderName: holder ? holder.identity.name || holder.identity.working_label : null,
    };
  });

  // 7. Relevant Open Threads (open threads the POV may legitimately interact with)
  const relevantOpenThreads = project.threads
    .filter((t) => t.status === 'open')
    .map((t) => ({
      id: t.id,
      label: t.label,
      importance: t.importance,
      resolution_allowed: t.resolution_allowed,
    }));

  // 8. REAL REVEAL LOCKBOX:
  // The generator must NEVER receive the protected truth of a LOCKED reveal.
  // A locked reveal may optionally contain separate pre-authored permitted foreshadowing cues.
  // The generation context may receive permitted_cues strings only.
  // It must NOT receive fact_id, fact statements, or protected reveal text!
  const permittedForeshadowingCues: string[] = [];

  for (const r of project.reveals) {
    if (r.status === 'locked' || r.status === 'foreshadowed') {
      // Include ONLY allowed before unlock cues (sensory / atmosphere / hints)
      if (Array.isArray(r.allowed_before_unlock)) {
        for (const cue of r.allowed_before_unlock) {
          if (cue && typeof cue === 'string' && cue.trim().length > 0) {
            // Filter out generic tags and pass only tangible foreshadowing cues
            if (cue !== 'foreshadow' && cue !== 'ambiguous_sensory') {
              permittedForeshadowingCues.push(cue);
            }
          }
        }
      }
    }
  }

  // 9. Recent Prose for continuity
  const recentProse = project.manuscript
    .slice(-recentBeatCount)
    .map((b) => b.text)
    .join('\n\n');

  return {
    operatingMode: operation,
    narrativeDistance,
    storyPosition: currentPosition,
    activePovActor: {
      id: povActor.id,
      identity: povActor.identity,
      roles: povActor.roles,
      traits: povActor.traits,
      current_state: povActor.current_state,
      active_goals: povActor.active_goals,
      current_location_id: povActor.current_location_id,
      possessions: povActor.possessions,
    },
    knownFacts,
    sincereBeliefs,
    presentEntities,
    currentLocation,
    relevantPossessions,
    relevantOpenThreads,
    permittedForeshadowingCues,
    recentProse,
    rewriteContract: operation === 'TRANSFORMATION' ? rewriteContract : null,
  };
}

/**
 * Compile Validation Context for Candidate Validator
 *
 * The Candidate Validator runs after Stage 2 prose rendering.
 * Unlike the Generator, the Validator is authorized to inspect governing state
 * (forbidden knowledge, locked reveals, displaced entities, world truth)
 * strictly to detect violations and contradictions.
 */
export function compileValidationContext(
  project: StoryProject,
  povActorId: string,
  narrativeDistance: NarrativeDistance,
  rewriteContract?: RewriteContract | null
): ValidationContext {
  const povActor = project.actors.find((a) => a.id === povActorId) || project.actors[0];
  const povActorKnowledge = project.knowledge.actor_knowledge[povActor?.id || ''] || {
    known_facts: [],
    beliefs: [],
    forbidden_knowledge: [],
  };

  const forbiddenFactIdSet = new Set(povActorKnowledge.forbidden_knowledge || []);
  const forbiddenFacts = project.facts
    .filter((f) => forbiddenFactIdSet.has(f.id))
    .map((f) => ({ id: f.id, statement: f.statement }));

  const lockedReveals = project.reveals
    .filter((r) => r.status === 'locked')
    .map((r) => {
      const fact = project.facts.find((f) => f.id === r.fact_id);
      return {
        id: r.id,
        factStatement: fact?.statement,
        allowedBeforeUnlock: r.allowed_before_unlock || [],
        forbiddenBeforeUnlock: r.forbidden_before_unlock || [],
        status: r.status,
      };
    });

  const worldTruthSet = new Set(project.knowledge.world_truth || []);
  const worldTruthFacts = project.facts
    .filter((f) => worldTruthSet.has(f.id))
    .map((f) => ({ id: f.id, statement: f.statement }));

  const presentActorIds = project.actors
    .filter((a) => a.isPresent && a.current_location_id === project.currentPosition.location_id)
    .map((a) => a.id);

  const displacedActorIds = project.actors
    .filter((a) => a.current_location_id !== project.currentPosition.location_id)
    .map((a) => a.id);

  const displacedObjectIds = project.objects
    .filter((o) => {
      if (o.current_location_id === project.currentPosition.location_id) return false;
      if (o.current_holder_id && presentActorIds.includes(o.current_holder_id)) return false;
      return true;
    })
    .map((o) => o.id);

  const objectHolders: Record<string, string | null> = {};
  for (const obj of project.objects) {
    objectHolders[obj.id] = obj.current_holder_id;
  }

  const openThreads = project.threads
    .filter((t) => t.status === 'open')
    .map((t) => ({
      id: t.id,
      label: t.label,
      resolution_allowed: t.resolution_allowed,
    }));

  return {
    povActorId: povActor?.id || 'actor_001',
    povActorLabel: povActor?.identity.name || povActor?.identity.working_label || 'POV Actor',
    forbiddenFacts,
    lockedReveals,
    worldTruthFacts,
    presentEntityIds: presentActorIds,
    displacedEntityIds: [...displacedActorIds, ...displacedObjectIds],
    objectHolders,
    openThreads,
    narrativeDistance,
    rewriteContract: rewriteContract || null,
  };
}
