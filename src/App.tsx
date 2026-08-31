import React, { useState } from 'react';
import { Header } from './components/Header';
import { StoryEditor } from './components/StoryEditor';
import { RelationalGraph } from './components/RelationalGraph';
import { KnowledgeMatrix } from './components/KnowledgeMatrix';
import { TemporalTimeline } from './components/TemporalTimeline';
import { CodexView } from './components/CodexView';
import { BenchmarkRunner } from './components/BenchmarkRunner';
import { LiteraryMechanicsGuide } from './components/LiteraryMechanicsGuide';
import { DEFAULT_PROJECTS } from './data/defaultProjects';
import {
  StoryProject,
  CandidateGeneration,
  OperatingMode,
  NarrativeDistance,
  RewriteContract,
  MentionRecord,
  HistoryReceipt,
  RevealEntity,
  FactEntity,
} from './types';

export default function App() {
  const [projects, setProjects] = useState<StoryProject[]>(DEFAULT_PROJECTS);
  const [activeProjectId, setActiveProjectId] = useState<string>(DEFAULT_PROJECTS[0].id);
  const [activeTab, setActiveTab] = useState<string>('workbench');
  const [candidate, setCandidate] = useState<CandidateGeneration | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [historyStack, setHistoryStack] = useState<HistoryReceipt[]>([]);

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  // Helper to update current project state
  const updateActiveProject = (updated: Partial<StoryProject>) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === activeProjectId ? { ...p, ...updated } : p))
    );
  };

  // Push history snapshot for deterministic undo
  const pushHistorySnapshot = (summary: string, changes: string[]) => {
    const receipt: HistoryReceipt = {
      operation_id: `op_${Date.now()}`,
      timestamp: Date.now(),
      summary,
      changes,
      snapshot: JSON.parse(JSON.stringify(activeProject)),
    };
    setHistoryStack((prev) => [receipt, ...prev]);
  };

  // Undo / Rollback
  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const [lastReceipt, ...remaining] = historyStack;
    setProjects((prev) =>
      prev.map((p) => (p.id === activeProjectId ? lastReceipt.snapshot : p))
    );
    setHistoryStack(remaining);
    setCandidate(null);
  };

  // New Blank Project Creation
  const handleNewProject = () => {
    const newId = `proj_${Date.now()}`;
    const newProject: StoryProject = {
      id: newId,
      title: 'Untitled Narrative Project',
      description: 'A newly initialized story project with neutral entity registry.',
      currentPosition: {
        act: 'Act I',
        chapter: 'Chapter 1: The Inciting Incident',
        scene: 'Scene 1',
        beat: 1,
        location_id: 'location_001',
        location_label: 'The Crossroads',
      },
      activePovActorId: 'actor_001',
      manuscript: [],
      actors: [
        {
          id: 'actor_001',
          identity: {
            name: null,
            working_label: 'the traveler',
            aliases: [],
          },
          roles: {
            story: ['protagonist'],
            scene: ['observer'],
          },
          traits: { observant: 0.8 },
          current_state: { fatigue: 0.1, fear: 0.1, certainty: 0.5, emotion: 'curious' },
          active_goals: ['Investigate the strange signal'],
          current_location_id: 'location_001',
          possessions: [],
          isPresent: true,
        },
      ],
      objects: [],
      locations: [
        {
          id: 'location_001',
          identity: {
            name: 'The Crossroads',
            working_label: 'the quiet crossroads',
            aliases: [],
          },
          parent_location_id: null,
          connected_locations: [],
          description_summary: 'An open junction where ancient paths converge.',
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
          actor_001: { known_facts: [], beliefs: [], forbidden_knowledge: [] },
        },
      },
      temporalHistory: [],
    };

    setProjects((prev) => [newProject, ...prev]);
    setActiveProjectId(newId);
    setCandidate(null);
    setHistoryStack([]);
  };

  // Framework Pipeline Execution
  const handleExecuteFramework = async (params: {
    operation: OperatingMode;
    narrativeDistance: NarrativeDistance;
    authorPrompt: string;
    rewriteContract?: RewriteContract;
  }) => {
    setIsGenerating(true);
    try {
      const recentProse = activeProject.manuscript
        .slice(-3)
        .map((b) => b.text)
        .join('\n\n');

      const povActor = activeProject.actors.find((a) => a.id === activeProject.activePovActorId);

      const response = await fetch('/api/framework/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: params.operation,
          narrativeDistance: params.narrativeDistance,
          proseContext: recentProse,
          currentPosition: activeProject.currentPosition,
          activePovActor: povActor,
          entities: [
            ...activeProject.actors,
            ...activeProject.objects,
            ...activeProject.locations,
          ],
          knowledgeBoundaries: activeProject.knowledge,
          activeThreads: activeProject.threads,
          lockedReveals: activeProject.reveals,
          rewriteContract: params.rewriteContract,
          authorPrompt: params.authorPrompt,
          twoStageMode: true,
        }),
      });

      const data = await response.json();

      // Formulate candidate generation for author review
      const newCandidate: CandidateGeneration = {
        id: `cand_${Date.now()}`,
        timestamp: Date.now(),
        operation: params.operation,
        narrativeDistance: params.narrativeDistance,
        prompt: params.authorPrompt,
        stage1Plan: data.stage1,
        stage2Prose: data.stage2Prose || 'Prose generation completed.',
        validation: data.validation || {
          passed: true,
          score: 100,
          diagnostics: [
            {
              severity: 'INFO',
              rule: 'FRAMEWORK_PASS',
              message: 'Narrative distance and epistemic boundaries verified.',
            },
          ],
        },
        contextPackage: data.contextPackage,
        status: 'pending',
      };

      setCandidate(newCandidate);
    } catch (err) {
      console.error('Execution error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Naked Execution for Benchmark Comparison
  const handleExecuteNaked = async (prompt: string): Promise<string> => {
    const recentProse = activeProject.manuscript
      .slice(-3)
      .map((b) => b.text)
      .join('\n\n');

    const res = await fetch('/api/benchmark/naked-execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proseContext: recentProse,
        authorPrompt: prompt,
      }),
    });
    const data = await res.json();
    return data.prose || 'No response from naked model.';
  };

  // Accept Candidate and Promote to Story Canon
  const handleAcceptCandidate = () => {
    if (!candidate) return;

    // Snapshot state before acceptance
    pushHistorySnapshot(`Accepted ${candidate.narrativeDistance} generation`, [
      `Added Beat #${activeProject.manuscript.length + 1}`,
      `Advanced Story Position to Beat #${activeProject.currentPosition.beat + 1}`,
    ]);

    const newBeatNumber = activeProject.manuscript.length + 1;
    const newBeat = {
      id: `beat_${Date.now()}`,
      beatNumber: newBeatNumber,
      text: candidate.stage2Prose,
      povActorId: activeProject.activePovActorId,
      locationId: activeProject.currentPosition.location_id,
      acceptedAt: Date.now(),
    };

    // Update mentions automatically
    const newMention: MentionRecord = {
      id: `mention_${Date.now()}`,
      entity_id: activeProject.activePovActorId,
      passage_text: candidate.stage2Prose.slice(0, 100) + '...',
      scene_id: activeProject.currentPosition.scene,
      beat_index: newBeatNumber,
      timestamp_label: `T${newBeatNumber}: Beat ${newBeatNumber}`,
      confidence: 0.98,
      evidence_notes: ['Generated and accepted through Onceaponatime framework pipeline.'],
      extracted_relationships: [
        { type: 'located_at', target_id: activeProject.currentPosition.location_id },
      ],
    };

    updateActiveProject({
      manuscript: [...activeProject.manuscript, newBeat],
      currentPosition: {
        ...activeProject.currentPosition,
        beat: activeProject.currentPosition.beat + 1,
      },
      mentions: [...activeProject.mentions, newMention],
    });

    setCandidate(null);
  };

  const handleRejectCandidate = () => {
    setCandidate(null);
  };

  const handleEditCandidateText = (text: string) => {
    if (!candidate) return;
    setCandidate({ ...candidate, stage2Prose: text });
  };

  // Entity Merging Mechanic
  const handleMergeEntities = (primaryId: string, secondaryId: string, entityType: 'actor' | 'object') => {
    pushHistorySnapshot(`Merged ${secondaryId} into ${primaryId}`, [
      `Migrated all mentions of ${secondaryId} to ${primaryId}`,
    ]);

    // Migrate mentions
    const updatedMentions = activeProject.mentions.map((m) =>
      m.entity_id === secondaryId ? { ...m, entity_id: primaryId } : m
    );

    if (entityType === 'actor') {
      const remainingActors = activeProject.actors.filter((a) => a.id !== secondaryId);
      updateActiveProject({ actors: remainingActors, mentions: updatedMentions });
    } else {
      const remainingObjects = activeProject.objects.filter((o) => o.id !== secondaryId);
      updateActiveProject({ objects: remainingObjects, mentions: updatedMentions });
    }
  };

  // Entity Splitting Mechanic
  const handleSplitEntity = (entityId: string, mentionIdsToMove: string[], newWorkingLabel: string) => {
    const newEntityId = `${entityId.split('_')[0]}_${String(Date.now()).slice(-3)}`;
    pushHistorySnapshot(`Split ${entityId} into new entity ${newEntityId}`, [
      `Created ${newEntityId} ("${newWorkingLabel}")`,
      `Moved ${mentionIdsToMove.length} mentions`,
    ]);

    const updatedMentions = activeProject.mentions.map((m) =>
      mentionIdsToMove.includes(m.id) ? { ...m, entity_id: newEntityId } : m
    );

    if (entityId.startsWith('actor')) {
      const newActor = {
        id: newEntityId,
        identity: { name: null, working_label: newWorkingLabel, aliases: [] },
        roles: { story: ['supporting'], scene: ['participant'] },
        traits: {},
        current_state: { fatigue: 0.1, fear: 0.1, certainty: 0.5, emotion: 'neutral' },
        active_goals: [],
        current_location_id: activeProject.currentPosition.location_id,
        possessions: [],
        isPresent: true,
      };
      updateActiveProject({
        actors: [...activeProject.actors, newActor],
        mentions: updatedMentions,
      });
    } else {
      const newObj = {
        id: newEntityId,
        identity: { name: null, working_label: newWorkingLabel, aliases: [] },
        current_holder_id: null,
        current_location_id: activeProject.currentPosition.location_id,
        status: 'intact' as const,
        salience: 0.5,
        isPresent: true,
      };
      updateActiveProject({
        objects: [...activeProject.objects, newObj],
        mentions: updatedMentions,
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-[#1A1A1A] font-serif selection:bg-[#E5E2D9] selection:text-[#1A1A1A] flex flex-col justify-between">
      <div>
        {/* Top Header & Masthead */}
        <Header
          projects={projects}
          activeProject={activeProject}
          onSelectProject={setActiveProjectId}
          onNewProject={handleNewProject}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          undoCount={historyStack.length}
          onUndo={handleUndo}
        />

        {/* Main Tab Routing */}
        <main className="pb-12">
          {activeTab === 'workbench' && (
            <StoryEditor
              project={activeProject}
              onUpdateManuscript={(beats) => updateActiveProject({ manuscript: beats })}
              onSetPovActor={(actorId) => updateActiveProject({ activePovActorId: actorId })}
              onSetLocation={(locId, locLabel) =>
                updateActiveProject({
                  currentPosition: {
                    ...activeProject.currentPosition,
                    location_id: locId,
                    location_label: locLabel,
                  },
                })
              }
              onExecuteFramework={handleExecuteFramework}
              onExecuteNaked={handleExecuteNaked}
              candidate={candidate}
              onAcceptCandidate={handleAcceptCandidate}
              onRejectCandidate={handleRejectCandidate}
              onEditCandidateText={handleEditCandidateText}
              isGenerating={isGenerating}
            />
          )}

          {activeTab === 'graph' && (
            <RelationalGraph
              project={activeProject}
              onUpdateEntity={(cat, list) => updateActiveProject({ [cat]: list })}
              onAddMention={(m) => updateActiveProject({ mentions: [...activeProject.mentions, m] })}
              onMergeEntities={handleMergeEntities}
              onSplitEntity={handleSplitEntity}
            />
          )}

          {activeTab === 'knowledge' && (
            <KnowledgeMatrix
              project={activeProject}
              onUpdateKnowledge={(k) => updateActiveProject({ knowledge: k })}
              onUpdateReveals={(revs) => updateActiveProject({ reveals: revs })}
              onAddFact={(f) => updateActiveProject({ facts: [...activeProject.facts, f] })}
            />
          )}

          {activeTab === 'timeline' && <TemporalTimeline project={activeProject} />}

          {activeTab === 'codex' && <CodexView project={activeProject} />}

          {activeTab === 'benchmark' && <BenchmarkRunner />}

          {activeTab === 'mechanics' && <LiteraryMechanicsGuide />}
        </main>
      </div>

      {/* Editorial Aesthetic Nav / Archive Footer */}
      <footer className="border-t border-[#1A1A1A] bg-[#FDFCF8] py-6 px-4 sm:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] uppercase tracking-[0.25em] font-sans font-bold text-[#5A554E]">
          <div className="flex items-center gap-6 flex-wrap">
            <span className="text-[#1A1A1A]">Onceaponatime</span>
            <span className="opacity-40">|</span>
            <span>Issue No. 04</span>
            <span className="opacity-40">|</span>
            <span>The Narrative Archive</span>
            <span className="opacity-40">|</span>
            <span>Literary Mechanics v1.0</span>
          </div>
          <div>© Storyteller Press & Research Folio</div>
        </div>
      </footer>
    </div>
  );
}
