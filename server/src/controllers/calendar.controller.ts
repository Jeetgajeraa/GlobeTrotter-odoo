import { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { createResponse } from '../utils/api-response.js';
import { getTripStatus } from './trip.controller.js';

// Helper to format date YYYY-MM-DD
const formatDateKey = (d: Date): string => {
  return d.toISOString().split('T')[0];
};

// Helper to generate list of all dates between start and end (inclusive)
const getDaysArray = (start: Date, end: Date): string[] => {
  const arr: string[] = [];
  const dt = new Date(start);
  dt.setHours(0, 0, 0, 0);

  const endDt = new Date(end);
  endDt.setHours(0, 0, 0, 0);

  while (dt <= endDt) {
    arr.push(formatDateKey(dt));
    dt.setDate(dt.getDate() + 1);
  }
  return arr;
};

/**
 * Get User-wide Calendar View (Screen 11)
 * Returns trips spanning across months/dates for month grid rendering
 */
export const getUserCalendar = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json(createResponse(false, 'Unauthorized access', null));
      return;
    }

    const { year, month, startDate, endDate } = req.query;
    const where: any = { userId };

    // If month/year filter is passed (e.g. year=2024, month=1)
    if (year) {
      const yr = parseInt(String(year));
      if (!isNaN(yr)) {
        let startMonth = 0;
        let endMonth = 11;

        if (month) {
          const m = parseInt(String(month)) - 1; // 0-indexed
          if (!isNaN(m) && m >= 0 && m <= 11) {
            startMonth = m;
            endMonth = m;
          }
        }

        const rangeStart = new Date(Date.UTC(yr, startMonth, 1));
        const rangeEnd = new Date(Date.UTC(yr, endMonth + 1, 0, 23, 59, 59));

        where.AND = [
          { startDate: { lte: rangeEnd } },
          { endDate: { gte: rangeStart } },
        ];
      }
    } else if (startDate && endDate) {
      const rangeStart = new Date(String(startDate));
      const rangeEnd = new Date(String(endDate));
      if (!isNaN(rangeStart.getTime()) && !isNaN(rangeEnd.getTime())) {
        where.AND = [
          { startDate: { lte: rangeEnd } },
          { endDate: { gte: rangeStart } },
        ];
      }
    }

    const trips = await prisma.trip.findMany({
      where,
      orderBy: { startDate: 'asc' },
      include: {
        stops: {
          orderBy: { order: 'asc' },
          include: {
            city: {
              select: { id: true, name: true, country: true, imageUrl: true },
            },
            stopActivities: {
              orderBy: [{ scheduledDate: 'asc' }, { order: 'asc' }],
              include: {
                activity: {
                  select: { id: true, name: true, category: true, cost: true },
                },
              },
            },
            _count: { select: { stopActivities: true } },
          },
        },
        expenses: {
          select: { amount: true },
        },
      },
    });

    const calendarEvents = trips.map((trip) => {
      const totalExpense = trip.expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const status = getTripStatus(trip.startDate, trip.endDate);
      const cities = trip.stops.map((s) => ({
        id: s.city.id,
        name: s.city.name,
        country: s.city.country,
        startDate: s.startDate,
        endDate: s.endDate,
      }));

      const activities = trip.stops.flatMap((s) =>
        s.stopActivities.map((sa) => ({
          id: sa.id,
          name: sa.activity.name,
          category: sa.activity.category,
          scheduledDate: sa.scheduledDate,
          startTime: sa.startTime,
          cost: sa.costOverride !== null ? sa.costOverride : sa.activity.cost,
        }))
      );

      return {
        id: trip.id,
        name: trip.name,
        description: trip.description,
        startDate: trip.startDate,
        endDate: trip.endDate,
        coverPhoto: trip.coverPhoto,
        isPublic: trip.isPublic,
        shareSlug: trip.shareSlug,
        status,
        totalExpense,
        stopsCount: trip.stops.length,
        cities,
        activities,
      };
    });

    res.status(200).json(
      createResponse(true, 'User calendar events retrieved successfully', {
        events: calendarEvents,
        total: calendarEvents.length,
      })
    );
  } catch (error: any) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json(createResponse(false, 'Failed to fetch calendar events', null));
  }
};

