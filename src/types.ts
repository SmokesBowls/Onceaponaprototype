export type NarrativeDistance =
  | 'FRAGMENT'
  | 'BEAT'
  | 'EXCHANGE'
  | 'SEQUENCE'
  | 'SCENE'
  | 'CHAPTER';

export type OperatingMode =
  | 'CONTINUATION'
  | 'GENERATION'
  | 'TRANSFORMATION'
  | 'ANALYSIS';

export interface EntityIdentity {
  name: string | null;
  working_label: string;
  aliases: string[];
}

export interface ActorEntity {
  id: string; // e.g. "actor_001"
  identity: EntityIdentity;
  roles: {
    story: string[]; // e.g. ["antagonist", "detective"]
    scene: string[]; // e.g. ["interrogator", "observer"]
  };
  traits: Record<string, number | string>; // e.g. { protective: 0.8, trusting: 0.3 }
  current_state: {
    fatigue: number;
    fear: number;
    certainty: number;
    emotion: string;
  };
  active_goals: string[];
  current_location_id: string;
  possessions: string[]; // object IDs
  isPresent: boolean;
}

export interface ObjectEntity {
  id: string; // e.g. "object_001"
  identity: EntityIdentity;
  current_holder_id: string | null; // actor_id or null
  current_location_id: string | null;
  status: 'intact' | 'damaged' | 'destroyed' | 'missing';
  salience: number; // 0.0 to 1.0 based on mentions & connections
  isPresent: boolean;
}

export interface LocationEntity {
  id: string; // e.g. "location_001"
  identity: EntityIdentity;
  parent_location_id: string | null;
  connected_locations: string[];
  description_summary: string;
}

export interface FactionEntity {
  id: string; // e.g. "faction_001"
  identity: EntityIdentity;
  members: string[]; // actor IDs
  influence: string;
}

export interface FactEntity {
  id: string; // e.g. "fact_001"
  statement: string;
  status: 'established' | 'inferred' | 'suspected';
  confidence: number; // 0.0 to 1.0
  source_mention_id?: string;
  provenance: {
    chapter?: string;
    scene?: string;
    beat?: number;
    evidence_quote?: string;
  };
}

export interface ThreadEntity {
  id: string; // e.g. "thread_001"
  label: string;
  status: 'open' | 'complicated' | 'resolved';
  importance: 'minor' | 'major' | 'critical';
  introduced_in: string;
  resolution_allowed: boolean;
  author_only?: boolean; // If true, author-only thread hidden from generation context
  visible_to_actor_ids?: string[]; // Actor IDs permitted to be aware of this thread
}

export interface RevealEntity {
  id: string; // e.g. "reveal_001"
  fact_id: string;
  label: string;
  status: 'locked' | 'foreshadowed' | 'unlocked';
  allowed_before_unlock: string[]; // e.g. ["foreshadow", "ambiguous_sensory"]
  forbidden_before_unlock: string[]; // e.g. ["direct_explanation", "narrator_confirmation"]
}

export interface MentionRecord {
  id: string; // e.g. "mention_001"
  entity_id: string;
  passage_text: string;
  scene_id: string;
  beat_index: number;
  timestamp_label: string;
  confidence: number;
  evidence_notes: string[];
  extracted_relationships: Array<{
    type: 'located_at' | 'possessed_by' | 'known_by' | 'used_during';
    target_id: string;
  }>;
}

export interface KnowledgeBoundaries {
  world_truth: string[]; // Array of fact IDs true in world
  reader_knowledge: string[]; // Facts the reader has observed
  actor_knowledge: Record<
    string,
    {
      known_facts: string[]; // facts this actor knows
      beliefs: string[]; // beliefs (may differ from world truth)
      forbidden_knowledge: string[]; // facts actor MUST NOT know
      known_entity_perceptions?: Record<
        string,
        {
          perceived_label: string; // e.g. "the hooded stranger"
          perceived_name?: string | null; // null if real name is unknown to POV
          perceived_role?: string | null; // e.g. "unidentified patron"
          perceived_traits?: Record<string, any>;
        }
      >;
      known_entities?: string[]; // IDs of entities whose canonical names are known
      known_threads?: string[]; // IDs of threads this actor is aware of
    }
  >;
}

export interface TemporalSnapshot {
  time_index: string; // "T1", "T2", "T3"
  operation_id?: string;
  timestamp?: number;
  label: string;
  beat_ref: string;
  previous_story_position?: StoryPosition;
  resulting_story_position?: StoryPosition;
  accepted_beat_id?: string;
  pov_actor_id?: string;
  location_id?: string;
  affected_entity_ids?: string[];
  applied_state_changes?: string[];
  thread_changes?: string[];
  reveal_changes?: string[];
  mention_ids?: string[];
  entity_locations: Record<string, string>; // entity_id -> location_id
  object_possessions: Record<string, string | null>; // object_id -> actor_id | null
  actor_states: Record<string, { fatigue: number; emotion: string }>;
  unlocked_reveals: string[];
}

