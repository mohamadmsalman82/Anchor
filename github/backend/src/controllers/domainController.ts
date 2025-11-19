import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { DomainType } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';
import { PRESET_PRODUCTIVE_DOMAINS, PRESET_UNPRODUCTIVE_DOMAINS } from '../config/presetDomains.js';

const createDomainSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
  type: z.enum(['PRODUCTIVE', 'UNPRODUCTIVE', 'NEUTRAL']),
});

/**
 * GET /domains
 * Return preset domains and user-specific overrides
 */
export async function getDomains(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;

    // Get user's domain overrides
    const userOverrides = userId
      ? await prisma.userDomainOverride.findMany({
          where: { userId },
        })
      : [];

    // Create a map of user overrides for quick lookup
    const overrideMap = new Map<string, DomainType>();
    userOverrides.forEach(override => {
      overrideMap.set(override.domain.toLowerCase(), override.type);
    });

    // Build response with presets and overrides
    const productiveDomains = PRESET_PRODUCTIVE_DOMAINS.map(domain => ({
      domain,
      type: 'PRODUCTIVE' as DomainType,
      isOverride: overrideMap.has(domain.toLowerCase()),
      overrideType: overrideMap.get(domain.toLowerCase()),
    }));

    const unproductiveDomains = PRESET_UNPRODUCTIVE_DOMAINS.map(domain => ({
      domain,
      type: 'UNPRODUCTIVE' as DomainType,
      isOverride: overrideMap.has(domain.toLowerCase()),
      overrideType: overrideMap.get(domain.toLowerCase()),
    }));

    // Add custom overrides that aren't in presets
    const customOverrides = userOverrides
      .filter(override => {
        const domainLower = override.domain.toLowerCase();
        return !PRESET_PRODUCTIVE_DOMAINS.includes(domainLower) &&
               !PRESET_UNPRODUCTIVE_DOMAINS.includes(domainLower);
      })
      .map(override => ({
        domain: override.domain,
        type: override.type,
        isOverride: true,
        overrideType: override.type,
      }));

    res.json({
      presets: {
        productive: PRESET_PRODUCTIVE_DOMAINS,
        unproductive: PRESET_UNPRODUCTIVE_DOMAINS,
      },
      overrides: userOverrides.map(o => ({
        domain: o.domain,
        type: o.type,
      })),
      domains: {
        productive: productiveDomains,
        unproductive: unproductiveDomains,
        custom: customOverrides,
      },
    });
  } catch (error) {
    throw error;
  }
}

/**
 * GET /domains/classification
 * Get classification for a specific domain (for extension use)
 */
export async function getDomainClassification(req: AuthRequest, res: Response): Promise<void> {
  try {
    const domain = req.query.domain as string;
    if (!domain) {
      res.status(400).json({ error: 'Domain parameter is required' });
      return;
    }

    const userId = req.user?.id;
    const domainLower = domain.toLowerCase().trim();

    // Hardcoded: q.utoronto.ca is always productive (cannot be overridden)
    if (domainLower === 'q.utoronto.ca' || domainLower.endsWith('.q.utoronto.ca')) {
      res.json({
        domain: domainLower,
        type: 'PRODUCTIVE',
        source: 'hardcoded',
      });
      return;
    }

    // Check user override first
    if (userId) {
      const override = await prisma.userDomainOverride.findUnique({
        where: {
          userId_domain: {
            userId,
            domain: domainLower,
          },
        },
      });

      if (override) {
        res.json({
          domain: domainLower,
          type: override.type,
          source: 'user_override',
        });
        return;
      }
    }

    // Check presets
    if (PRESET_PRODUCTIVE_DOMAINS.includes(domainLower)) {
      res.json({
        domain: domainLower,
        type: 'PRODUCTIVE',
        source: 'preset',
      });
      return;
    }

    if (PRESET_UNPRODUCTIVE_DOMAINS.includes(domainLower)) {
      res.json({
        domain: domainLower,
        type: 'UNPRODUCTIVE',
        source: 'preset',
      });
      return;
    }

    // Default to neutral
    res.json({
      domain: domainLower,
      type: 'NEUTRAL',
      source: 'default',
    });
  } catch (error) {
    throw error;
  }
}

/**
 * POST /domains/override
 * Create or update a user's domain override
 */
export async function createOrUpdateOverride(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { domain, type } = createDomainSchema.parse(req.body);
    const userId = req.user.id;
    const domainLower = domain.toLowerCase().trim();

    // Hardcoded: q.utoronto.ca cannot be overridden (always productive)
    if (domainLower === 'q.utoronto.ca' || domainLower.endsWith('.q.utoronto.ca')) {
      res.status(400).json({ error: 'q.utoronto.ca is always productive and cannot be overridden' });
      return;
    }

    const override = await prisma.userDomainOverride.upsert({
      where: {
        userId_domain: {
          userId,
          domain: domainLower,
        },
      },
      update: {
        type: type as DomainType,
        updatedAt: new Date(),
      },
      create: {
        userId,
        domain: domainLower,
        type: type as DomainType,
      },
    });

    res.json({ override });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    throw error;
  }
}

/**
 * DELETE /domains/override/:domain
 * Delete a user's domain override (revert to preset)
 */
export async function deleteOverride(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const domain = req.params.domain?.toLowerCase().trim();
    if (!domain) {
      res.status(400).json({ error: 'Domain parameter is required' });
      return;
    }

    const userId = req.user.id;

    await prisma.userDomainOverride.delete({
      where: {
        userId_domain: {
          userId,
          domain,
        },
      },
    });

    res.json({ message: 'Override deleted' });
  } catch (error) {
    // If override doesn't exist, that's fine - it's already reverted
    if ((error as any).code === 'P2025') {
      res.json({ message: 'Override not found (already reverted)' });
      return;
    }
    throw error;
  }
}

/**
 * POST /domains
 * Create or update a domain config (legacy - kept for backward compatibility)
 */
export async function createOrUpdateDomain(req: Request, res: Response): Promise<void> {
  try {
    const { domain, type } = createDomainSchema.parse(req.body);

    const domainConfig = await prisma.domainConfig.upsert({
      where: { domain },
      update: {
        type: type as DomainType,
        updatedAt: new Date(),
      },
      create: {
        domain,
        type: type as DomainType,
      },
    });

    res.json({ domain: domainConfig });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    throw error;
  }
}

