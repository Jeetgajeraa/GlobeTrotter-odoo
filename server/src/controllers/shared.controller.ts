import { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { createResponse } from '../utils/api-response.js';
import { getTripStatus } from './trip.controller.js';

/**
 * Explore public trips feed (for Inspiration / Community discovery)
 */
export const getPublicTripsFeed = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, country, page = '1', limit = '12', sortBy = 'createdAt' } = req.query;

    const pageNumber = Math.max(1, parseInt(String(page)) || 1);
    const take = Math.min(50, Math.max(1, parseInt(String(limit)) || 12));
    const skip = (pageNumber - 1) * take;

    const where: any = { isPublic: true };

    if (search) {
      const searchStr = String(search).trim();
      where.OR = [
        { name: { contains: searchStr, mode: 'insensitive' } },
        { description: { contains: searchStr, mode: 'insensitive' } },
        { stops: { some: { city: { name: { contains: searchStr, mode: 'insensitive' } } } } },
      ];
    }

    if (country) {
      where.stops = {
        some: {
          city: {
            country: { equals: String(country).trim(), mode: 'insensitive' },
          },
        },
      };
    }

    const validSortFields = ['createdAt', 'startDate', 'name'];
    const sortField = validSortFields.includes(String(sortBy)) ? String(sortBy) : 'createdAt';

    const [total, trips] = await Promise.all([
      prisma.trip.count({ where }),
      prisma.trip.findMany({
        where,
        orderBy: { [sortField]: 'desc' },
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
            },
          },
          stops: {
            orderBy: { order: 'asc' },
            include: {
              city: {
                select: { id: true, name: true, country: true, imageUrl: true },
              },
              _count: { select: { stopActivities: true } },
            },
          },
          expenses: {
            select: { amount: true },
          },
          _count: {
            select: { stops: true, communityPosts: true },
          },
        },
      }),
    ]);

    const formattedTrips = trips.map((trip) => {
      const totalExpense = trip.expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const status = getTripStatus(trip.startDate, trip.endDate);
      const { expenses: _, ...tripData } = trip;

      return {
        ...tripData,
        status,
        totalExpense,
      };
    });

    res.status(200).json(
      createResponse(true, 'Public itineraries retrieved successfully', {
        trips: formattedTrips,
        pagination: {
          total,
          page: pageNumber,
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      })
    );
  } catch (error: any) {
    console.error('Error fetching public trips:', error);
    res.status(500).json(createResponse(false, 'Failed to fetch public trips', null));
  }
};

/**
 * Get Public Itinerary by Share Slug (Screen 11 & Screen 9)
 * Read-only, no authentication required
 */
export const getPublicTripBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const shareSlug = req.params.shareSlug as string;

    const trip = await prisma.trip.findFirst({
      where: {
        shareSlug,
        isPublic: true,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
            city: true,
            country: true,
          },
        },
        stops: {
          orderBy: { order: 'asc' },
          include: {
            city: true,
            stopActivities: {
              orderBy: [{ scheduledDate: 'asc' }, { order: 'asc' }],
              include: {
                activity: true,
              },
            },
          },
        },
        expenses: {
          orderBy: { date: 'asc' },
          select: {
            id: true,
            category: true,
            amount: true,
            date: true,
            description: true,
            stopId: true,
          },
        },
      },
    });

    if (!trip) {
      res.status(404).json(createResponse(false, 'Public itinerary not found or has been made private', null));
      return;
    }

    // Calculate duration & estimated activity budget
    const startTime = new Date(trip.startDate).getTime();
    const endTime = new Date(trip.endDate).getTime();
    const durationDays = Math.max(1, Math.round((endTime - startTime) / (1000 * 60 * 60 * 24)) + 1);

    const totalEstimatedActivitiesCost = trip.stops.reduce((sum, stop) => {
      return (
        sum +
        stop.stopActivities.reduce((saSum, sa) => {
          return saSum + (sa.costOverride !== null ? sa.costOverride : sa.activity.cost);
        }, 0)
      );
    }, 0);

    const totalLoggedExpenses = trip.expenses.reduce((sum, exp) => sum + exp.amount, 0);

    res.status(200).json(
      createResponse(true, 'Public itinerary retrieved successfully', {
        ...trip,
        durationDays,
        totalEstimatedActivitiesCost: Math.round(totalEstimatedActivitiesCost * 100) / 100,
        totalLoggedExpenses: Math.round(totalLoggedExpenses * 100) / 100,
      })
    );
  } catch (error: any) {
    console.error('Error fetching public itinerary by slug:', error);
    res.status(500).json(createResponse(false, 'Failed to fetch public itinerary', null));
  }
};

