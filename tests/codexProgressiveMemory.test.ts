import {
  calculateReliability,
  classifyEntityTypes,
  detectEntityInteractions,
  extractClaimsFromProse,
  mergeClaims,
  synthesizeCodex,
} from '../src/lib/codexEngine';
import { compileGenerationContext } from '../server/contextCompiler';
import { StoryProject, CodexEntity } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

export function runCodexTests() {
  console.log('\n=== RUNNING PROGRESSIVE NARRATIVE MEMORY & CODEX TESTS ===\n');

  // -------------------------------------------------------------
  // TEST 1: Exact Deterministic Reliability Progression
  // -------------------------------------------------------------
  console.log('--- TEST 1: Progressive Reliability Formula ---');
  assert(calculateReliability(0) === 0.0, '0 distinct evidence beats = 0% reliability');
  assert(calculateReliability(1) === 0.0, '1 distinct evidence beat (first mention) = 0% reliability');
  assert(calculateReliability(2) === 0.25, '2 distinct evidence beats = 25% reliability');
  assert(calculateReliability(3) === 0.45, '3 distinct evidence beats = 45% reliability');
  assert(calculateReliability(4) === 0.60, '4 distinct evidence beats = 60% reliability');
  assert(calculateReliability(5) === 0.72, '5 distinct evidence beats = 72% reliability');
  assert(calculateReliability(6) === 0.82, '6 distinct evidence beats = 82% reliability');
  assert(calculateReliability(7) === 0.89, '7 distinct evidence beats = 89% reliability');
  assert(calculateReliability(8) === 0.94, '8 distinct evidence beats = 94% reliability');
  assert(calculateReliability(9) === 0.97, '9 distinct evidence beats = 97% reliability');
  assert(calculateReliability(10) >= 0.97 && calculateReliability(10) <= 0.99, '10+ distinct evidence beats approach 99%');
  assert(calculateReliability(1, true) === 1.0, 'Author-locked entity is strictly 100% reliability');

  // -------------------------------------------------------------
  // TEST 2: Provisional Classification on First Appearance
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Provisional Classification on First Appearance ---');
  const wellClassification = classifyEntityTypes('abandoned stone well');
  assert(wellClassification.classificationConfidence === 'provisional', 'Stone well classification begins as provisional');
  assert(wellClassification.candidateTypes.includes('structure'), 'Candidate types include structure');
  assert(wellClassification.candidateTypes.includes('landmark'), 'Candidate types include landmark');
  assert(wellClassification.candidateTypes.includes('location'), 'Candidate types include location');
  assert(wellClassification.candidateTypes.includes('object'), 'Candidate types include object on first appearance');

  const resolvedClassification = classifyEntityTypes('abandoned stone well', [
    'stood anchored beside the road with a deep masonry shaft',
    'the deep stone shaft plunged into darkness',
  ]);
  assert(resolvedClassification.classificationConfidence === 'resolved', 'Classification resolves with spatial evidence');
  assert(resolvedClassification.primaryType === 'structure', 'Resolves to structure');

  // -------------------------------------------------------------
  // TEST 3: Mention is NOT Possession (Semantic Precision)
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Mention is NOT Possession ---');
  const seeingText = 'The traveler saw an abandoned stone well beside the overgrown junction. A small brass device rested on the well, emitting a slow amber light.';
  
  const wellInteraction = detectEntityInteractions(seeingText, 'abandoned stone well');
  assert(!wellInteraction.isPossession, 'Seeing the well does NOT create possession');
  assert(wellInteraction.relationshipType === 'sees' || wellInteraction.relationshipType === 'mentions', 'Interaction is perception/mention');

  const deviceInteraction = detectEntityInteractions(seeingText, 'small brass device');
  assert(!deviceInteraction.isPossession, 'Device resting on the well is NOT held by traveler');
  assert(deviceInteraction.relationshipType === 'rests_on', 'Device relationship is rests_on');

  const pickupText = 'The traveler picked up the brass device and slipped it into his coat pocket.';
  const pickupInteraction = detectEntityInteractions(pickupText, 'brass device');
  assert(pickupInteraction.isPossession, 'Explicit pickup text correctly detects possession');
  assert(pickupInteraction.relationshipType === 'holds', 'Relationship is holds');

  const dropText = 'The traveler set down the brass device onto the cold stone altar.';
  const dropInteraction = detectEntityInteractions(dropText, 'brass device');
  assert(!dropInteraction.isPossession, 'Setting down does not constitute holding');
  assert(dropInteraction.isRelease, 'Setting down is a release');

  // -------------------------------------------------------------
  // TEST 4: Crossroads Regression Project Synthesized State
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: The Crossroads Project Regression Verification ---');
  const crossroadsProject: StoryProject = {
    id: 'proj_crossroads_test',
    title: 'The Crossroads Regression',
    description: 'Testing traveler well and brass device memory',
    currentPosition: {
      act: 'Act I',
      chapter: 'Chapter 1',
      scene: 'Scene 1',
      beat: 1,
      location_id: 'loc_crossroads',
      location_label: 'The Crossroads',
    },
    activePovActorId: 'actor_traveler',
    manuscript: [
      {
        id: 'beat_01',
        beatNumber: 1,
        text: 'The traveler saw an abandoned stone well beside the overgrown junction. A small brass device rested on the well, emitting a slow amber light across the damp masonry.',
        povActorId: 'actor_traveler',
        locationId: 'loc_crossroads',
        acceptedAt: 1725000000000,
      },
    ],
    actors: [
      {
        id: 'actor_traveler',
        identity: { name: 'The Traveler', working_label: 'traveler', aliases: [] },
        roles: { story: ['protagonist'], scene: ['observer'] },
        traits: {},
        current_state: { fatigue: 0.1, fear: 0.1, certainty: 0.2, emotion: 'watchful' },
        active_goals: ['Inspect junction'],
        current_location_id: 'loc_crossroads',
        possessions: [],
        isPresent: true,
      },
    ],
    objects: [
      {
        id: 'object_well',
        identity: { name: null, working_label: 'abandoned stone well', aliases: [] },
        current_holder_id: null,
        current_location_id: 'loc_crossroads',
        status: 'intact',
        salience: 0.7,
        isPresent: true,
      },
      {
        id: 'object_brass_device',
        identity: { name: null, working_label: 'small brass device', aliases: ['the device'] },
        current_holder_id: null,
        current_location_id: 'loc_crossroads',
        status: 'intact',
        salience: 0.85,
        isPresent: true,
      },
    ],
    locations: [
      {
        id: 'loc_crossroads',
        identity: { name: 'The Crossroads', working_label: 'the crossroads', aliases: [] },
        parent_location_id: null,
        connected_locations: [],
        description_summary: 'An overgrown junction.',
      },
    ],
    factions: [],
    facts: [],
    threads: [],
    reveals: [],
    mentions: [],
    knowledge: {
      world_truth: [],
      reader_knowledge: [],
      actor_knowledge: {
        actor_traveler: {
          known_facts: [],
          beliefs: [],
          forbidden_knowledge: [],
        },
      },
    },
    temporalHistory: [],
  };

  const synthesized = synthesizeCodex(crossroadsProject);
  const wellEnt = synthesized.find((e) => e.id === 'object_well');
  const deviceEnt = synthesized.find((e) => e.id === 'object_brass_device');

  assert(!!wellEnt, 'Well entity synthesized in codex');
  assert(wellEnt?.current_holder_id === null, 'Well current_holder_id is strictly null (NOT held by traveler)');
  assert(wellEnt?.reliability === 0.0, 'Well reliability is 0% on Beat 1 (1 mention)');
  assert(wellEnt?.distinct_evidence_count === 1, 'Well distinct evidence count is 1');
  assert(wellEnt?.classification_confidence === 'provisional', 'Well is provisional on first mention');

  assert(!!deviceEnt, 'Brass device synthesized in codex');
  assert(deviceEnt?.current_holder_id === null, 'Device current_holder_id is strictly null (NOT held by traveler)');
  assert(deviceEnt?.reliability === 0.0, 'Device reliability is 0% on Beat 1 (1 mention)');

  // -------------------------------------------------------------
  // TEST 5: Contradictory Observations Handling
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Contradictory Observations Handling ---');
  const beat4Claims = extractClaimsFromProse('The device emitted blue light in the dark.', 'device', 4);
  const beat19Claims = extractClaimsFromProse('The device pulsed with crimson light against the frost.', 'device', 19);

  const merged = mergeClaims(beat4Claims, beat19Claims);
  const glowClaims = merged.filter((c) => c.claim.startsWith('emits ') && c.claim.endsWith(' light'));

  assert(glowClaims.length === 2, 'Both contradictory glow observations preserved (not overwritten)');
  assert(glowClaims[0].status === 'contradicted', 'First glow claim marked as contradicted');
  assert(glowClaims[1].status === 'contradicted', 'Second glow claim marked as contradicted');
  assert(glowClaims[0].contradiction_notes !== undefined, 'Contradiction notes attached to first claim');
  assert(glowClaims[1].contradiction_notes !== undefined, 'Contradiction notes attached to second claim');

  // -------------------------------------------------------------
  // TEST 6: Stage 1 Authorized Context Package Verification
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Stage 1 Generation Context Package Integration ---');
  const genContext = compileGenerationContext({
    project: crossroadsProject,
    activePovActorId: 'actor_traveler',
    currentPosition: crossroadsProject.currentPosition,
    operation: 'GENERATION',
    narrativeDistance: 'BEAT',
  });

  assert(Array.isArray(genContext.accumulatedCodexEntities), 'accumulatedCodexEntities present in GenerationContext');
  assert(Array.isArray(genContext.continuityConstraints), 'continuityConstraints present in GenerationContext');
  
  const hasInventoryConstraint = genContext.continuityConstraints?.some((c) => c.includes('is resting in the scene (current_holder_id: null)'));
  assert(hasInventoryConstraint, 'Continuity constraint explicitly prevents false holding of resting object');

  console.log('\n🎉 ALL PROGRESSIVE NARRATIVE MEMORY & CODEX TESTS PASSED!\n');
}

// Run tests if executed directly
if (process.argv[1]?.endsWith('codexProgressiveMemory.test.ts')) {
  runCodexTests();
}
