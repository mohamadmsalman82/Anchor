import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { DomainType } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';
import { classifyDomain, PRODUCTIVE_DOMAINS, UNPRODUCTIVE_DOMAINS } from '../config/domainClassification.js';

const createDomainOverrideSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
  classification: z.enum(['productive', 'unproductive']),
});

/**
 * GET /users/me/domain-overrides
 * Get all domain overrides for the current user
 */
export async function getUserDomainOverrides(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const userId = req.user.id;
    const overrides = await prisma.userDomainOverride.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      overrides: overrides.map(o => ({
        id: o.id,
        domain: o.domain,
        classification: o.type === 'PRODUCTIVE' ? 'productive' : 'unproductive',
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      })),
    });
  } catch (error) {
    throw error;
  }
}

/**
 * POST /users/me/domain-overrides
 * Create or update a domain override for the current user
 */
export async function createOrUpdateDomainOverride(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { domain, classification } = createDomainOverrideSchema.parse(req.body);
    const userId = req.user.id;
    const domainLower = domain.toLowerCase().trim();

    // Convert classification to DomainType
    const domainType: DomainType = classification === 'productive' ? 'PRODUCTIVE' : 'UNPRODUCTIVE';

    const override = await prisma.userDomainOverride.upsert({
      where: {
        userId_domain: {
          userId,
          domain: domainLower,
        },
      },
      update: {
        type: domainType,
        updatedAt: new Date(),
      },
      create: {
        userId,
        domain: domainLower,
        type: domainType,
      },
    });

    res.json({
      override: {
        id: override.id,
        domain: override.domain,
        classification: override.type === 'PRODUCTIVE' ? 'productive' : 'unproductive',
        createdAt: override.createdAt,
        updatedAt: override.updatedAt,
      },
    });
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
 * DELETE /users/me/domain-overrides/:domain
 * Delete a domain override for the current user
 */
export async function deleteDomainOverride(req: AuthRequest, res: Response): Promise<void> {
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
    // If override doesn't exist, that's fine - it's already deleted
    if ((error as any).code === 'P2025') {
      res.json({ message: 'Override not found' });
      return;
    }
    throw error;
  }
}

/**
 * GET /domains/classification
 * Get classification for a specific domain (for extension use)
 * 
 * Classification priority:
 * 1. User override (if exists)
 * 2. Master list classification
 * 3. Default to unproductive
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

    // Step 1: Check user override first
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
        const classification = override.type === 'PRODUCTIVE' ? 'productive' : 'unproductive';
        res.json({
          domain: domainLower,
          classification,
          source: 'user_override',
        });
        return;
      }
    }

    // Step 2: Check master list (defaults to unproductive if not explicitly productive)
    const masterClassification = classifyDomain(domainLower);
    res.json({
      domain: domainLower,
      classification: masterClassification,
      source: 'master_list',
    });
  } catch (error) {
    throw error;
  }
}

/**
 * GET /domains
 * Get master domain lists and user overrides (for frontend settings page)
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

    // Build response with master lists and overrides
    const productiveDomains = Array.from(PRODUCTIVE_DOMAINS).map(domain => ({
      domain,
      classification: 'productive' as const,
      isOverride: overrideMap.has(domain.toLowerCase()),
      overrideClassification: overrideMap.get(domain.toLowerCase()) === 'PRODUCTIVE' ? 'productive' :
                              overrideMap.get(domain.toLowerCase()) === 'UNPRODUCTIVE' ? 'unproductive' : null,
    }));

    const unproductiveDomains = Array.from(UNPRODUCTIVE_DOMAINS).map(domain => ({
      domain,
      classification: 'unproductive' as const,
      isOverride: overrideMap.has(domain.toLowerCase()),
      overrideClassification: overrideMap.get(domain.toLowerCase()) === 'PRODUCTIVE' ? 'productive' :
                              overrideMap.get(domain.toLowerCase()) === 'UNPRODUCTIVE' ? 'unproductive' : null,
    }));

    // Add custom overrides that aren't in master lists
    const customOverrides = userOverrides
      .filter(override => {
        const domainLower = override.domain.toLowerCase();
        return !PRODUCTIVE_DOMAINS.includes(domainLower as any) &&
               !UNPRODUCTIVE_DOMAINS.includes(domainLower as any);
      })
      .map(override => ({
        domain: override.domain,
        classification: override.type === 'PRODUCTIVE' ? 'productive' : 'unproductive',
        isOverride: true,
        overrideClassification: override.type === 'PRODUCTIVE' ? 'productive' : 'unproductive',
      }));

    res.json({
      masterLists: {
        productive: Array.from(PRODUCTIVE_DOMAINS),
        unproductive: Array.from(UNPRODUCTIVE_DOMAINS),
      },
      overrides: userOverrides.map(o => ({
        domain: o.domain,
        classification: o.type === 'PRODUCTIVE' ? 'productive' : 'unproductive',
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
