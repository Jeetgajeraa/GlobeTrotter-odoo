import { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { createResponse } from '../utils/api-response.js';
import { ExpenseCategory } from '../../generated/prisma/enums.js';

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
    return { authorized: false, error: 'You do not have permission to manage expenses for this trip', status: 403 };
  }

  return { authorized: true, trip };
};

// Helper to check expense ownership via trip
const verifyExpenseOwnership = async (
  expenseId: string,
  userId: string,
  userRole?: string
): Promise<{ authorized: boolean; error?: string; status?: number; expense?: any }> => {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { trip: true },
  });

  if (!expense) {
    return { authorized: false, error: 'Expense not found', status: 404 };
  }

  if (expense.trip.userId !== userId && userRole !== 'ADMIN') {
    return { authorized: false, error: 'You do not have permission to modify this expense', status: 403 };
  }

  return { authorized: true, expense };
};

/**
 * Add an expense to a trip (optionally linked to a stop)
 */
export const addExpense = async (req: Request, res: Response): Promise<void> => {
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

    const { stopId, category, amount, date, description } = req.body;

    if (!category || amount === undefined || !date) {
      res.status(400).json(createResponse(false, 'category, amount, and date are required', null));
      return;
    }

    const parsedAmount = parseFloat(String(amount));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json(createResponse(false, 'Amount must be a positive number', null));
      return;
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      res.status(400).json(createResponse(false, 'Invalid expense date format', null));
      return;
    }

    const upperCategory = String(category).toUpperCase();
    if (!Object.values(ExpenseCategory).includes(upperCategory as any)) {
      res.status(400).json(
        createResponse(
          false,
          `Invalid category. Allowed: ${Object.values(ExpenseCategory).join(', ')}`,
          null
        )
      );
      return;
    }

    // If stopId is provided, verify it belongs to this trip
    if (stopId) {
      const stop = await prisma.stop.findUnique({ where: { id: stopId } });
      if (!stop || stop.tripId !== tripId) {
        res.status(400).json(createResponse(false, 'Provided stop does not belong to this trip', null));
        return;
      }
    }

    const expense = await prisma.expense.create({
      data: {
        tripId,
        stopId: stopId || null,
        category: upperCategory as ExpenseCategory,
        amount: parsedAmount,
        date: parsedDate,
        description: description ? String(description).trim() : null,
      },
      include: {
        stop: {
          include: { city: true },
        },
      },
    });

    res.status(201).json(createResponse(true, 'Expense recorded successfully', expense));
  } catch (error: any) {
    console.error('Error adding expense:', error);
    res.status(500).json(createResponse(false, 'Failed to add expense. ' + (error.message || ''), null));
  }
};

/**
 * Get all expenses for a trip with optional category / stop filters
 */
export const getTripExpenses = async (req: Request, res: Response): Promise<void> => {
  try {
    const tripId = req.params.tripId as string;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      res.status(404).json(createResponse(false, 'Trip not found', null));
      return;
    }

    // Access control: Public trip or authorized owner/admin
    if (!trip.isPublic && trip.userId !== userId && userRole !== 'ADMIN') {
      res.status(403).json(createResponse(false, 'You do not have access to this trip’s expenses', null));
      return;
    }

    const { category, stopId, sortBy = 'date', sortOrder = 'desc' } = req.query;
    const where: any = { tripId };

    if (category) {
      const cat = String(category).toUpperCase();
      if (Object.values(ExpenseCategory).includes(cat as any)) {
        where.category = cat as ExpenseCategory;
      }
    }

    if (stopId) {
      where.stopId = String(stopId);
    }

    const validSortFields = ['date', 'amount', 'createdAt'];
    const sortField = validSortFields.includes(String(sortBy)) ? String(sortBy) : 'date';
    const orderDirection = String(sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { [sortField]: orderDirection },
      include: {
        stop: {
          include: { city: true },
        },
      },
    });

    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    res.status(200).json(
      createResponse(true, 'Trip expenses retrieved successfully', {
        expenses,
        totalAmount,
        count: expenses.length,
      })
    );
  } catch (error: any) {
    console.error('Error fetching expenses:', error);
    res.status(500).json(createResponse(false, 'Failed to fetch expenses', null));
  }
};

/**
 * Update an existing expense
 */
export const updateExpense = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const expenseId = req.params.id as string;

    if (!userId) {
      res.status(401).json(createResponse(false, 'Unauthorized access', null));
      return;
    }

    const { authorized, error, status } = await verifyExpenseOwnership(expenseId, userId, userRole);
    if (!authorized) {
      res.status(status || 403).json(createResponse(false, error || 'Forbidden', null));
      return;
    }

    const { stopId, category, amount, date, description } = req.body;
    const updateData: any = {};

    if (amount !== undefined) {
      const parsedAmount = parseFloat(String(amount));
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        res.status(400).json(createResponse(false, 'Amount must be a positive number', null));
        return;
      }
      updateData.amount = parsedAmount;
    }

    if (date !== undefined) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        res.status(400).json(createResponse(false, 'Invalid expense date format', null));
        return;
      }
      updateData.date = parsedDate;
    }

    if (category !== undefined) {
      const upperCategory = String(category).toUpperCase();
      if (!Object.values(ExpenseCategory).includes(upperCategory as any)) {
        res.status(400).json(createResponse(false, 'Invalid expense category', null));
        return;
      }
      updateData.category = upperCategory as ExpenseCategory;
    }

    if (stopId !== undefined) {
      updateData.stopId = stopId || null;
    }

    if (description !== undefined) {
      updateData.description = description ? String(description).trim() : null;
    }

    const updated = await prisma.expense.update({
      where: { id: expenseId },
      data: updateData,
      include: {
        stop: {
          include: { city: true },
        },
      },
    });

    res.status(200).json(createResponse(true, 'Expense updated successfully', updated));
  } catch (error: any) {
    console.error('Error updating expense:', error);
    res.status(500).json(createResponse(false, 'Failed to update expense. ' + (error.message || ''), null));
  }
};

