import { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { createResponse } from '../utils/api-response.js';

// Helper to generate a clean shareable slug
const generateSlug = (name: string): string => {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 40);
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${base || 'trip'}-${randomSuffix}`;
};

// Helper to determine trip status
export const getTripStatus = (startDate: Date, endDate: Date): 'ongoing' | 'upcoming' | 'completed' => {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Normalize to compare dates
  if (now > end) {
    return 'completed';
  } else if (now < start) {
    return 'upcoming';
  } else {
    return 'ongoing';
  }
};

/**
 * Create a new trip
 * Supports optional coverPhoto upload via Cloudinary
 */
export const createTrip = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json(createResponse(false, 'Unauthorized access', null));
      return;
    }

    const { name, description, startDate, endDate, isPublic, coverPhoto } = req.body;

    if (!name || !startDate || !endDate) {
      res.status(400).json(createResponse(false, 'Trip name, start date, and end date are required', null));
      return;
    }

    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
      res.status(400).json(createResponse(false, 'Invalid start date or end date format', null));
      return;
    }

    if (parsedStartDate > parsedEndDate) {
      res.status(400).json(createResponse(false, 'Start date cannot be after end date', null));
      return;
    }

    // ── One-trip-at-a-time rule ──────────────────────────────────────
    // A user cannot create a new trip while they have an ongoing trip.
    // They must wait for the current trip to end (endDate < now).
    const now = new Date();
    const ongoingTrip = await prisma.trip.findFirst({
      where: {
        userId,
        startDate: { lte: now },
        endDate:   { gte: now },
      },
      select: { id: true, name: true, endDate: true },
    });

    if (ongoingTrip) {
      const endStr = ongoingTrip.endDate.toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
      res.status(409).json(
        createResponse(
          false,
          `You already have an ongoing trip "${ongoingTrip.name}" (ends ${endStr}). Please complete it before creating a new trip.`,
          { ongoingTripId: ongoingTrip.id, ongoingTripName: ongoingTrip.name }
        )
      );
      return;
    }

    // Cover photo from Cloudinary upload or optional URL string
    let finalCoverPhoto: string | null = null;
    if (req.file && (req.file as any).path) {
      finalCoverPhoto = (req.file as any).path;
    } else if (coverPhoto) {
      finalCoverPhoto = String(coverPhoto).trim();
    }

    const tripIsPublic = isPublic === true || isPublic === 'true';
    const shareSlug = tripIsPublic ? generateSlug(String(name).trim()) : null;

    const trip = await prisma.trip.create({
      data: {
        userId,
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        coverPhoto: finalCoverPhoto,
        isPublic: tripIsPublic,
        shareSlug,
      },
      include: {
        _count: {
          select: { stops: true, expenses: true },
        },
      },
    });

    const status = getTripStatus(trip.startDate, trip.endDate);

    res.status(201).json(
      createResponse(true, 'Trip created successfully', {
        ...trip,
        status,
      })
    );
  } catch (error: any) {
    console.error('Error creating trip:', error);
    res.status(500).json(createResponse(false, 'Failed to create trip. ' + (error.message || ''), null));
  }
};

/**
 * Get all trips of the logged-in user
 * Supports searching, filtering by status (ongoing, upcoming, completed), sorting, and grouping
 */
export const getUserTrips = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json(createResponse(false, 'Unauthorized access', null));
      return;
    }

    const {
      status, // 'ongoing' | 'upcoming' | 'completed' | 'all'
      search,
      sortBy = 'startDate',
      sortOrder = 'asc',
      groupByStatus = 'false',
    } = req.query;

    const now = new Date();
    const where: any = { userId };

    if (search) {
      const searchStr = String(search).trim();
      where.OR = [
        { name: { contains: searchStr, mode: 'insensitive' } },
        { description: { contains: searchStr, mode: 'insensitive' } },
      ];
    }

    // Filter by status if specified
    if (status === 'ongoing') {
      where.startDate = { lte: now };
      where.endDate = { gte: now };
    } else if (status === 'upcoming') {
      where.startDate = { gt: now };
    } else if (status === 'completed') {
      where.endDate = { lt: now };
    }

    const validSortFields = ['startDate', 'endDate', 'name', 'createdAt'];
    const sortField = validSortFields.includes(String(sortBy)) ? String(sortBy) : 'startDate';
    const orderDirection = String(sortOrder).toLowerCase() === 'desc' ? 'desc' : 'asc';

    const trips = await prisma.trip.findMany({
      where,
      orderBy: { [sortField]: orderDirection },
      include: {
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
          select: { amount: true, category: true },
        },
        _count: {
          select: { stops: true, expenses: true, communityPosts: true },
        },
      },
    });

    // Augment with calculated trip status and total expenses
    const formattedTrips = trips.map((trip) => {
      const totalExpense = trip.expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const tripStatus = getTripStatus(trip.startDate, trip.endDate);

      return {
        ...trip,
        status: tripStatus,
        totalExpense,
      };
    });

    // If requested grouping for Screen 6 wireframe (Ongoing, Upcoming, Completed sections)
    if (groupByStatus === 'true') {
      const grouped = {
        ongoing: formattedTrips.filter((t) => t.status === 'ongoing'),
        upcoming: formattedTrips.filter((t) => t.status === 'upcoming'),
        completed: formattedTrips.filter((t) => t.status === 'completed'),
        total: formattedTrips.length,
      };
      res.status(200).json(createResponse(true, 'User trips retrieved and grouped successfully', grouped));
      return;
    }

    res.status(200).json(createResponse(true, 'User trips retrieved successfully', formattedTrips));
  } catch (error: any) {
    console.error('Error fetching user trips:', error);
    res.status(500).json(createResponse(false, 'Failed to fetch user trips. ' + (error.message || ''), null));
  }
};

/**
 * Get detailed trip by ID (with stops, day-wise activities, and expenses)
 */
export const getTripById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const tripId = req.params.id as string;

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePhoto: true,
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
            expenses: true,
          },
        },
        expenses: {
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!trip) {
      res.status(404).json(createResponse(false, 'Trip not found', null));
      return;
    }

    // Access control: Allow if trip is public, or user is the owner, or user is admin
    const isOwner = userId && trip.userId === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!trip.isPublic && !isOwner && !isAdmin) {
      res.status(403).json(createResponse(false, 'You do not have permission to view this private trip', null));
      return;
    }

    const totalExpense = trip.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const status = getTripStatus(trip.startDate, trip.endDate);

    res.status(200).json(
      createResponse(true, 'Trip details retrieved successfully', {
        ...trip,
        status,
        totalExpense,
        isOwner,
      })
    );
  } catch (error: any) {
    console.error('Error fetching trip details:', error);
    res.status(500).json(createResponse(false, 'Failed to fetch trip details', null));
  }
};

/**
 * Update trip details
 */
export const updateTrip = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const tripId = req.params.id as string;

    if (!userId) {
      res.status(401).json(createResponse(false, 'Unauthorized access', null));
      return;
    }

    const existingTrip = await prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!existingTrip) {
      res.status(404).json(createResponse(false, 'Trip not found', null));
      return;
    }

    // Ownership check (only owner or ADMIN can update)
    if (existingTrip.userId !== userId && userRole !== 'ADMIN') {
      res.status(403).json(createResponse(false, 'You can only update your own trips', null));
      return;
    }

    const { name, description, startDate, endDate, isPublic, coverPhoto } = req.body;
    const updateData: any = {};

    if (name !== undefined) updateData.name = String(name).trim();
    if (description !== undefined) updateData.description = description ? String(description).trim() : null;

    if (startDate !== undefined) {
      const parsedStart = new Date(startDate);
      if (isNaN(parsedStart.getTime())) {
        res.status(400).json(createResponse(false, 'Invalid start date format', null));
        return;
      }
      updateData.startDate = parsedStart;
    }

    if (endDate !== undefined) {
      const parsedEnd = new Date(endDate);
      if (isNaN(parsedEnd.getTime())) {
        res.status(400).json(createResponse(false, 'Invalid end date format', null));
        return;
      }
      updateData.endDate = parsedEnd;
    }

    // Validate start date <= end date
    const finalStart = updateData.startDate || existingTrip.startDate;
    const finalEnd = updateData.endDate || existingTrip.endDate;
    if (finalStart > finalEnd) {
      res.status(400).json(createResponse(false, 'Start date cannot be after end date', null));
      return;
    }

    // Handle isPublic and shareSlug
    if (isPublic !== undefined) {
      const isPub = isPublic === true || isPublic === 'true';
      updateData.isPublic = isPub;
      if (isPub && !existingTrip.shareSlug) {
        updateData.shareSlug = generateSlug(updateData.name || existingTrip.name);
      }
    }

    // Cover photo
    if (req.file && (req.file as any).path) {
      updateData.coverPhoto = (req.file as any).path;
    } else if (coverPhoto !== undefined) {
      updateData.coverPhoto = coverPhoto ? String(coverPhoto).trim() : null;
    }

    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: updateData,
      include: {
        _count: { select: { stops: true, expenses: true } },
      },
    });

    const status = getTripStatus(updatedTrip.startDate, updatedTrip.endDate);

    res.status(200).json(
      createResponse(true, 'Trip updated successfully', {
        ...updatedTrip,
        status,
      })
    );
  } catch (error: any) {
    console.error('Error updating trip:', error);
    res.status(500).json(createResponse(false, 'Failed to update trip. ' + (error.message || ''), null));
  }
};

/**
 * Delete a trip
 */
export const deleteTrip = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const tripId = req.params.id as string;

    if (!userId) {
      res.status(401).json(createResponse(false, 'Unauthorized access', null));
      return;
    }

    const existingTrip = await prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!existingTrip) {
      res.status(404).json(createResponse(false, 'Trip not found', null));
      return;
    }

    // Ownership check (only owner or ADMIN can delete)
    if (existingTrip.userId !== userId && userRole !== 'ADMIN') {
      res.status(403).json(createResponse(false, 'You can only delete your own trips', null));
      return;
    }

    await prisma.trip.delete({
      where: { id: tripId },
    });

    res.status(200).json(createResponse(true, 'Trip deleted successfully', null));
  } catch (error: any) {
    console.error('Error deleting trip:', error);
    res.status(500).json(createResponse(false, 'Failed to delete trip. ' + (error.message || ''), null));
  }
};

/**
 * Toggle Trip Visibility (Public / Private) and return public share link
 */
export const toggleTripVisibility = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const tripId = req.params.id as string;

    const existingTrip = await prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!existingTrip) {
      res.status(404).json(createResponse(false, 'Trip not found', null));
      return;
    }

    if (existingTrip.userId !== userId && userRole !== 'ADMIN') {
      res.status(403).json(createResponse(false, 'You can only change visibility of your own trips', null));
      return;
    }

    const nextIsPublic = !existingTrip.isPublic;
    let shareSlug = existingTrip.shareSlug;

    if (nextIsPublic && !shareSlug) {
      shareSlug = generateSlug(existingTrip.name);
    }

    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: {
        isPublic: nextIsPublic,
        shareSlug,
      },
    });

    res.status(200).json(
      createResponse(true, `Trip is now ${nextIsPublic ? 'public' : 'private'}`, {
        id: updatedTrip.id,
        isPublic: updatedTrip.isPublic,
        shareSlug: updatedTrip.shareSlug,
      })
    );
  } catch (error: any) {
    console.error('Error toggling trip visibility:', error);
    res.status(500).json(createResponse(false, 'Failed to toggle trip visibility', null));
  }
};
