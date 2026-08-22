import { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { createResponse } from '../utils/api-response.js';

// Helper to check trip ownership
const verifyTripOwnership = async (
  tripId: string,
  userId: string,
  userRole?: string
): Promise<{ authorized: boolean; error?: string; status?: number; trip?: any }> => {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
  });

  if (!trip) {
    return { authorized: false, error: 'Trip not found', status: 404 };
  }

  if (trip.userId !== userId && userRole !== 'ADMIN') {
    return { authorized: false, error: 'You do not have permission to modify this trip', status: 403 };
  }

  return { authorized: true, trip };
};

// Helper to check stop ownership via trip
const verifyStopOwnership = async (
  stopId: string,
  userId: string,
  userRole?: string
): Promise<{ authorized: boolean; error?: string; status?: number; stop?: any }> => {
  const stop = await prisma.stop.findUnique({
    where: { id: stopId },
    include: { trip: true },
  });

  if (!stop) {
    return { authorized: false, error: 'Stop not found', status: 404 };
  }

  if (stop.trip.userId !== userId && userRole !== 'ADMIN') {
    return { authorized: false, error: 'You do not have permission to modify this stop', status: 403 };
  }

  return { authorized: true, stop };
};

// Helper to check stop activity ownership via stop & trip
const verifyStopActivityOwnership = async (
  stopActivityId: string,
  userId: string,
  userRole?: string
): Promise<{ authorized: boolean; error?: string; status?: number; stopActivity?: any }> => {
  const stopActivity = await prisma.stopActivity.findUnique({
    where: { id: stopActivityId },
    include: {
      stop: {
        include: { trip: true },
      },
    },
  });

  if (!stopActivity) {
    return { authorized: false, error: 'Scheduled activity not found', status: 404 };
  }

  if (stopActivity.stop.trip.userId !== userId && userRole !== 'ADMIN') {
    return {
      authorized: false,
      error: 'You do not have permission to modify this scheduled activity',
      status: 403,
    };
  }

  return { authorized: true, stopActivity };
};

// ==========================================
// 1. STOPS CONTROLLERS (Multi-City Itinerary)
// ==========================================

/**
 * Add a stop/city to a trip (Screen 4 & 5)
 */
export const addStop = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const tripId = req.params.tripId as string;

    if (!userId) {
      res.status(401).json(createResponse(false, 'Unauthorized access', null));
      return;
    }

    const { authorized, error, status, trip } = await verifyTripOwnership(tripId, userId, userRole);
    if (!authorized) {
      res.status(status || 403).json(createResponse(false, error || 'Forbidden', null));
      return;
    }

    const { cityId, startDate, endDate, order } = req.body;

    if (!cityId || !startDate || !endDate) {
      res.status(400).json(createResponse(false, 'cityId, startDate, and endDate are required', null));
      return;
    }

    const city = await prisma.city.findUnique({ where: { id: cityId } });
    if (!city) {
      res.status(404).json(createResponse(false, 'Selected city does not exist', null));
      return;
    }

    const parsedStart = new Date(startDate);
    const parsedEnd = new Date(endDate);

    if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
      res.status(400).json(createResponse(false, 'Invalid start or end date format', null));
      return;
    }

    if (parsedStart > parsedEnd) {
      res.status(400).json(createResponse(false, 'Stop start date cannot be after end date', null));
      return;
    }

    // Determine order sequence
    let finalOrder = typeof order === 'number' ? order : 0;
    if (order === undefined) {
      const highestOrderStop = await prisma.stop.findFirst({
        where: { tripId },
        orderBy: { order: 'desc' },
      });
      finalOrder = highestOrderStop ? highestOrderStop.order + 1 : 1;
    }

    const stop = await prisma.stop.create({
      data: {
        tripId,
        cityId,
        startDate: parsedStart,
        endDate: parsedEnd,
        order: finalOrder,
      },
      include: {
        city: true,
        stopActivities: {
          include: { activity: true },
        },
      },
    });

    res.status(201).json(createResponse(true, 'Stop added to itinerary successfully', stop));
  } catch (error: any) {
    console.error('Error adding stop:', error);
    res.status(500).json(createResponse(false, 'Failed to add stop. ' + (error.message || ''), null));
  }
};

/**
 * Get all stops of a trip (ordered by sequence)
 */
export const getTripStops = async (req: Request, res: Response): Promise<void> => {
  try {
    const tripId = req.params.tripId as string;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      res.status(404).json(createResponse(false, 'Trip not found', null));
      return;
    }

    // If private, ensure owner or admin
    if (!trip.isPublic && trip.userId !== userId && userRole !== 'ADMIN') {
      res.status(403).json(createResponse(false, 'You do not have access to this trip', null));
      return;
    }

    const stops = await prisma.stop.findMany({
      where: { tripId },
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
    });

    res.status(200).json(createResponse(true, 'Trip stops retrieved successfully', stops));
  } catch (error: any) {
    console.error('Error fetching trip stops:', error);
    res.status(500).json(createResponse(false, 'Failed to fetch trip stops', null));
  }
};

