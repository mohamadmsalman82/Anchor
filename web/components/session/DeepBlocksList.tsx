'use client';

import { ActivitySegment } from '@/lib/types';
import { formatDuration } from '@/lib/utils';
import { AnchorCard } from '@/components/ui/AnchorCard';

interface DeepBlocksListProps {
  segments: ActivitySegment[];
}

export function DeepBlocksList({ segments }: DeepBlocksListProps) {
  if (!segments || segments.length === 0) return null;

  // Group contiguous locked-in segments into "blocks"
  const blocks = [];
  let currentBlock = null;

  // Sort segments just in case
  const sortedSegments = [...segments].sort((a, b) => 
    new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  for (const seg of sortedSegments) {
    const duration = (new Date(seg.end).getTime() - new Date(seg.start).getTime()) / 1000;
    
    if (seg.lockedIn) {
      if (currentBlock) {
        // Continue block
        currentBlock.duration += duration;
        currentBlock.end = seg.end;
        // We could track domains in this block if we wanted
      } else {
        // Start new block
        currentBlock = {
          start: seg.start,
          end: seg.end,
          duration: duration,
          type: 'focus'
        };
      }
    } else {
      // Distraction/Idle
      if (currentBlock) {
        // End current block if it's long enough to count (e.g. > 1 min)
        if (currentBlock.duration > 60) {
          blocks.push(currentBlock);
        }
        currentBlock = null;
      }
    }
  }
  
  // Push last block
  if (currentBlock && currentBlock.duration > 60) {
    blocks.push(currentBlock);
  }

  // Filter for "Deep" blocks (> 15 mins)
  const deepBlocks = blocks.filter(b => b.duration >= 15 * 60);
  const shallowBlocks = blocks.filter(b => b.duration < 15 * 60);

  if (deepBlocks.length === 0 && shallowBlocks.length === 0) {
    return (
      <AnchorCard title="Focus Blocks">
        <div className="text-slate-500 text-sm py-4 text-center">
          No significant focus blocks recorded.
        </div>
      </AnchorCard>
    );
  }

  return (
    <AnchorCard title="Deep Work Blocks" subtitle={`${deepBlocks.length} deep dives (>15m)`}>
      <div className="space-y-4">
        {deepBlocks.map((block, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-900/70 border border-teal-500/40 shadow-sm shadow-teal-500/20"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-200 border border-teal-400/60 flex items-center justify-center text-sm font-bold">
                {i + 1}
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-50">Deep Dive</div>
                <div className="text-xs text-slate-400">
                  {new Date(block.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(block.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
            <div className="text-lg font-bold text-teal-300">
              {formatDuration(Math.floor(block.duration))}
            </div>
          </div>
        ))}
        
        {shallowBlocks.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700/70">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Shallow Blocks</h4>
            <div className="grid grid-cols-2 gap-2">
              {shallowBlocks.map((block, i) => (
                <div
                  key={i}
                  className="p-2 rounded-lg text-xs flex justify-between bg-slate-900/70 border border-slate-700 text-slate-200"
                >
                  <span>Flow {i + 1}</span>
                  <span className="font-medium text-teal-300">
                    {formatDuration(Math.floor(block.duration))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AnchorCard>
  );
}

