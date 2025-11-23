import { PrismaClient, NonLockReason } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo+uoft@example.com';
const DEMO_PASSWORD = 'AnchorDemo2025!';

// Second demo account: Mohamad Salman
const MOHAMAD_DEMO_EMAIL = 'demo+mohamadsalman@example.com';
const MOHAMAD_DEMO_PASSWORD = 'AnchorDemoMS2025!';

const PRODUCTIVE_DOMAINS = [
  'canvas.utoronto.ca',
  'docs.google.com',
  'piazza.com',
  'notion.so',
  'utoronto.ca/learn'
];

const DISTRACTION_DOMAINS = ['discord.com', 'youtube.com', 'reddit.com', 'instagram.com'];

function minutesToSeconds(minutes: number) {
  return Math.round(minutes * 60);
}

function randomChoice<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

async function main() {
  console.log('Seeding demo data...');
  await prisma.session.deleteMany({
    where: {
      user: {
        email: DEMO_EMAIL
      }
    }
  });

  await prisma.session.deleteMany({
    where: {
      user: {
        email: MOHAMAD_DEMO_EMAIL
      }
    }
  });

  await prisma.user.deleteMany({
    where: { email: DEMO_EMAIL }
  });

  await prisma.user.deleteMany({
    where: { email: MOHAMAD_DEMO_EMAIL }
  });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      passwordHash,
      firstName: 'Jordan',
      lastName: 'Chen',
      profilePictureUrl: 'https://images.unsplash.com/photo-1502767089025-6572583495b0?auto=format&fit=crop&w=200&q=80'
    }
  });

  const now = new Date();
  const startPoint = new Date(now);
  startPoint.setHours(18, 0, 0, 0);

  const SESSION_COUNT = 30;
  for (let i = 0; i < SESSION_COUNT; i++) {
    const sessionDate = new Date(startPoint);
    sessionDate.setDate(startPoint.getDate() - (SESSION_COUNT - 1 - i));
    sessionDate.setHours(18 + Math.floor(i / 8), 10 + (i % 3) * 5, 0, 0);

    const baseMinutes =
      120 +
      (i * 4) +
      (Math.random() < 0.3 ? -20 : 0) +
      (i % 6 === 0 ? 15 : -5);
    const skipDay = Math.random() < 0.1;
    if (skipDay) {
      // simulate a missed day by skipping session insertion
      continue;
    }
    const shortSession = Math.random() < 0.15;
    const totalMinutes = shortSession ? baseMinutes / 2 : baseMinutes;
    const lockedRatio =
      Math.min(
        Math.max(
          0.75 +
            (i / (SESSION_COUNT - 1)) * 0.12 +
            (Math.random() - 0.5) * 0.08 +
            (Math.sin(i / 3) * 0.025),
          0.68
        ),
        0.9
      );
    const totalSeconds = minutesToSeconds(totalMinutes);
    const lockedSeconds = Math.round(totalSeconds * lockedRatio);
    const nonLockSeconds = totalSeconds - lockedSeconds;
    const idleSeconds = Math.round(Math.min(nonLockSeconds * 0.5, 240));

    const segments: { start: Date; end: Date; domain?: string | null; productive: boolean; lockedIn: boolean; reason?: NonLockReason | null }[] = [];
    let cursor = new Date(sessionDate);

    const addSegment = (
      durationSeconds: number,
      lockedIn: boolean,
      productive: boolean,
      domain?: string | null,
      reason?: NonLockReason | null
    ) => {
      if (durationSeconds <= 0) {
        return;
      }
      const segmentStart = new Date(cursor);
      const segmentEnd = new Date(cursor.getTime() + durationSeconds * 1000);
      segments.push({
        start: segmentStart,
        end: segmentEnd,
        domain: domain ?? null,
        productive,
        lockedIn,
        reason: lockedIn ? null : reason ?? 'other'
      });
      cursor = segmentEnd;
    };

    const firstLocked = Math.round(lockedSeconds * 0.6) || 60;
    const secondLocked = Math.max(0, lockedSeconds - firstLocked - (Math.random() < 0.3 ? 60 : 0));
    const driftSeconds = Math.max(nonLockSeconds - idleSeconds, 0);

    addSegment(firstLocked, true, true, PRODUCTIVE_DOMAINS[i % PRODUCTIVE_DOMAINS.length]);
    if (driftSeconds > 0) {
      addSegment(driftSeconds, false, false, DISTRACTION_DOMAINS[i % DISTRACTION_DOMAINS.length], 'unproductive_domain');
    }
    if (idleSeconds > 0) {
      addSegment(idleSeconds, false, false, null, 'idle_beyond_2m');
    }
    if (secondLocked > 0) {
      addSegment(secondLocked, true, true, PRODUCTIVE_DOMAINS[(i + 1) % PRODUCTIVE_DOMAINS.length]);
    }

    const sessionEnd = new Date(sessionDate.getTime() + totalSeconds * 1000);
    await prisma.session.create({
      data: {
        userId: user.id,
        startedAt: sessionDate,
        endedAt: sessionEnd,
        totalSessionSeconds: totalSeconds,
        lockedInSeconds: lockedSeconds,
        nonLockSeconds,
        idleBeyond2minSeconds: idleSeconds,
        tabSwitchCount: Math.max(1, Math.floor(nonLockSeconds / 60)),
        lockBreakCount: Math.max(0, Math.floor(nonLockSeconds / 120)),
        focusRate: parseFloat((lockedSeconds / totalSeconds).toFixed(3)),
        title: `Study session ${SESSION_COUNT - i}`,
        description: i % 2 === 0 ? 'Working through MAT137 proofs and lecture notes.' : 'Reading ECE244 lab manuals and solving practice problems.',
        aiSummary: `Anchored for ${(lockedSeconds / 60).toFixed(1)} minutes with ${(driftSeconds / 60).toFixed(1)} minutes of drift.`,
        activitySegments: {
          create: segments.map((segment) => ({
            start: segment.start,
            end: segment.end,
            domain: segment.domain,
            productive: segment.productive,
            lockedIn: segment.lockedIn,
            reason: segment.lockedIn ? null : segment.reason
          }))
        }
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Second demo user: Mohamad Salman – mixed quality sessions
  // ---------------------------------------------------------------------------

  const mohamadPasswordHash = await bcrypt.hash(MOHAMAD_DEMO_PASSWORD, 10);
  const mohamad = await prisma.user.create({
    data: {
      email: MOHAMAD_DEMO_EMAIL,
      passwordHash: mohamadPasswordHash,
      firstName: 'Mohamad',
      lastName: 'Salman',
      profilePictureUrl: null
    }
  });

  // Generate approx. last 28 days with varying quality
  const DAYS = 28;
  const today = new Date();

  for (let d = 0; d < DAYS; d++) {
    const day = new Date(today);
    day.setDate(today.getDate() - (DAYS - 1 - d));

    // 25% chance to skip (no session that day)
    if (Math.random() < 0.25) {
      continue;
    }

    // Start time between 9:00 and 20:00
    const startHour = 9 + Math.floor(Math.random() * 11);
    const startMinute = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
    day.setHours(startHour, startMinute, 0, 0);

    // Random quality bucket: good / okay / rough
    const roll = Math.random();
    let quality: 'good' | 'okay' | 'rough';
    if (roll < 0.45) quality = 'good';
    else if (roll < 0.8) quality = 'okay';
    else quality = 'rough';

    // Duration between 1.5h and 4.5h
    const totalMinutes = 90 + Math.random() * 180;

    let lockedRatio: number;
    if (quality === 'good') {
      lockedRatio = 0.78 + Math.random() * 0.12; // 0.78–0.90
    } else if (quality === 'okay') {
      lockedRatio = 0.6 + Math.random() * 0.15; // 0.60–0.75
    } else {
      lockedRatio = 0.45 + Math.random() * 0.15; // 0.45–0.60
    }

    const totalSeconds = minutesToSeconds(totalMinutes);
    const lockedSeconds = Math.round(totalSeconds * lockedRatio);
    const nonLockSeconds = Math.max(totalSeconds - lockedSeconds, 0);
    const idleSeconds = Math.round(Math.min(nonLockSeconds * (quality === 'good' ? 0.25 : quality === 'okay' ? 0.4 : 0.6), 300));
    const driftSeconds = Math.max(nonLockSeconds - idleSeconds, 0);

    const segments: { start: Date; end: Date; domain?: string | null; productive: boolean; lockedIn: boolean; reason?: NonLockReason | null }[] = [];
    let cursor = new Date(day);

    const addSegment = (
      durationSeconds: number,
      lockedIn: boolean,
      productive: boolean,
      domain?: string | null,
      reason?: NonLockReason | null
    ) => {
      if (durationSeconds <= 0) return;
      const segmentStart = new Date(cursor);
      const segmentEnd = new Date(cursor.getTime() + durationSeconds * 1000);
      segments.push({
        start: segmentStart,
        end: segmentEnd,
        domain: domain ?? null,
        productive,
        lockedIn,
        reason: lockedIn ? null : reason ?? 'other'
      });
      cursor = segmentEnd;
    };

    // Split focus into 1–3 blocks
    const blocks = 1 + Math.floor(Math.random() * 3);
    let remainingLocked = lockedSeconds;

    for (let b = 0; b < blocks; b++) {
      const share = b === blocks - 1 ? remainingLocked : Math.round(remainingLocked * (0.4 + Math.random() * 0.3));
      const domain = PRODUCTIVE_DOMAINS[(d + b) % PRODUCTIVE_DOMAINS.length];
      addSegment(share, true, true, domain);
      remainingLocked -= share;

      // Between focus blocks, occasionally drift or idle
      if (b !== blocks - 1) {
        const driftChunk = Math.round(driftSeconds / blocks * (0.6 + Math.random() * 0.8));
        if (driftChunk > 0) {
          const distractionDomain = randomChoice(DISTRACTION_DOMAINS);
          addSegment(driftChunk, false, false, distractionDomain, 'unproductive_domain');
        }
        const idleChunk = Math.round(idleSeconds / blocks * (0.6 + Math.random() * 0.8));
        if (idleChunk > 0) {
          addSegment(idleChunk, false, false, null, 'idle_beyond_2m');
        }
      }
    }

    const sessionEnd = new Date(day.getTime() + totalSeconds * 1000);
    await prisma.session.create({
      data: {
        userId: mohamad.id,
        startedAt: day,
        endedAt: sessionEnd,
        totalSessionSeconds: totalSeconds,
        lockedInSeconds: lockedSeconds,
        nonLockSeconds,
        idleBeyond2minSeconds: idleSeconds,
        tabSwitchCount: Math.max(1, Math.floor(nonLockSeconds / 90) + (quality === 'rough' ? 2 : 0)),
        lockBreakCount: Math.max(0, Math.floor(nonLockSeconds / 180)),
        focusRate: parseFloat((lockedSeconds / totalSeconds).toFixed(3)),
        title: `Anchor session ${DAYS - d}`,
        description:
          quality === 'good'
            ? 'Solid deep work on ECE / MAT problems with few distractions.'
            : quality === 'okay'
            ? 'Decent focus with a couple of context switches and short breaks.'
            : 'Choppy focus with more drifting and idle time than usual.',
        aiSummary: `You stayed anchored for ${(lockedSeconds / 60).toFixed(1)} minutes with ${(driftSeconds / 60).toFixed(
          1
        )} minutes of drift.`,
        activitySegments: {
          create: segments.map((segment) => ({
            start: segment.start,
            end: segment.end,
            domain: segment.domain,
            productive: segment.productive,
            lockedIn: segment.lockedIn,
            reason: segment.lockedIn ? null : segment.reason
          }))
        }
      }
    });
  }

  console.log('Seed complete. Demo account credentials:');
  console.log(`Jordan demo — Email: ${DEMO_EMAIL} | Password: ${DEMO_PASSWORD}`);
  console.log(`Mohamad demo — Email: ${MOHAMAD_DEMO_EMAIL} | Password: ${MOHAMAD_DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

