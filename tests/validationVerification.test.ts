import { validateCandidateProse } from '../server/narrativePipeline';
import { compileGenerationContext, compileValidationContext } from '../server/contextCompiler';
import { StoryProject, GenerationContext, ValidationContext } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runValidationTests() {
  console.log('\n=== RUNNING VALIDATION INTEGRITY & ANTI-FAKE-SUCCESS TESTS ===\n');

  // Test Project Setup
  const testProject: StoryProject = {
    id: 'proj_val_01',
    title: 'Validation Test Project',
    description: 'Testing real validation checks without fake success',
    currentPosition: {
      act: 'Act I',
      chapter: 'Chapter 1',
      scene: 'Scene 1',
      beat: 1,
      location_id: 'loc_study',
      location_label: 'Private Study',
    },
    activePovActorId: 'actor_pov',
    actors: [
      {
        id: 'actor_pov',
        identity: { name: 'Evelyn Gray', working_label: 'Evelyn', aliases: [] },
        roles: { story: ['protagonist'], scene: ['scholar'] },
        traits: { perceptive: 0.8 },
        current_state: { fatigue: 0.1, fear: 0.1, certainty: 0.6, emotion: 'curious' },
        active_goals: ['Read the codex'],
        current_location_id: 'loc_study',
        possessions: ['obj_lantern'],
        isPresent: true,
      },
    ],
    objects: [
      {
        id: 'obj_lantern',
        identity: { name: 'Brass Lantern', working_label: 'the lantern', aliases: [] },
        current_holder_id: 'actor_pov',
        current_location_id: 'loc_study',
        status: 'intact',
        salience: 0.5,
        isPresent: true,
      },
    ],
    locations: [
      {
        id: 'loc_study',
        identity: { name: 'Private Study', working_label: 'the study', aliases: [] },
        parent_location_id: null,
        connected_locations: [],
        description_summary: 'A quiet room lined with bookshelves.',
      },
    ],
    factions: [],
    facts: [
      {
        id: 'fact_secret_poison',
        statement: 'The council poisoned the water supply during the winter solstice',
        status: 'established',
        confidence: 1.0,
        provenance: {},
      },
    ],
    knowledge: {
      world_truth: ['fact_secret_poison'],
      reader_knowledge: [],
      actor_knowledge: {
        actor_pov: {
          known_facts: [],
          beliefs: ['The water tastes strange.'],
          forbidden_knowledge: ['fact_secret_poison'],
        },
      },
    },
    reveals: [
      {
        id: 'reveal_poison',
        fact_id: 'fact_secret_poison',
        label: 'The Solstice Poisoning',
        status: 'locked',
        allowed_before_unlock: ['a bitter taste in the wine'],
        forbidden_before_unlock: ['poisoned the water supply', 'winter solstice poisoning'],
      },
    ],
    threads: [
      {
        id: 'thread_unresolvable_01',
        label: 'Investigate the old archives',
        status: 'open',
        importance: 'major',
        introduced_in: 'Chapter 1',
        resolution_allowed: false, // NOT resolvable
        visible_to_actor_ids: ['actor_pov'],
      },
    ],
    manuscript: [],
    mentions: [],
    temporalHistory: [],
  };

  const valCtx: ValidationContext = compileValidationContext(
    testProject,
    'actor_pov',
    'BEAT'
  );

  // Mock Provider for deterministic testing (isAvailable = false)
  const offlineProvider = {
    name: 'offline_mock',
    isAvailable: () => false,
    generateText: async () => ({ text: '', providerName: 'offline_mock' }),
  };

  // -------------------------------------------------------------
  // TEST 1: FORBIDDEN KNOWLEDGE LEAKAGE MUST FAIL VALIDATION
  // -------------------------------------------------------------
  console.log('--- TEST 1: Forbidden Knowledge Leakage Validation Failure ---');

  const leakingProse = 'Evelyn realized with certainty that the council poisoned the water supply during the winter solstice.';
  const leakingReport = await validateCandidateProse(leakingProse, valCtx, undefined, offlineProvider);

  assert(leakingReport.passed === false, 'Leaking prose must have passed: false');
  assert(leakingReport.verified === false, 'Leaking prose must have verified: false');
  assert(leakingReport.status === 'UNVERIFIED', 'Leaking prose must have status: "UNVERIFIED" (not "VERIFIED")');
  assert(leakingReport.score < 70, `Score must be < 70 (got ${leakingReport.score})`);
  assert(
    leakingReport.diagnostics.some((d) => d.severity === 'FATAL' && (d.rule === 'KNOWLEDGE_LEAKAGE' || d.rule === 'LOCKED_REVEAL_PREMATURE_DISCLOSURE')),
    'Diagnostics must contain a FATAL constraint breach'
  );

  // -------------------------------------------------------------
  // TEST 2: LOCKED REVEAL PREMATURE DISCLOSURE MUST FAIL VALIDATION
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Locked Reveal Premature Disclosure Validation Failure ---');

  const revealLeakingProse = 'She uncovered evidence of the winter solstice poisoning hidden behind the desk.';
  const revealReport = await validateCandidateProse(revealLeakingProse, valCtx, undefined, offlineProvider);

  assert(revealReport.passed === false, 'Locked reveal disclosure must have passed: false');
  assert(revealReport.verified === false, 'Locked reveal disclosure must have verified: false');
  assert(revealReport.status === 'UNVERIFIED', 'Locked reveal disclosure must have status: "UNVERIFIED"');
  assert(
    revealReport.diagnostics.some((d) => d.severity === 'FATAL' && d.rule === 'LOCKED_REVEAL_PREMATURE_DISCLOSURE'),
    'Diagnostics must contain FATAL LOCKED_REVEAL_PREMATURE_DISCLOSURE'
  );

  // -------------------------------------------------------------
  // TEST 3: CLEAN VALIDATED PROSE MUST PASS VALIDATION
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Clean Compliant Prose Passes Validation ---');

  const cleanProse = 'Evelyn lifted the brass lantern, its warm flame casting long amber shadows across the dusty study shelves.';
  const cleanReport = await validateCandidateProse(cleanProse, valCtx, undefined, offlineProvider);

  assert(cleanReport.passed === true, 'Clean prose must have passed: true');
  assert(cleanReport.verified === true, 'Clean prose must have verified: true');
  assert(cleanReport.status === 'VERIFIED', 'Clean prose must have status: "VERIFIED"');
  assert(cleanReport.score >= 70, `Clean prose score must be >= 70 (got ${cleanReport.score})`);
  assert(
    !cleanReport.diagnostics.some((d) => d.severity === 'FATAL'),
    'Clean prose must have zero FATAL diagnostics'
  );

  console.log('\n🎉 ALL VALIDATION INTEGRITY TESTS PASSED WITHOUT FAKE SUCCESS!\n');
}

runValidationTests().catch((err) => {
  console.error('Validation test run failed:', err);
  process.exit(1);
});