/**
 * Copy / Fork a Public Trip into the authenticated user's account (Screen 11 "Copy Trip")
 * Automatically shifts all stop dates and activity dates relative to newStartDate
 */
export const copyPublicTrip = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const shareSlug = req.params.shareSlug as string;
    const { newStartDate, customTripName } = req.body;

    if (!userId) {
      res.status(401).json(createResponse(false, 'Please sign in to copy this itinerary', null));
      return;
    }

    // 1. Fetch source public trip with all stops and activities
    const sourceTrip = await prisma.trip.findFirst({
      where: {
        shareSlug,
        isPublic: true,
      },
      include: {
        stops: {
          orderBy: { order: 'asc' },
          include: {
            stopActivities: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!sourceTrip) {
      res.status(404).json(createResponse(false, 'Source public itinerary not found or is private', null));
      return;
    }

    // 2. Calculate date shift offset in milliseconds
    const originalStart = new Date(sourceTrip.startDate);
    const originalEnd = new Date(sourceTrip.endDate);
    const tripDurationMs = originalEnd.getTime() - originalStart.getTime();

    let targetStart = originalStart;
    if (newStartDate) {
      const parsedNewStart = new Date(newStartDate);
      if (!isNaN(parsedNewStart.getTime())) {
        targetStart = parsedNewStart;
      }
    }

    const timeShiftMs = targetStart.getTime() - originalStart.getTime();
    const targetEnd = new Date(targetStart.getTime() + tripDurationMs);

    // 3. Create cloned Trip with stops and activities inside a transaction
    const clonedTrip = await prisma.$transaction(async (tx) => {
      const newTrip = await tx.trip.create({
        data: {
          userId,
          name: customTripName ? String(customTripName).trim() : `${sourceTrip.name} (Copy)`,
          description: sourceTrip.description,
          coverPhoto: sourceTrip.coverPhoto,
          startDate: targetStart,
          endDate: targetEnd,
          isPublic: false,
          shareSlug: null,
        },
      });

      for (const stop of sourceTrip.stops) {
        const stopStartShifted = new Date(new Date(stop.startDate).getTime() + timeShiftMs);
        const stopEndShifted = new Date(new Date(stop.endDate).getTime() + timeShiftMs);

        const newStop = await tx.stop.create({
          data: {
            tripId: newTrip.id,
            cityId: stop.cityId,
            startDate: stopStartShifted,
            endDate: stopEndShifted,
            order: stop.order,
          },
        });

        for (const sa of stop.stopActivities) {
          const actDateShifted = new Date(new Date(sa.scheduledDate).getTime() + timeShiftMs);

          await tx.stopActivity.create({
            data: {
              stopId: newStop.id,
              activityId: sa.activityId,
              scheduledDate: actDateShifted,
              startTime: sa.startTime,
              order: sa.order,
              costOverride: sa.costOverride,
            },
          });
        }
      }

      return tx.trip.findUnique({
        where: { id: newTrip.id },
        include: {
          stops: {
            orderBy: { order: 'asc' },
            include: {
              city: true,
              stopActivities: {
                include: { activity: true },
              },
            },
          },
        },
      });
    });

    res.status(201).json(
      createResponse(true, 'Itinerary successfully copied to your trips!', clonedTrip)
    );
  } catch (error: any) {
    console.error('Error copying public trip:', error);
    res.status(500).json(createResponse(false, 'Failed to copy trip. ' + (error.message || ''), null));
  }
};