/**
 * Update a stop (city, dates, order)
 */
export const updateStop = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const stopId = req.params.stopId as string;

    if (!userId) {
      res.status(401).json(createResponse(false, 'Unauthorized access', null));
      return;
    }

    const { authorized, error, status, stop } = await verifyStopOwnership(stopId, userId, userRole);
    if (!authorized) {
      res.status(status || 403).json(createResponse(false, error || 'Forbidden', null));
      return;
    }

    const { cityId, startDate, endDate, order } = req.body;
    const updateData: any = {};

    if (cityId) {
      const city = await prisma.city.findUnique({ where: { id: cityId } });
      if (!city) {
        res.status(404).json(createResponse(false, 'Selected city does not exist', null));
        return;
      }
      updateData.cityId = cityId;
    }

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

    const finalStart = updateData.startDate || stop.startDate;
    const finalEnd = updateData.endDate || stop.endDate;
    if (finalStart > finalEnd) {
      res.status(400).json(createResponse(false, 'Stop start date cannot be after end date', null));
      return;
    }

    if (order !== undefined) {
      updateData.order = parseInt(String(order));
    }

    const updated = await prisma.stop.update({
      where: { id: stopId },
      data: updateData,
      include: {
        city: true,
        stopActivities: {
          include: { activity: true },
        },
      },
    });

    res.status(200).json(createResponse(true, 'Stop updated successfully', updated));
  } catch (error: any) {
    console.error('Error updating stop:', error);
    res.status(500).json(createResponse(false, 'Failed to update stop. ' + (error.message || ''), null));
  }
};

/**
 * Delete a stop
 */
export const deleteStop = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const stopId = req.params.stopId as string;

    if (!userId) {
      res.status(401).json(createResponse(false, 'Unauthorized access', null));
      return;
    }

    const { authorized, error, status } = await verifyStopOwnership(stopId, userId, userRole);
    if (!authorized) {
      res.status(status || 403).json(createResponse(false, error || 'Forbidden', null));
      return;
    }

    await prisma.stop.delete({ where: { id: stopId } });

    res.status(200).json(createResponse(true, 'Stop removed from itinerary successfully', null));
  } catch (error: any) {
    console.error('Error deleting stop:', error);
    res.status(500).json(createResponse(false, 'Failed to delete stop. ' + (error.message || ''), null));
  }
};

/**
 * Bulk reorder stops for a trip
 */
export const reorderStops = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const tripId = req.params.tripId as string;

    if (!userId) {
      res.status(401).json(createResponse(false, 'Unauthorized access', null));
      return;
    }

    const { authorized, error, status } = await verifyTripOwnership(tripId, userId, userRole);
    if (!authorized) {
      res.status(status || 403).json(createResponse(false, error || 'Forbidden', null));
      return;
    }

    // Expects array: [{ stopId: "...", order: 1 }, { stopId: "...", order: 2 }]
    const { stops } = req.body;
    if (!Array.isArray(stops)) {
      res.status(400).json(createResponse(false, 'An array of stops with id and order is required', null));
      return;
    }

    await prisma.$transaction(
      stops.map((item: { stopId: string; order: number }) =>
        prisma.stop.update({
          where: { id: item.stopId },
          data: { order: item.order },
        })
      )
    );

    const updatedStops = await prisma.stop.findMany({
      where: { tripId },
      orderBy: { order: 'asc' },
      include: { city: true },
    });

    res.status(200).json(createResponse(true, 'Stops reordered successfully', updatedStops));
  } catch (error: any) {
    console.error('Error reordering stops:', error);
    res.status(500).json(createResponse(false, 'Failed to reorder stops', null));
  }
};

// ====================================================
// 2. STOP ACTIVITIES CONTROLLERS (Day-wise Scheduling)
// ====================================================

/**
 * Add / schedule an activity inside a stop (Screens 5 & 9)
 */
export const addStopActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const stopId = req.params.stopId as string;

    if (!userId) {
      res.status(401).json(createResponse(false, 'Unauthorized access', null));
      return;
    }

    const { authorized, error, status, stop } = await verifyStopOwnership(stopId, userId, userRole);
    if (!authorized) {
      res.status(status || 403).json(createResponse(false, error || 'Forbidden', null));
      return;
    }

    const { activityId, scheduledDate, startTime, order, costOverride } = req.body;

    if (!activityId || !scheduledDate) {
      res.status(400).json(createResponse(false, 'activityId and scheduledDate are required', null));
      return;
    }

    const activity = await prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) {
      res.status(404).json(createResponse(false, 'Activity not found', null));
      return;
    }

    const parsedDate = new Date(scheduledDate);
    if (isNaN(parsedDate.getTime())) {
      res.status(400).json(createResponse(false, 'Invalid scheduled date format', null));
      return;
    }

    // Auto-compute order if not provided
    let finalOrder = typeof order === 'number' ? order : 0;
    if (order === undefined) {
      const highestOrder = await prisma.stopActivity.findFirst({
        where: { stopId, scheduledDate: parsedDate },
        orderBy: { order: 'desc' },
      });
      finalOrder = highestOrder ? highestOrder.order + 1 : 1;
    }

    const stopActivity = await prisma.stopActivity.create({
      data: {
        stopId,
        activityId,
        scheduledDate: parsedDate,
        startTime: startTime ? String(startTime).trim() : null,
        order: finalOrder,
        costOverride: costOverride !== undefined ? parseFloat(String(costOverride)) : null,
      },
      include: {
        activity: true,
      },
    });

    res.status(201).json(createResponse(true, 'Activity scheduled into itinerary stop successfully', stopActivity));
  } catch (error: any) {
    console.error('Error adding activity to stop:', error);
    res.status(500).json(createResponse(false, 'Failed to schedule activity. ' + (error.message || ''), null));
  }
};