/**
 * Get Trip-Specific Day-by-Day Timeline / Calendar (Screens 9 & 11)
 * Combines active city stops, scheduled activities, and daily expenses day-by-day (Day 1, Day 2...)
 */
export const getTripTimeline = async (req: Request, res: Response): Promise<void> => {
  try {
    const tripId = req.params.tripId as string;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
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
          include: {
            stop: {
              include: { city: true },
            },
          },
        },
      },
    });

    if (!trip) {
      res.status(404).json(createResponse(false, 'Trip not found', null));
      return;
    }

    if (!trip.isPublic && trip.userId !== userId && userRole !== 'ADMIN') {
      res.status(403).json(createResponse(false, 'You do not have access to this trip’s timeline', null));
      return;
    }

    const allDates = getDaysArray(trip.startDate, trip.endDate);

    // Build timeline items per day
    const days = allDates.map((dateStr, index) => {
      const currentDayDate = new Date(`${dateStr}T00:00:00.000Z`);
      const dayNumber = index + 1;

      // 1. Identify which stops are active on this date
      const activeStops = trip.stops
        .filter((stop) => {
          const stopStart = new Date(stop.startDate).toISOString().split('T')[0];
          const stopEnd = new Date(stop.endDate).toISOString().split('T')[0];
          return dateStr >= stopStart && dateStr <= stopEnd;
        })
        .map((s) => ({
          stopId: s.id,
          order: s.order,
          city: {
            id: s.city.id,
            name: s.city.name,
            country: s.city.country,
            imageUrl: s.city.imageUrl,
          },
        }));

      // 2. Identify activities scheduled on this day
      const dayActivities: any[] = [];
      for (const stop of trip.stops) {
        for (const sa of stop.stopActivities) {
          const actDateStr = new Date(sa.scheduledDate).toISOString().split('T')[0];
          if (actDateStr === dateStr) {
            dayActivities.push({
              id: sa.id,
              stopId: sa.stopId,
              cityName: stop.city.name,
              activityId: sa.activityId,
              name: sa.activity.name,
              description: sa.activity.description,
              category: sa.activity.category,
              durationMin: sa.activity.durationMin,
              startTime: sa.startTime,
              order: sa.order,
              cost: sa.costOverride !== null ? sa.costOverride : sa.activity.cost,
              imageUrl: sa.activity.imageUrl,
            });
          }
        }
      }

      dayActivities.sort((a, b) => {
        if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
        return a.order - b.order;
      });

      // 3. Identify logged expenses on this day
      const dayExpenses = trip.expenses
        .filter((exp) => {
          const expDateStr = new Date(exp.date).toISOString().split('T')[0];
          return expDateStr === dateStr;
        })
        .map((exp) => ({
          id: exp.id,
          category: exp.category,
          amount: exp.amount,
          description: exp.description,
          cityName: exp.stop?.city?.name || null,
        }));

      const dayTotalExpenses = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
      const dayEstimatedActivitiesCost = dayActivities.reduce((sum, a) => sum + a.cost, 0);

      return {
        dayNumber,
        date: dateStr,
        activeStops,
        activitiesCount: dayActivities.length,
        activities: dayActivities,
        expensesCount: dayExpenses.length,
        expenses: dayExpenses,
        dayTotalExpenses: Math.round(dayTotalExpenses * 100) / 100,
        dayEstimatedActivitiesCost: Math.round(dayEstimatedActivitiesCost * 100) / 100,
      };
    });

    const status = getTripStatus(trip.startDate, trip.endDate);
    const totalExpenses = trip.expenses.reduce((sum, e) => sum + e.amount, 0);

    res.status(200).json(
      createResponse(true, 'Trip timeline retrieved successfully', {
        tripId: trip.id,
        tripName: trip.name,
        startDate: trip.startDate,
        endDate: trip.endDate,
        totalDays: days.length,
        status,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        days,
      })
    );
  } catch (error: any) {
    console.error('Error fetching trip timeline:', error);
    res.status(500).json(createResponse(false, 'Failed to fetch trip timeline', null));
  }
};
