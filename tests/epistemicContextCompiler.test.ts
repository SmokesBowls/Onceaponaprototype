import { compileGenerationContext } from '../server/contextCompiler';
import { StoryProject } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

function runTests() {
  console.log('\n=== RUNNING EPISTEMIC GENERATION CONTEXT TESTS ===\n');

  // -------------------------------------------------------------
  // TEST SUITE 1: RECENT PROSE LEAKAGE TEST (Guarantees A, B, C)
  // -------------------------------------------------------------
  console.log('--- TEST 1: Recent Prose Epistemic Isolation (A, B, C) ---');

  const secretFactStatement = 'The Lord Mayor poisoned the reservoir at midnight';
  const secretKeyword = 'poisoned the reservoir';

  const testProject1: StoryProject = {
    id: 'proj_epistemic_01',
    title: 'Epistemic Test Story',
    description: 'Testing prose isolation across POV transitions',
    currentPosition: {
      act: 'Act I',
      chapter: 'Chapter 2',
      scene: 'Scene 1',
      beat: 2,
      location_id: 'loc_market',
      location_label: 'City Market',
    },
    activePovActorId: 'actor_alicia',
    actors: [
      {
        id: 'actor_alicia',
        identity: { name: 'Alicia Croft', working_label: 'Alicia', aliases: [] },
        roles: { story: ['protagonist'], scene: ['infiltrator'] },
        traits: { cautious: 0.8 },
        current_state: { fatigue: 0.2, fear: 0.1, certainty: 0.9, emotion: 'resolute' },
        active_goals: ['Expose the treason'],
        current_location_id: 'loc_market',
        possessions: [],
        isPresent: true,
      },
      {
        id: 'actor_locke',
        identity: { name: 'Locke Thorne', working_label: 'Locke', aliases: [] },
        roles: { story: ['co-protagonist'], scene: ['bystander'] },
        traits: { observant: 0.9 },
        current_state: { fatigue: 0.1, fear: 0.2, certainty: 0.3, emotion: 'curious' },
        active_goals: ['Investigate the strange smell'],
        current_location_id: 'loc_market',
        possessions: [],
        isPresent: true,
      },
    ],
    objects: [],
    locations: [
      {
        id: 'loc_market',
        identity: { name: 'City Market', working_label: 'the marketplace', aliases: [] },
        parent_location_id: null,
        connected_locations: [],
        description_summary: 'A bustling marketplace under gray dawn light.',
      },
    ],
    factions: [],
    facts: [
      {
        id: 'fact_secret_poison',
        statement: secretFactStatement,
        status: 'established',
        confidence: 1.0,
        provenance: {},
      },
    ],
    knowledge: {
      world_truth: ['fact_secret_poison'],
      reader_knowledge: [],
      actor_knowledge: {
        actor_alicia: {
          known_facts: ['fact_secret_poison'],
          beliefs: ['The Lord Mayor is guilty.'],
          forbidden_knowledge: [],
        },
        actor_locke: {
          known_facts: [],
          beliefs: ['Something feels amiss in the city.'],
          forbidden_knowledge: ['fact_secret_poison'],
        },
      },
    },
    reveals: [
      {
        id: 'reveal_poison',
        fact_id: 'fact_secret_poison',
        label: 'The Poisoned Reservoir',
        status: 'locked',
        allowed_before_unlock: ['a foul odor rising from the well'],
        forbidden_before_unlock: ['the lord mayor poisoned the reservoir', 'poisoned the reservoir'],
      },
    ],
    threads: [],
    manuscript: [
      // Beat 1: Authored from Alicia's POV, who knows the secret
      {
        id: 'beat_001',
        beatNumber: 1,
        text: 'Alicia clenched her fingers around the vial, remembering with dread that the Lord Mayor poisoned the reservoir at midnight. She had to act before the city woke.',
        povActorId: 'actor_alicia',
        locationId: 'loc_market',
        acceptedAt: 1000,
      },
    ],
    mentions: [],
    temporalHistory: [],
  };

  // Guarantee A: Previous POV (Alicia) knows secret and mentioned it in manuscript
  assert(
    testProject1.manuscript[0].text.includes(secretKeyword),
    'Previous POV (Alicia) manuscript beat contains the secret text'
  );

  // Guarantee B: POV changes to Locke, who does not know the secret
  const lockeContext = compileGenerationContext({
    project: testProject1,
    activePovActorId: 'actor_locke',
    currentPosition: testProject1.currentPosition,
    operation: 'CONTINUATION',
    narrativeDistance: 'BEAT',
    recentBeatCount: 3,
  });

  // Guarantee C: Serialized GenerationContext for Locke does NOT contain the secret anywhere
  const serializedLockeContext = JSON.stringify(lockeContext);

  assert(
    !serializedLockeContext.toLowerCase().includes(secretKeyword.toLowerCase()),
    `Complete serialized GenerationContext for Locke does NOT contain '${secretKeyword}'`
  );
  assert(
    !serializedLockeContext.toLowerCase().includes(secretFactStatement.toLowerCase()),
    `Complete serialized GenerationContext for Locke does NOT contain '${secretFactStatement}'`
  );
  assert(
    lockeContext.recentProse === '',
    'Locke recentProse is empty (Alicia previous POV beat with secret was strictly excluded)'
  );


  // -------------------------------------------------------------
  // TEST SUITE 2: ENTITY IDENTITY LEAKAGE TEST (Guarantees D, E, F)
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Entity Identity Epistemic Filtering (D, E, F) ---');

  const testProject2: StoryProject = {
    id: 'proj_epistemic_02',
    title: 'Entity Identity Test Story',
    description: 'Testing identity and role masking for unperceived actors',
    currentPosition: {
      act: 'Act I',
      chapter: 'Chapter 1',
      scene: 'Scene 1',
      beat: 1,
      location_id: 'loc_tavern',
      location_label: 'The Salty Anchor',
    },
    activePovActorId: 'actor_investigator',
    actors: [
      {
        id: 'actor_investigator',
        identity: { name: 'Miles Locke', working_label: 'Locke', aliases: [] },
        roles: { story: ['protagonist'], scene: ['patron'] },
        traits: { perceptive: 0.8 },
        current_state: { fatigue: 0.1, fear: 0.1, certainty: 0.5, emotion: 'watchful' },
        active_goals: ['Observe the tavern'],
        current_location_id: 'loc_tavern',
        possessions: [],
        isPresent: true,
      },
      // Guarantee D: A present actor has a canonical secret identity
      {
        id: 'actor_007',
        identity: {
          name: 'Lord Veyran',
          working_label: 'Lord Veyran',
          aliases: ['The Shadow Viper', 'High Inquisitor Veyran'],
        },
        roles: { story: ['assassin'], scene: ['infiltrator'] },
        traits: { lethality: 'extreme', secret_order: 'Order of the Black Hand' },
        current_state: { fatigue: 0.0, fear: 0.0, certainty: 1.0, emotion: 'cold' },
        active_goals: ['Execute the contract'],
        current_location_id: 'loc_tavern',
        possessions: ['obj_poison_dagger'],
        isPresent: true,
      },
    ],
    objects: [
      {
        id: 'obj_poison_dagger',
        identity: {
          name: 'Blade of the Black Hand',
          working_label: 'a sheathed dagger',
          aliases: ['Venom Blade'],
        },
        current_holder_id: 'actor_007',
        current_location_id: 'loc_tavern',
        status: 'intact',
        salience: 0.8,
        isPresent: true,
      },
    ],
    locations: [
      {
        id: 'loc_tavern',
        identity: { name: 'The Salty Anchor', working_label: 'the tavern', aliases: [] },
        parent_location_id: null,
        connected_locations: [],
        description_summary: 'A dim, noisy tavern near the docks.',
      },
    ],
    factions: [],
    facts: [],
    knowledge: {
      world_truth: [],
      reader_knowledge: [],
      actor_knowledge: {
        actor_investigator: {
          known_facts: [],
          beliefs: ['A quiet stranger sits by the hearth.'],
          forbidden_knowledge: [],
          // Guarantee E: Current POV knows actor_007 ONLY as "the hooded stranger"
          known_entity_perceptions: {
            actor_007: {
              perceived_label: 'the hooded stranger',
              perceived_name: null,
              perceived_role: 'quiet stranger',
              perceived_traits: { posture: 'still' },
            },
          },
        },
      },
    },
    reveals: [],
    threads: [],
    manuscript: [],
    mentions: [],
    temporalHistory: [],
  };

  const investigatorContext = compileGenerationContext({
    project: testProject2,
    activePovActorId: 'actor_investigator',
    currentPosition: testProject2.currentPosition,
    operation: 'GENERATION',
    narrativeDistance: 'BEAT',
  });

  const serializedInvestigatorContext = JSON.stringify(investigatorContext);

  // Guarantee F: Serialized GenerationContext contains neutral ID and "the hooded stranger",
  // but NOT canonical name, secret aliases, secret role, or secret traits.
  assert(
    serializedInvestigatorContext.includes('actor_007'),
    'Serialized GenerationContext contains the stable internal ID actor_007'
  );
  assert(
    serializedInvestigatorContext.includes('the hooded stranger'),
    'Serialized GenerationContext contains perceived label "the hooded stranger"'
  );
  assert(
    !serializedInvestigatorContext.includes('Lord Veyran'),
    'Serialized GenerationContext does NOT contain canonical name "Lord Veyran"'
  );
  assert(
    !serializedInvestigatorContext.includes('assassin'),
    'Serialized GenerationContext does NOT contain secret role "assassin"'
  );
  assert(
    !serializedInvestigatorContext.includes('The Shadow Viper'),
    'Serialized GenerationContext does NOT contain secret alias "The Shadow Viper"'
  );
  assert(
    !serializedInvestigatorContext.includes('Order of the Black Hand'),
    'Serialized GenerationContext does NOT contain secret trait "Order of the Black Hand"'
  );
  assert(
    !serializedInvestigatorContext.includes('Blade of the Black Hand'),
    'Serialized GenerationContext does NOT contain secret object name "Blade of the Black Hand"'
  );


  // -------------------------------------------------------------
  // TEST SUITE 3: THREAD VISIBILITY LEAKAGE TEST (Guarantees G, H, I, J)
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Thread Visibility Filtering (G, H, I, J) ---');

  const testProject3: StoryProject = {
    id: 'proj_epistemic_03',
    title: 'Thread Visibility Test Story',
    description: 'Testing exclusion of author-only threads and inclusion of POV-authorized threads',
    currentPosition: {
      act: 'Act I',
      chapter: 'Chapter 1',
      scene: 'Scene 1',
      beat: 1,
      location_id: 'loc_office',
      location_label: 'Harbor Office',
    },
    activePovActorId: 'actor_clerk',
    actors: [
      {
        id: 'actor_clerk',
        identity: { name: 'Cedric', working_label: 'the clerk', aliases: [] },
        roles: { story: ['protagonist'], scene: ['recorder'] },
        traits: { methodical: 0.9 },
        current_state: { fatigue: 0.1, fear: 0.1, certainty: 0.7, emotion: 'calm' },
        active_goals: ['Audit the ledger'],
        current_location_id: 'loc_office',
        possessions: [],
        isPresent: true,
      },
    ],
    objects: [],
    locations: [
      {
        id: 'loc_office',
        identity: { name: 'Harbor Office', working_label: 'the office', aliases: [] },
        parent_location_id: null,
        connected_locations: [],
        description_summary: 'A dusty office with piles of shipment logs.',
      },
    ],
    factions: [],
    facts: [],
    knowledge: {
      world_truth: [],
      reader_knowledge: [],
      actor_knowledge: {
        actor_clerk: {
          known_facts: [],
          beliefs: ['The books must balance.'],
          forbidden_knowledge: [],
          known_threads: ['thread_visible_audit_01'],
        },
      },
    },
    reveals: [],
    // Guarantee G & I: Open author-only thread AND POV-visible open thread
    threads: [
      {
        id: 'thread_author_conspiracy_01',
        label: 'Secret high-council treason plot',
        status: 'open',
        importance: 'critical',
        introduced_in: 'Act I Outline',
        resolution_allowed: false,
        author_only: true, // Guarantee G: Open author-only thread exists
      },
      {
        id: 'thread_visible_audit_01',
        label: 'Find the missing harbor trade ledger',
        status: 'open',
        importance: 'major',
        introduced_in: 'Chapter 1',
        resolution_allowed: true,
        author_only: false,
        visible_to_actor_ids: ['actor_clerk'], // Guarantee I: POV-visible open thread exists
      },
    ],
    manuscript: [],
    mentions: [],
    temporalHistory: [],
  };

  const clerkContext = compileGenerationContext({
    project: testProject3,
    activePovActorId: 'actor_clerk',
    currentPosition: testProject3.currentPosition,
    operation: 'CONTINUATION',
    narrativeDistance: 'BEAT',
  });

  const serializedClerkContext = JSON.stringify(clerkContext);

  // Guarantee H: Author-only thread is absent from GenerationContext
  assert(
    !serializedClerkContext.includes('thread_author_conspiracy_01'),
    'Author-only thread ID thread_author_conspiracy_01 is ABSENT from serialized GenerationContext'
  );
  assert(
    !serializedClerkContext.includes('Secret high-council treason plot'),
    'Author-only thread label "Secret high-council treason plot" is ABSENT from serialized GenerationContext'
  );

  // Guarantee J: POV-visible thread is present in GenerationContext
  assert(
    serializedClerkContext.includes('thread_visible_audit_01'),
    'POV-visible thread ID thread_visible_audit_01 is PRESENT in serialized GenerationContext'
  );
  assert(
    serializedClerkContext.includes('Find the missing harbor trade ledger'),
    'POV-visible thread label "Find the missing harbor trade ledger" is PRESENT in serialized GenerationContext'
  );
  assert(
    clerkContext.relevantOpenThreads.length === 1,
    'relevantOpenThreads array length is exactly 1'
  );

  console.log('\n🎉 ALL 10 EPISTEMIC GUARANTEES (A through J) VERIFIED AND PASSED!\n');
}

runTests();