/**
 * Update a scheduled activity (time, date, order, costOverride)
 */
export const updateStopActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const id = req.params.id as string;

    if (!userId) {
      res.status(401).json(createResponse(false, 'Unauthorized access', null));
      return;
    }

    const { authorized, error, status } = await verifyStopActivityOwnership(id, userId, userRole);
    if (!authorized) {
      res.status(status || 403).json(createResponse(false, error || 'Forbidden', null));
      return;
    }

    const { scheduledDate, startTime, order, costOverride } = req.body;
    const updateData: any = {};

    if (scheduledDate !== undefined) {
      const parsedDate = new Date(scheduledDate);
      if (isNaN(parsedDate.getTime())) {
        res.status(400).json(createResponse(false, 'Invalid scheduled date format', null));
        return;
      }
      updateData.scheduledDate = parsedDate;
    }

    if (startTime !== undefined) {
      updateData.startTime = startTime ? String(startTime).trim() : null;
    }

    if (order !== undefined) {
      updateData.order = parseInt(String(order));
    }

    if (costOverride !== undefined) {
      updateData.costOverride = costOverride !== null ? parseFloat(String(costOverride)) : null;
    }

    const updated = await prisma.stopActivity.update({
      where: { id },
      data: updateData,
      include: {
        activity: true,
      },
    });

    res.status(200).json(createResponse(true, 'Scheduled activity updated successfully', updated));
  } catch (error: any) {
    console.error('Error updating scheduled activity:', error);
    res.status(500).json(createResponse(false, 'Failed to update scheduled activity. ' + (error.message || ''), null));
  }
};

/**
 * Delete a scheduled activity from a stop
 */
export const deleteStopActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const id = req.params.id as string;

    if (!userId) {
      res.status(401).json(createResponse(false, 'Unauthorized access', null));
      return;
    }

    const { authorized, error, status } = await verifyStopActivityOwnership(id, userId, userRole);
    if (!authorized) {
      res.status(status || 403).json(createResponse(false, error || 'Forbidden', null));
      return;
    }

    await prisma.stopActivity.delete({ where: { id } });

    res.status(200).json(createResponse(true, 'Activity removed from stop successfully', null));
  } catch (error: any) {
    console.error('Error deleting scheduled activity:', error);
    res.status(500).json(createResponse(false, 'Failed to delete scheduled activity', null));
  }
};

/**
 * Reorder stop activities (Drag-and-drop support on day view)
 */
export const reorderStopActivities = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const stopId = req.params.stopId as string;

    if (!userId) {
      res.status(401).json(createResponse(false, 'Unauthorized access', null));
      return;
    }

    const { authorized, error, status } = await verifyStopOwnership(stopId, userId, userRole);
    if (!authorized) {
      res.status(status || 403).json(createResponse(false, error || 'Forbidden', null));
      return;
    }

    // Expects array: [{ activityId: "...", order: 1, scheduledDate?: "2026-08-25" }]
    const { activities } = req.body;
    if (!Array.isArray(activities)) {
      res.status(400).json(createResponse(false, 'An array of activities with id and order is required', null));
      return;
    }

    await prisma.$transaction(
      activities.map((item: { id: string; order: number; scheduledDate?: string; startTime?: string }) => {
        const data: any = { order: item.order };
        if (item.scheduledDate) data.scheduledDate = new Date(item.scheduledDate);
        if (item.startTime !== undefined) data.startTime = item.startTime;

        return prisma.stopActivity.update({
          where: { id: item.id },
          data,
        });
      })
    );

    const updatedActivities = await prisma.stopActivity.findMany({
      where: { stopId },
      orderBy: [{ scheduledDate: 'asc' }, { order: 'asc' }],
      include: { activity: true },
    });

    res.status(200).json(createResponse(true, 'Activities reordered successfully', updatedActivities));
  } catch (error: any) {
    console.error('Error reordering activities:', error);
    res.status(500).json(createResponse(false, 'Failed to reorder activities', null));
  }
};