/**
 * Delete an expense
 */
export const deleteExpense = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const expenseId = req.params.id as string;

    if (!userId) {
      res.status(401).json(createResponse(false, 'Unauthorized access', null));
      return;
    }

    const { authorized, error, status } = await verifyExpenseOwnership(expenseId, userId, userRole);
    if (!authorized) {
      res.status(status || 403).json(createResponse(false, error || 'Forbidden', null));
      return;
    }

    await prisma.expense.delete({ where: { id: expenseId } });

    res.status(200).json(createResponse(true, 'Expense deleted successfully', null));
  } catch (error: any) {
    console.error('Error deleting expense:', error);
    res.status(500).json(createResponse(false, 'Failed to delete expense', null));
  }
};

/**
 * Trip Budget & Cost Breakdown Summary (Screen 9)
 * Calculates category breakdown, charts data, daily averages, and activity estimates
 */
export const getTripBudgetSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const tripId = req.params.tripId as string;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        stops: {
          include: {
            city: true,
            stopActivities: {
              include: { activity: true },
            },
            expenses: true,
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
      res.status(403).json(createResponse(false, 'You do not have access to this trip’s budget', null));
      return;
    }

    // 1. Calculate trip duration in days
    const startTime = new Date(trip.startDate).getTime();
    const endTime = new Date(trip.endDate).getTime();
    const durationDays = Math.max(1, Math.round((endTime - startTime) / (1000 * 60 * 60 * 24)) + 1);

    // 2. Calculate logged total expenses & category breakdown
    const totalLoggedExpense = trip.expenses.reduce((sum, exp) => sum + exp.amount, 0);

    const categoryMap: Record<string, { total: number; count: number }> = {
      TRANSPORT: { total: 0, count: 0 },
      STAY: { total: 0, count: 0 },
      ACTIVITY: { total: 0, count: 0 },
      MEALS: { total: 0, count: 0 },
      OTHER: { total: 0, count: 0 },
    };

    for (const exp of trip.expenses) {
      if (categoryMap[exp.category]) {
        categoryMap[exp.category].total += exp.amount;
        categoryMap[exp.category].count += 1;
      }
    }

    const categoryBreakdown = Object.entries(categoryMap).map(([cat, data]) => ({
      category: cat,
      amount: Math.round(data.total * 100) / 100,
      count: data.count,
      percentage: totalLoggedExpense > 0 ? Math.round((data.total / totalLoggedExpense) * 1000) / 10 : 0,
    }));

    // 3. Estimated Scheduled Activities Cost from Itinerary Stops
    let totalEstimatedActivitiesCost = 0;
    const scheduledActivitiesList: any[] = [];

    for (const stop of trip.stops) {
      for (const sa of stop.stopActivities) {
        const cost = sa.costOverride !== null ? sa.costOverride : sa.activity.cost;
        totalEstimatedActivitiesCost += cost;
        scheduledActivitiesList.push({
          stopActivityId: sa.id,
          activityName: sa.activity.name,
          cityName: stop.city.name,
          scheduledDate: sa.scheduledDate,
          cost,
        });
      }
    }

    // 4. Day-by-Day expenses breakdown for calendar / timeline
    const dailyMap: Record<string, { date: string; total: number; items: any[] }> = {};

    for (const exp of trip.expenses) {
      const dateKey = new Date(exp.date).toISOString().split('T')[0];
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { date: dateKey, total: 0, items: [] };
      }
      dailyMap[dateKey].total += exp.amount;
      dailyMap[dateKey].items.push({
        id: exp.id,
        category: exp.category,
        amount: exp.amount,
        description: exp.description,
        cityName: exp.stop?.city?.name || null,
      });
    }

    const dailyExpenses = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // 5. Per-stop financial breakdown
    const stopBreakdown = trip.stops.map((stop) => {
      const stopExpenses = stop.expenses.reduce((sum, e) => sum + e.amount, 0);
      const stopActivitiesEstimated = stop.stopActivities.reduce((sum, sa) => {
        return sum + (sa.costOverride !== null ? sa.costOverride : sa.activity.cost);
      }, 0);

      return {
        stopId: stop.id,
        cityName: stop.city.name,
        country: stop.city.country,
        order: stop.order,
        startDate: stop.startDate,
        endDate: stop.endDate,
        totalExpenses: Math.round(stopExpenses * 100) / 100,
        estimatedActivitiesCost: Math.round(stopActivitiesEstimated * 100) / 100,
      };
    });

    const averageCostPerDay = Math.round((totalLoggedExpense / durationDays) * 100) / 100;

    res.status(200).json(
      createResponse(true, 'Trip budget summary generated successfully', {
        tripId: trip.id,
        tripName: trip.name,
        durationDays,
        totalLoggedExpense: Math.round(totalLoggedExpense * 100) / 100,
        totalEstimatedActivitiesCost: Math.round(totalEstimatedActivitiesCost * 100) / 100,
        averageCostPerDay,
        categoryBreakdown,
        dailyExpenses,
        stopBreakdown,
        scheduledActivitiesCount: scheduledActivitiesList.length,
      })
    );
  } catch (error: any) {
    console.error('Error generating budget summary:', error);
    res.status(500).json(createResponse(false, 'Failed to generate budget summary', null));
  }
};
