import { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { createResponse } from '../utils/api-response.js';

// Save/bookmark a destination for the logged-in user
export const saveDestination = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const cityId = req.params.cityId as string;

    if (!userId) {
      res.status(401).json(createResponse(false, 'Unauthorized access', null));
      return;
    }

    if (!cityId) {
      res.status(400).json(createResponse(false, 'City ID is required', null));
      return;
    }

    const city = await prisma.city.findUnique({ where: { id: cityId } });
    if (!city) {
      res.status(404).json(createResponse(false, 'City not found', null));
      return;
    }

    // Upsert to ensure idempotency
    const saved = await prisma.savedDestination.upsert({
      where: {
        userId_cityId: {
          userId,
          cityId,
        },
      },
      update: {},
      create: {
        userId,
        cityId,
      },
      include: {
        city: true,
      },
    });

    res.status(200).json(createResponse(true, 'Destination saved successfully', saved));
  } catch (error: any) {
    console.error('Error saving destination:', error);
    res.status(500).json(createResponse(false, 'Failed to save destination. ' + (error.message || ''), null));
  }
};

// Remove a saved destination
export const unsaveDestination = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const cityId = req.params.cityId as string;

    if (!userId) {
      res.status(401).json(createResponse(false, 'Unauthorized access', null));
      return;
    }

    const existing = await prisma.savedDestination.findUnique({
      where: {
        userId_cityId: {
          userId,
          cityId,
        },
      },
    });

    if (!existing) {
      res.status(404).json(createResponse(false, 'Saved destination not found', null));
      return;
    }

    await prisma.savedDestination.delete({
      where: {
        userId_cityId: {
          userId,
          cityId,
        },
      },
    });

    res.status(200).json(createResponse(true, 'Destination removed from saved list', null));
  } catch (error: any) {
    console.error('Error removing saved destination:', error);
    res.status(500).json(createResponse(false, 'Failed to remove destination. ' + (error.message || ''), null));
  }
};

// Get all saved destinations for the logged-in user
export const getSavedDestinations = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json(createResponse(false, 'Unauthorized access', null));
      return;
    }

    const savedDestinations = await prisma.savedDestination.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        city: {
          include: {
            activities: {
              take: 3,
            },
            _count: {
              select: { activities: true },
            },
          },
        },
      },
    });

    res.status(200).json(
      createResponse(true, 'Saved destinations retrieved successfully', savedDestinations)
    );
  } catch (error: any) {
    console.error('Error fetching saved destinations:', error);
    res.status(500).json(createResponse(false, 'Failed to fetch saved destinations', null));
  }
};
