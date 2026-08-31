import React, { useState } from 'react';
import {
  FileText,
  Search,
  BookOpen,
  Users,
  Package,
  MapPin,
  HelpCircle,
  Award,
  Layers,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { StoryProject } from '../types';

interface CodexViewProps {
  project: StoryProject;
}

export const CodexView: React.FC<CodexViewProps> = ({ project }) => {
  const [activeSection, setActiveSection] = useState<'all' | 'actors' | 'objects' | 'locations' | 'facts' | 'threads'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const sections = [
    { id: 'all', label: 'All Codex Entries' },
    { id: 'actors', label: `Dramatis Personae (${project.actors.length})` },
    { id: 'objects', label: `Relics & Objects (${project.objects.length})` },
    { id: 'locations', label: `Locations (${project.locations.length})` },
    { id: 'facts', label: `Established Lore (${project.facts.length})` },
    { id: 'threads', label: `Open Threads (${project.threads.length})` },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Banner */}
      <div className="bg-[#FAF8F2] border border-[#1A1A1A] rounded p-6 shadow-sm">
        <span className="text-[9px] uppercase tracking-[0.3em] font-sans text-[#736B63] block font-bold mb-1">
          Manuscript Anthology
        </span>
        <div className="flex items-center gap-2 text-[#1A1A1A] font-serif italic text-2xl sm:text-3xl font-light">
          <BookOpen className="h-6 w-6 text-[#1A1A1A]" />
          <span>Synthesized Story Codex</span>
        </div>
        <p className="text-xs text-[#5A554E] font-serif italic mt-1.5 max-w-3xl leading-relaxed">
          The Codex is generated progressively from accumulated story understanding (mentions + entities + relationships + state changes + evidence) rather than manual lore authoring.
        </p>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FAF8F2] p-2.5 rounded border border-[#1A1A1A]/30">
        <div className="flex flex-wrap gap-1">
          {sections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id as any)}
              className={`px-3.5 py-1.5 rounded text-[11px] font-sans uppercase font-bold tracking-wider transition ${
                activeSection === sec.id
                  ? 'bg-[#1A1A1A] text-[#FDFCF8] shadow-sm'
                  : 'text-[#736B63] hover:text-[#1A1A1A] hover:bg-[#E5E2D9]'
              }`}
            >
              {sec.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-[#736B63]" />
          <input
            type="text"
            placeholder="Search Codex..."
            className="w-full bg-[#FDFCF8] border border-[#1A1A1A]/30 rounded pl-9 pr-3 py-1.5 text-xs text-[#1A1A1A] placeholder-[#8C827A] focus:outline-none focus:border-[#1A1A1A]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Codex Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Actors */}
        {(activeSection === 'all' || activeSection === 'actors') &&
          project.actors.map((actor) => {
            const mentionsCount = project.mentions.filter((m) => m.entity_id === actor.id).length;
            return (
              <div
                key={actor.id}
                className="bg-[#FAF8F2] border border-[#1A1A1A]/30 rounded p-5 space-y-3 shadow-sm hover:border-[#1A1A1A] transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-[#1A1A1A] font-bold bg-[#E5E2D9] px-2 py-0.5 rounded border border-[#1A1A1A]/20">
                      {actor.id}
                    </span>
                    <h3 className="text-lg font-bold text-[#1A1A1A] font-serif italic mt-2">
                      {actor.identity.name || actor.identity.working_label}
                    </h3>
                  </div>
                  <span className="text-[10px] text-[#736B63] font-sans uppercase font-bold tracking-wider">{mentionsCount} mentions</span>
                </div>

                <p className="text-xs text-[#5A554E] font-serif italic">Working Label: "{actor.identity.working_label}"</p>

                <div className="text-xs font-sans space-y-1.5 bg-[#FDFCF8] p-3 rounded border border-[#1A1A1A]/15 text-[#1A1A1A]">
                  <div>
                    <span className="text-[#736B63] font-bold uppercase text-[9px] tracking-wider block">Story Role:</span> {actor.roles.story.join(', ')}
                  </div>
                  <div>
                    <span className="text-[#736B63] font-bold uppercase text-[9px] tracking-wider block">Location:</span> {actor.current_location_id}
                  </div>
                  <div>
                    <span className="text-[#736B63] font-bold uppercase text-[9px] tracking-wider block">Active Goals:</span> {actor.active_goals.join('; ')}
                  </div>
                </div>
              </div>
            );
          })}

        {/* Objects */}
        {(activeSection === 'all' || activeSection === 'objects') &&
          project.objects.map((obj) => (
            <div
              key={obj.id}
              className="bg-[#FAF8F2] border border-[#1A1A1A]/30 rounded p-5 space-y-3 shadow-sm hover:border-[#1A1A1A] transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono text-[#1A1A1A] font-bold bg-[#E5E2D9] px-2 py-0.5 rounded border border-[#1A1A1A]/20">
                    {obj.id}
                  </span>
                  <h3 className="text-lg font-bold text-[#1A1A1A] font-serif italic mt-2">
                    {obj.identity.name || obj.identity.working_label}
                  </h3>
                </div>
                <span className="text-[9px] text-[#FDFCF8] font-sans font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#1A1A1A]">
                  {obj.status}
                </span>
              </div>

              <div className="text-xs font-sans space-y-1 bg-[#FDFCF8] p-3 rounded border border-[#1A1A1A]/15 text-[#1A1A1A]">
                <div>
                  <span className="text-[#736B63] font-bold uppercase text-[9px] tracking-wider block">Holder:</span> {obj.current_holder_id || 'unheld'}
                </div>
                <div>
                  <span className="text-[#736B63] font-bold uppercase text-[9px] tracking-wider block">Salience:</span> {(obj.salience * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          ))}

        {/* Facts & Lore */}
        {(activeSection === 'all' || activeSection === 'facts') &&
          project.facts.map((fact) => (
            <div
              key={fact.id}
              className="bg-[#FAF8F2] border border-[#1A1A1A]/30 rounded p-5 space-y-3 shadow-sm hover:border-[#1A1A1A] transition"
            >
              <div className="flex items-center justify-between font-sans text-[10px] uppercase font-bold">
                <span className="text-[#1A1A1A] font-mono">{fact.id}</span>
                <span className="text-[#2D5A27]">{(fact.confidence * 100).toFixed(0)}% Confidence</span>
              </div>

              <p className="text-sm font-serif italic text-[#1A1A1A] leading-relaxed">"{fact.statement}"</p>

              {fact.provenance?.evidence_quote && (
                <div className="text-[10px] font-sans text-[#736B63] bg-[#FDFCF8] p-2 rounded border border-[#1A1A1A]/15">
                  Provenance: "{fact.provenance.evidence_quote}"
                </div>
              )}
            </div>
          ))}

        {/* Narrative Threads */}
        {(activeSection === 'all' || activeSection === 'threads') &&
          project.threads.map((thread) => (
            <div
              key={thread.id}
              className="bg-[#FAF8F2] border border-[#1A1A1A]/30 rounded p-5 space-y-3 shadow-sm hover:border-[#1A1A1A] transition"
            >
              <div className="flex items-center justify-between font-sans text-[10px] uppercase font-bold">
                <span className="text-[#1A1A1A] font-mono">{thread.id}</span>
                <span
                  className={`px-2 py-0.5 rounded font-bold uppercase ${
                    thread.status === 'open'
                      ? 'bg-[#966F33] text-[#FDFCF8]'
                      : 'bg-[#2D5A27] text-[#FDFCF8]'
                  }`}
                >
                  {thread.status}
                </span>
              </div>

              <h4 className="text-base font-bold font-serif italic text-[#1A1A1A]">{thread.label}</h4>

              <div className="text-[10px] font-sans uppercase font-bold tracking-wider text-[#736B63] flex items-center justify-between border-t border-[#1A1A1A]/15 pt-2">
                <span>Importance: {thread.importance}</span>
                <span>Resolution Allowed: {thread.resolution_allowed ? 'Yes' : 'No'}</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};