export interface RewriteContract {
  presetName: string;
  modify: string[];
  preserve: string[];
  forbid: string[];
}

export interface GenerationContext {
  operatingMode: OperatingMode;
  narrativeDistance: NarrativeDistance;
  storyPosition: StoryPosition;
  activePovActor: {
    id: string;
    identity: EntityIdentity;
    roles: { story: string[]; scene: string[] };
    traits: Record<string, number | string>;
    current_state: { fatigue: number; fear: number; certainty: number; emotion: string };
    active_goals: string[];
    current_location_id: string;
    possessions: string[];
  };
  knownFacts: Array<{
    id: string;
    statement: string;
    status: string;
    provenance?: any;
  }>;
  sincereBeliefs: string[];
  presentEntities: Array<{
    id: string;
    type: 'actor' | 'object' | 'location';
    label: string;
    name: string | null;
    aliases: string[];
    roleOrStatus?: string;
    locationId?: string | null;
    currentHolderId?: string | null;
    traitsOrDescription?: any;
    currentState?: any;
  }>;
  currentLocation: {
    id: string;
    name: string | null;
    working_label: string;
    description_summary: string;
    connected_locations: string[];
  } | null;
  relevantPossessions: Array<{
    id: string;
    label: string;
    holderId: string | null;
    holderName: string | null;
  }>;
  relevantOpenThreads: Array<{
    id: string;
    label: string;
    importance: string;
    resolution_allowed: boolean;
  }>;
  permittedForeshadowingCues: string[];
  recentProse: string;
  rewriteContract: RewriteContract | null;
}

export interface ValidationContext {
  povActorId: string;
  povActorLabel: string;
  forbiddenFacts: Array<{ id: string; statement: string }>;
  lockedReveals: Array<{
    id: string;
    factStatement?: string;
    allowedBeforeUnlock: string[];
    forbiddenBeforeUnlock: string[];
    status: string;
  }>;
  worldTruthFacts: Array<{ id: string; statement: string }>;
  presentEntityIds: string[];
  displacedEntityIds: string[];
  objectHolders: Record<string, string | null>;
  openThreads: Array<{ id: string; label: string; resolution_allowed: boolean }>;
  narrativeDistance: NarrativeDistance;
  rewriteContract: RewriteContract | null;
}

export interface BeatPlanStage1 {
  beat_type: string;
  primary_actor_id: string;
  intended_action: string;
  permitted_entities_involved?: string[];
  permitted_state_transitions?: string[];
  knowledge_verified: boolean;
  reveals_protected: boolean;
  threads_advanced: string[];
  threads_resolved: string[];
  distance_budget: NarrativeDistance;
  plan_notes?: string;
}

export interface ValidationDiagnostic {
  severity: 'FATAL' | 'WARNING' | 'INFO';
  rule: string;
  message: string;
  remedy?: string;
}

export interface ValidationReport {
  passed: boolean;
  score: number;
  diagnostics: ValidationDiagnostic[];
  verified: boolean;
  status: 'VERIFIED' | 'UNVERIFIED';
  notes?: string;
}

export interface CandidateGeneration {
  id: string;
  timestamp: number;
  operation: OperatingMode;
  narrativeDistance: NarrativeDistance;
  prompt: string;
  stage1Plan?: BeatPlanStage1;
  stage2Prose: string;
  validation: ValidationReport;
  contextPackage: any;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface HistoryReceipt {
  operation_id: string;
  timestamp: number;
  summary: string;
  changes: string[];
  snapshot: StoryProject;
}

export interface StoryPosition {
  act: string;
  chapter: string;
  scene: string;
  beat: number;
  location_id: string;
  location_label: string;
}

export interface StoryProject {
  id: string;
  title: string;
  description: string;
  currentPosition: StoryPosition;
  activePovActorId: string;
  manuscript: Array<{
    id: string;
    beatNumber: number;
    text: string;
    povActorId: string;
    locationId: string;
    acceptedAt: number;
  }>;
  actors: ActorEntity[];
  objects: ObjectEntity[];
  locations: LocationEntity[];
  factions: FactionEntity[];
  facts: FactEntity[];
  threads: ThreadEntity[];
  reveals: RevealEntity[];
  mentions: MentionRecord[];
  knowledge: KnowledgeBoundaries;
  temporalHistory: TemporalSnapshot[];
}

export interface BenchmarkTestCase {
  id: string;
  title: string;
  category: string;
  description: string;
  setupSummary: string;
  prompt: string;
  requestedDistance: NarrativeDistance;
  constraints: {
    forbiddenRevealId?: string;
    forbiddenKnowledgeFactId?: string;
    protectedInvariants?: string[];
    displacedObjectId?: string;
    isolatedActorId?: string;
  };
  nakedModelBehavior: {
    flawName: string;
    explanation: string;
    sampleViolationOutput: string;
  };
  frameworkBehavior: {
    remedyName: string;
    explanation: string;
    sampleCompliantOutput: string;
  };
}
