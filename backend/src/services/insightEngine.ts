import { prisma } from '../config/database.js';
import { generateInsightsFromClaude } from './claudeClient.js';
import { z } from 'zod';
import { InsightScope } from '@prisma/client';

// Schema for Claude's JSON response (Session)
const AiInsightSchema = z.object({
  session_summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  recommendations: z.array(z.string()),
  focus_archetype: z.string(),
  distraction_signature: z.string(),
  next_session_goal: z.string(),
  motivation_snippet: z.string(),
});

// Schema for Home/Weekly Analytics
const HomeAnalyticsSchema = z.object({
  overall_summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  recommendations: z.array(z.string()),
  study_archetype: z.string(),
  today_focus_tip: z.string(),
});

export type AiInsightDTO = z.infer<typeof AiInsightSchema> & {
  generated_at: Date;
};

export type HomeAnalyticsDTO = z.infer<typeof HomeAnalyticsSchema> & {
  generated_at: Date;
};

export class InsightEngine {
  
  static async generateSessionInsight(userId: string, sessionId: string): Promise<AiInsightDTO> {
    // 1. Fetch Data & Validate Ownership
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        activitySegments: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.userId !== userId) {
      throw new Error('Unauthorized access to session');
    }

    // Fetch recent sessions for context (last 5)
    const recentSessions = await prisma.session.findMany({
      where: {
        userId: userId,
        id: { not: sessionId },
        endedAt: { not: null }
      },
      orderBy: { startedAt: 'desc' },
      take: 5,
      select: {
        totalSessionSeconds: true,
        lockedInSeconds: true,
        lockBreakCount: true,
        tabSwitchCount: true,
        startedAt: true,
      }
    });

    // 2. Compute Metrics
    const totalMinutes = Math.round(session.totalSessionSeconds / 60);
    const focusMinutes = Math.round(session.lockedInSeconds / 60);
    const idleMinutes = Math.round(session.idleBeyond2minSeconds / 60);
    const focusRatio = session.totalSessionSeconds > 0 
      ? (session.lockedInSeconds / session.totalSessionSeconds).toFixed(2) 
      : "0.00";
    
    const hour = new Date(session.startedAt).getHours();
    let timeOfDay = 'night';
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 22) timeOfDay = 'evening';

    // Determine longest focus streak from segments
    let longestStreakSeconds = 0;
    let currentStreak = 0;
    
    // Simply using segment duration if it's locked in
    for (const seg of session.activitySegments) {
      if (seg.lockedIn) {
        const dur = (new Date(seg.end).getTime() - new Date(seg.start).getTime()) / 1000;
        currentStreak += dur;
      } else {
        if (currentStreak > longestStreakSeconds) longestStreakSeconds = currentStreak;
        currentStreak = 0;
      }
    }
    if (currentStreak > longestStreakSeconds) longestStreakSeconds = currentStreak;

    // 3. Build Payload for Claude
    const payload = {
      user_profile: {
        name: session.user.firstName || 'Student',
        recent_sessions_count: recentSessions.length,
      },
      current_session: {
        id: session.id,
        goal: session.goal || 'No specific goal',
        title: session.title,
        started_at: session.startedAt.toISOString(),
        duration_minutes: totalMinutes,
        focus_minutes: focusMinutes,
        idle_minutes: idleMinutes,
        focus_ratio: focusRatio,
        distraction_count: session.lockBreakCount,
        tab_switches: session.tabSwitchCount,
        longest_focus_streak_minutes: Math.round(longestStreakSeconds / 60),
        time_of_day: timeOfDay,
        segments_summary: session.activitySegments.slice(0, 30).map(s => ({
          domain: s.domain,
          productive: s.productive,
          duration_sec: Math.round((new Date(s.end).getTime() - new Date(s.start).getTime())/1000),
          locked_in: s.lockedIn,
          reason: s.reason
        }))
      },
      recent_history: recentSessions.map(s => ({
        date: s.startedAt.toISOString().split('T')[0],
        focus_minutes: Math.round(s.lockedInSeconds / 60),
        distractions: s.lockBreakCount
      }))
    };

    // 4. Prepare Prompts (REPLACED WITH WWW VERSION)
