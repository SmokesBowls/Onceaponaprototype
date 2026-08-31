import React from 'react';
import { Clock, MapPin, Package, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { StoryProject } from '../types';

interface TemporalTimelineProps {
  project: StoryProject;
}

export const TemporalTimeline: React.FC<TemporalTimelineProps> = ({ project }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Banner */}
      <div className="bg-[#FAF8F2] border border-[#1A1A1A] rounded p-6 shadow-sm">
        <span className="text-[9px] uppercase tracking-[0.3em] font-sans text-[#736B63] block font-bold mb-1">
          Chronological Ledger
        </span>
        <div className="flex items-center gap-2 text-[#1A1A1A] font-serif italic text-2xl sm:text-3xl font-light">
          <Clock className="h-6 w-6 text-[#1A1A1A]" />
          <span>Temporal State Tracking & Narrative Memory</span>
        </div>
        <p className="text-xs text-[#5A554E] font-serif italic mt-1.5 max-w-3xl leading-relaxed">
          Relationships and physical states evolve over narrative time ($T_1 \rightarrow T_2 \rightarrow T_3$).
          Rather than overwriting history with the latest state, the engine retains chronological states to prevent continuity anomalies and impossible time jumps.
        </p>
      </div>

      {/* Manuscript Beats as Timeline Nodes */}
      <div className="space-y-6">
        {project.manuscript.map((beat, idx) => {
          const povActor = project.actors.find((a) => a.id === beat.povActorId);
          const location = project.locations.find((l) => l.id === beat.locationId);

          return (
            <div
              key={beat.id}
              className="bg-[#FAF8F2] border border-[#1A1A1A] rounded p-6 shadow-sm space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1A1A1A]/20 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-0.5 rounded bg-[#1A1A1A] text-[#FDFCF8] font-mono text-xs font-bold">
                    T{idx + 1}
                  </span>
                  <span className="text-xs font-sans uppercase font-bold tracking-wider text-[#1A1A1A]">Beat #{idx + 1}</span>
                  <span className="text-[#1A1A1A]/30">|</span>
                  <span className="text-xs font-serif text-[#5A554E] italic">
                    Location: <strong className="text-[#1A1A1A] not-italic">{location?.identity.name || beat.locationId}</strong>
                  </span>
                </div>
                <div className="text-xs font-serif italic text-[#736B63]">
                  POV: <span className="font-semibold text-[#1A1A1A] not-italic">{povActor?.identity.name || beat.povActorId}</span>
                </div>
              </div>

              {/* Prose quote */}
              <p className="text-sm font-serif text-[#1A1A1A] italic bg-[#FDFCF8] p-4 rounded border border-[#1A1A1A]/20 leading-relaxed shadow-xs">
                "{beat.text}"
              </p>

              {/* State snapshot summary for this beat */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs font-sans text-[#736B63]">
                <div className="bg-[#FDFCF8] p-3.5 rounded border border-[#1A1A1A]/15 space-y-1">
                  <span className="text-[#1A1A1A] font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-[#1A1A1A]" />
                    <span>Actor Presence:</span>
                  </span>
                  <div className="text-[#1A1A1A] font-serif text-xs">
                    {project.actors
                      .filter((a) => a.current_location_id === beat.locationId)
                      .map((a) => a.identity.name || a.id)
                      .join(', ') || 'None recorded'}
                  </div>
                </div>

                <div className="bg-[#FDFCF8] p-3.5 rounded border border-[#1A1A1A]/15 space-y-1">
                  <span className="text-[#1A1A1A] font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-[#1A1A1A]" />
                    <span>Physical Possessions:</span>
                  </span>
                  <div className="text-[#1A1A1A] font-serif text-xs truncate">
                    {project.objects
                      .map((o) => `${o.identity.name || o.id} (${o.current_holder_id || 'unheld'})`)
                      .join(', ')}
                  </div>
                </div>

                <div className="bg-[#FDFCF8] p-3.5 rounded border border-[#1A1A1A]/15 space-y-1">
                  <span className="text-[#1A1A1A] font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#2D5A27]" />
                    <span>Continuity Gate:</span>
                  </span>
                  <div className="text-[#2D5A27] font-bold uppercase tracking-wider text-[10px]">Validated & Canonized</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
