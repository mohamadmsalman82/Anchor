import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InsightEngine } from '../insightEngine.js';
import { generateInsightsFromClaude } from '../claudeClient.js';
import { prisma } from '../../config/database.js';

// Mock dependencies
vi.mock('../../config/database.js', () => ({
  prisma: {
    session: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    aiInsight: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('../claudeClient.js', () => ({
  generateInsightsFromClaude: vi.fn(),
}));

describe('InsightEngine', () => {
  const mockUserId = 'user-123';
  const mockSessionId = 'session-123';
  
  const mockSession = {
    id: mockSessionId,
    userId: mockUserId,
    startedAt: new Date('2023-01-01T10:00:00Z'),
    endedAt: new Date('2023-01-01T11:00:00Z'),
    totalSessionSeconds: 3600,
    lockedInSeconds: 3000,
    idleBeyond2minSeconds: 300,
    lockBreakCount: 2,
    tabSwitchCount: 5,
    title: 'Study Session',
    goal: 'Finish Math',
    activitySegments: [
      {
        start: new Date('2023-01-01T10:00:00Z'),
        end: new Date('2023-01-01T10:30:00Z'),
        lockedIn: true,
        productive: true,
        domain: 'math.com'
      }
    ],
    user: {
      firstName: 'John',
      lastName: 'Doe'
    }
  };

  const mockClaudeResponse = JSON.stringify({
    session_summary: "Good session.",
    strengths: ["Focus"],
    weaknesses: ["Distraction"],
    recommendations: ["Keep going"],
    focus_archetype: "Deep Diver",
    distraction_signature: "None",
    next_session_goal: "More math",
    motivation_snippet: "You can do it"
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate and persist session insight', async () => {
    // Setup mocks
    (prisma.session.findUnique as any).mockResolvedValue(mockSession);
    (prisma.session.findMany as any).mockResolvedValue([]);
    (generateInsightsFromClaude as any).mockResolvedValue(mockClaudeResponse);
    (prisma.aiInsight.create as any).mockResolvedValue({ 
      createdAt: new Date(), 
      ...JSON.parse(mockClaudeResponse) 
    });

    const result = await InsightEngine.generateSessionInsight(mockUserId, mockSessionId);

    expect(prisma.session.findUnique).toHaveBeenCalledWith({
      where: { id: mockSessionId },
      include: expect.any(Object)
    });

    expect(generateInsightsFromClaude).toHaveBeenCalled();
    expect(prisma.aiInsight.create).toHaveBeenCalled();
    expect(result.session_summary).toBe("Good session.");
  });

  it('should throw if session not found', async () => {
    (prisma.session.findUnique as any).mockResolvedValue(null);
    await expect(InsightEngine.generateSessionInsight(mockUserId, mockSessionId))
      .rejects.toThrow('Session not found');
  });
});