const systemPrompt = `
You are an AI analytics engine that summarizes study sessions in exactly three short sentences.
Your tone is analytical, neutral, and precise.

Your summary must follow this strict format:
1) A short sentence describing what went well (WWW).
2) A short sentence describing what went bad (WWB).
3) A short sentence describing how the user can improve (HYCI).

Rules:
- Each sentence must be under 20 words.
- Use real numbers from the data when possible (minutes, %, switches, streaks).
- Do NOT use emojis.
- Do NOT add headings, labels, bullet points, or extra commentary.
- Output must be exactly three sentences inside the "session_summary" field.
- All other fields in the JSON schema must still be filled normally.
`;

const userPrompt = `
Using the following session data, generate STRICTLY VALID JSON that matches the schema provided below.

Inside "session_summary":
- Write EXACTLY THREE SENTENCES.
- Sentence 1: what went well.
- Sentence 2: what went bad.
- Sentence 3: how the user can improve.

Keep the sentences concise, data-driven, and under 20 words each.

Here is the session data:
${JSON.stringify(payload, null, 2)}

Return ONLY a JSON object matching this schema:
{
  "session_summary": "string (exactly 3 sentences as described)",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "recommendations": ["string"],
  "focus_archetype": "string",
  "distraction_signature": "string",
  "next_session_goal": "string",
  "motivation_snippet": "string"
}
`;

    // 5. Call Claude
    let rawResponse: string;
    try {
      rawResponse = await generateInsightsFromClaude(systemPrompt, userPrompt);
    } catch (err) {
      console.error('Claude generation failed', err);
      throw new Error('Failed to generate insights from AI provider');
    }

    // 6. Parse & Validate
    let parsedData;
    try {
      parsedData = JSON.parse(rawResponse);
      parsedData = AiInsightSchema.parse(parsedData);
    } catch (err) {
      console.error('JSON parsing/validation failed', rawResponse, err);
      throw new Error('AI response was not in expected format');
    }

    // 7. Persist
    const savedInsight = await prisma.aiInsight.create({
      data: {
        userId,
        sessionId,
        scope: InsightScope.SESSION,
        rawInput: payload as any,
        rawOutput: parsedData as any,
        summary: parsedData.session_summary,
        strengths: parsedData.strengths,
        weaknesses: parsedData.weaknesses,
        recommendations: parsedData.recommendations,
        focusArchetype: parsedData.focus_archetype,
        distractionSignature: parsedData.distraction_signature,
        nextSessionGoal: parsedData.next_session_goal,
        motivationSnippet: parsedData.motivation_snippet,
      }
    });

    // 8. Return DTO
    return {
      ...parsedData,
      generated_at: savedInsight.createdAt
    };
  }

  static async getSessionInsight(userId: string, sessionId: string): Promise<AiInsightDTO | null> {
    const insight = await prisma.aiInsight.findFirst({
      where: {
        userId,
        sessionId,
        scope: InsightScope.SESSION
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!insight) return null;

    try {
      const validated = AiInsightSchema.parse({
        session_summary: insight.summary,
        strengths: insight.strengths,
        weaknesses: insight.weaknesses,
        recommendations: insight.recommendations,
        focus_archetype: insight.focusArchetype,
        distraction_signature: insight.distractionSignature,
        next_session_goal: insight.nextSessionGoal,
        motivation_snippet: insight.motivationSnippet
      });
      
      return {
        ...validated,
        generated_at: insight.createdAt
      };
    } catch (err) {
      console.error('Stored insight data invalid', err);
      return null;
    }
  }

  static async generateHomeAnalytics(userId: string): Promise<HomeAnalyticsDTO> {
    // 1. Fetch Recent Data (Last 10 sessions or 7 days)
    const recentSessions = await prisma.session.findMany({
      where: {
        userId: userId,
        endedAt: { not: null }
      },
      orderBy: { startedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        totalSessionSeconds: true,
        lockedInSeconds: true,
        focusRate: true,
        tabSwitchCount: true,
        lockBreakCount: true,
        startedAt: true,
        goal: true
      }
    });

    if (recentSessions.length === 0) {
      // Fallback if no sessions
       return {
         overall_summary: "No recent study activity found. Start your first session to get AI insights!",
         strengths: [],
         weaknesses: [],
         recommendations: ["Complete a session to unlock insights."],
         study_archetype: "Aspiring Anchor",
         today_focus_tip: "Start small with a 25-minute anchored session.",
         generated_at: new Date()
       };
    }

    // 2. Compute Aggregates
    const totalSessions = recentSessions.length;
    const avgFocusRate = recentSessions.reduce((acc, s) => acc + s.focusRate, 0) / totalSessions;
    const totalAnchoredMinutes = Math.round(recentSessions.reduce((acc, s) => acc + s.lockedInSeconds, 0) / 60);
    
    const payload = {
      period: "Last 10 Sessions",
      total_sessions: totalSessions,
      avg_focus_quality: (avgFocusRate * 100).toFixed(1) + "%",
      total_anchored_minutes: totalAnchoredMinutes,
      sessions: recentSessions.map(s => ({
        date: s.startedAt.toISOString().split('T')[0],
        duration_min: Math.round(s.totalSessionSeconds / 60),
        focus_quality: (s.focusRate * 100).toFixed(0) + "%",
        distractions: s.lockBreakCount,
        goal: s.goal
      }))
    };

    // 3. Prepare Prompt – Dashboard / Home AI Analytics
    const systemPrompt = `
You are an AI analytics engine for an ocean-themed study-focus app called Anchor.
You analyze multiple recent sessions and produce macro-level insights for the student's dashboard (NOT per-session recaps).

Your job:
- Summarize habits and trends over the last 10 sessions.
- Highlight behavioral strengths and weaknesses that show up repeatedly.
- Suggest 2–4 concrete, weekly-level recommendations to improve focus and consistency.
- Assign a short "study archetype" label (e.g. "Deep Diver 🌊", "Momentum Builder ⚡", "Fragmented Worker 🧩", "Evening Grinder 🌙", "Aspiring Anchor ⚓️").

Style guidelines:
- Speak directly to the student using second-person language ("you", "your") instead of "the user" or "they".
- Tone: concise, encouraging but realistic; never shaming or overly motivational.
- Focus on patterns over time (consistency, best times of day, recurring risk windows) rather than individual sessions.
- Use specific, data-grounded language when possible (days, times, percentages, minutes) instead of vague statements.
- You MAY use a few relevant emojis in the archetype and overall_summary to match the ocean/anchor theme (🌊 ⚓️ ⚡️), but not excessively.

Output requirements:
- Return ONLY a single JSON object that exactly matches the schema provided in the user message.
- Do NOT include any extra text, explanations, commentary, or markdown outside the JSON object.
- The analytics must feel clearly different from a single-session summary; they should describe the student's behavior across sessions.
`;

    const userPrompt = `
Analyze the following student's recent study history and generate high-level dashboard analytics.
These sessions represent their "Last 10 Sessions" and are already pre-aggregated for you.

Here is the structured data:
${JSON.stringify(payload, null, 2)}

Using ONLY this data, produce a JSON object matching this schema:

{
  "overall_summary": "string (2–3 sentences summarizing recent habits, patterns, and trends across the last 10 sessions)",
  "strengths": [
    "string (pattern-level strength, e.g. strong mornings, fast warm-up, improving deep blocks, etc.)",
    "string (another pattern-level strength; you may include a third if useful)"
  ],
  "weaknesses": [
    "string (pattern-level weakness, e.g. late-night drop-offs, mid-session collapse, high switching on certain days)",
    "string (another pattern-level weakness; you may include a third if useful)"
  ],
  "recommendations": [
    "string (concrete weekly-level improvement idea, e.g. 'Schedule hardest tasks before 12:00' or 'Cap night sessions at 45 minutes')",
    "string (another concrete weekly-level recommendation; you may include a third or fourth if useful)"
  ],
  "study_archetype": "string (short label capturing their current style, e.g. 'Deep Diver 🌊', 'Momentum Builder ⚡', 'Fragmented Worker 🧩', 'Evening Grinder 🌙')",
  "today_focus_tip": "string (one short, actionable tip they can apply in their very next session; keep it to one sentence)"
}

Important constraints:
- All fields must be present and non-empty.
- "overall_summary" must describe macro-level patterns (week/last 10 sessions), not a single-session recap.
- Strengths, weaknesses, and recommendations must clearly complement the raw metrics (consistency, focus quality, distractions, timing), not merely restate them.
- Each item in strengths/weaknesses/recommendations should be a single concise sentence (ideally under 20 words) and use "you" language.
- Avoid phrases like "this user" or "they" when talking about the student; speak to them as "you".
- Output ONLY the JSON object, with no extra commentary before or after.
`;

    // 4. Call Claude
    let rawResponse: string;
    try {
      rawResponse = await generateInsightsFromClaude(systemPrompt, userPrompt);
    } catch (err) {
      console.error('Claude generation failed for home analytics', err);
      throw new Error('Failed to generate home analytics');
    }

    // 5. Parse
    let parsedData;
    try {
      parsedData = JSON.parse(rawResponse);
      parsedData = HomeAnalyticsSchema.parse(parsedData);
    } catch (err) {
      console.error('JSON parsing failed for home analytics', rawResponse, err);
      throw new Error('AI response invalid');
    }

    // 6. Persist with scope WEEKLY (serving as "Home Analytics" cache)
    const savedInsight = await prisma.aiInsight.create({
      data: {
        userId,
        scope: InsightScope.WEEKLY,
        rawInput: payload as any,
        rawOutput: parsedData as any,
        summary: parsedData.overall_summary,
        strengths: parsedData.strengths,
        weaknesses: parsedData.weaknesses,
        recommendations: parsedData.recommendations,
        focusArchetype: parsedData.study_archetype,
        distractionSignature: null, // Not used for home
        nextSessionGoal: null,
        motivationSnippet: parsedData.today_focus_tip, // Reuse this field for the tip
      }
    });

    return {
      ...parsedData,
      generated_at: savedInsight.createdAt
    };
  }

  static async getHomeAnalytics(userId: string): Promise<HomeAnalyticsDTO | null> {
    // Look for the latest DAILY/WEEKLY-style insight
    const insight = await prisma.aiInsight.findFirst({
      where: {
        userId,
        scope: InsightScope.WEEKLY
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!insight) return null;

    // Only reuse if generated today (reset at local midnight)
    const now = new Date();
    const created = new Date(insight.createdAt);
    const isSameDay =
      now.getFullYear() === created.getFullYear() &&
      now.getMonth() === created.getMonth() &&
      now.getDate() === created.getDate();

    if (!isSameDay) {
      // Treat as stale so caller can regenerate a fresh daily insight
      return null;
    }

    try {
      const validated = HomeAnalyticsSchema.parse({
        overall_summary: insight.summary,
        strengths: insight.strengths,
        weaknesses: insight.weaknesses,
        recommendations: insight.recommendations,
        study_archetype: insight.focusArchetype,
        today_focus_tip: insight.motivationSnippet // We stored tip here
      });

      return {
        ...validated,
        generated_at: insight.createdAt
      };
    } catch (err) {
      return null;
    }
  }
}
