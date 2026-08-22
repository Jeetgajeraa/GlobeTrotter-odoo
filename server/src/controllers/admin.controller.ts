import { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { createResponse } from '../utils/api-response.js';

//helper
function getTripStatus(startDate: Date, endDate: Date): 'upcoming' | 'ongoing' | 'completed' {
  const now = new Date();
  if (startDate > now) return 'upcoming';
  if (endDate < now) return 'completed';
  return 'ongoing';
}

// Platform-wide KPIs, trip status distribution, and time-series growth data
export const getAnalytics = async (_req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      newUsersThisMonth,
      totalTrips,
      totalStops,
      totalActivities,
      expenseSum,
      totalPosts,
      likeSum,
      allTrips,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.trip.count(),
      prisma.stop.count(),
      prisma.stopActivity.count(),
      prisma.expense.aggregate({ _sum: { amount: true } }),
      prisma.communityPost.count(),
      prisma.communityPost.aggregate({ _sum: { likeCount: true } }),
      // Fetch all trips for status distribution (startDate + endDate only)
      prisma.trip.findMany({ select: { startDate: true, endDate: true } }),
    ]);

    const tripStatusDistribution = allTrips.reduce(
      (acc, trip) => {
        const status = getTripStatus(trip.startDate, trip.endDate);
        acc[status] += 1;
        return acc;
      },
      { upcoming: 0, ongoing: 0, completed: 0 }
    );

    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Fetch createdAt for trips and users created in the last 12 months,
    // then bucket by year-month in JavaScript
    const [recentTrips, recentUsers] = await Promise.all([
      prisma.trip.findMany({
        where: { createdAt: { gte: twelveMonthsAgo } },
        select: { createdAt: true },
      }),
      prisma.user.findMany({
        where: { createdAt: { gte: twelveMonthsAgo } },
        select: { createdAt: true },
      }),
    ]);

    const bucketByMonth = (records: { createdAt: Date }[]) => {
      const map = new Map<string, number>();
      for (const r of records) {
        const key = `${r.createdAt.getFullYear()}-${String(r.createdAt.getMonth() + 1).padStart(2, '0')}`;
        map.set(key, (map.get(key) ?? 0) + 1);
      }
      return Array.from(map.entries())
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month));
    };

    const monthlyTripCreation = bucketByMonth(recentTrips);
    const monthlyUserRegistration = bucketByMonth(recentUsers);

    res.status(200).json(
      createResponse(true, 'Analytics retrieved successfully', {
        kpis: {
          totalUsers,
          newUsersThisMonth,
          totalTrips,
          totalStops,
          totalActivities,
          totalExpenses: expenseSum._sum.amount ?? 0,
          totalPosts,
          totalLikes: likeSum._sum.likeCount ?? 0,
        },
        tripStatusDistribution,
        monthlyTripCreation,
        monthlyUserRegistration,
      })
    );
  } catch (error: any) {
    console.error('Error fetching admin analytics:', error);
    res.status(500).json(createResponse(false, 'Failed to fetch analytics. ' + (error.message || ''), null));
  }
};



// Top cities by stop count + wishlist saves, top countries by stop count
export const getPopularDestinations = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '10'), 10), 50);

    // Group stops by cityId and count them using Prisma groupBy
    const stopGrouped = await prisma.stop.groupBy({
      by: ['cityId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    const cityIds = stopGrouped.map((r) => r.cityId);

    // Fetch city details, saved counts, and expense totals in parallel
    const [cityDetails, savedCounts, stopExpenses] = await Promise.all([
      prisma.city.findMany({
        where: { id: { in: cityIds } },
        select: { id: true, name: true, country: true, region: true },
      }),
      prisma.savedDestination.groupBy({
        by: ['cityId'],
        where: { cityId: { in: cityIds } },
        _count: { id: true },
      }),
      // Expenses linked to stops — fetch stops with their expenses then aggregate in JS
      prisma.stop.findMany({
        where: { cityId: { in: cityIds } },
        select: {
          cityId: true,
          expenses: { select: { amount: true } },
        },
      }),
    ]);

    const cityMap = new Map(cityDetails.map((c) => [c.id, c]));
    const savedMap = new Map(savedCounts.map((r) => [r.cityId, r._count.id]));

    // Aggregate expenses per city from stop-level data
    const expenseMap = new Map<string, number>();
    for (const stop of stopExpenses) {
      const total = stop.expenses.reduce((sum, e) => sum + e.amount, 0);
      expenseMap.set(stop.cityId, (expenseMap.get(stop.cityId) ?? 0) + total);
    }

    const topCities = stopGrouped
      .map((r) => {
        const city = cityMap.get(r.cityId);
        if (!city) return null;
        return {
          cityId: r.cityId,
          cityName: city.name,
          country: city.country,
          region: city.region,
          stopCount: r._count.id,
          savedCount: savedMap.get(r.cityId) ?? 0,
          totalExpenses: expenseMap.get(r.cityId) ?? 0,
        };
      })
      .filter(Boolean);

    // Top countries — fetch all cities with their stop counts, group by country in JS
    const allCitiesWithStops = await prisma.city.findMany({
      select: {
        id: true,
        country: true,
        _count: { select: { stops: true } },
      },
    });

    const countryMap = new Map<string, { cityCount: number; stopCount: number }>();
    for (const city of allCitiesWithStops) {
      const existing = countryMap.get(city.country) ?? { cityCount: 0, stopCount: 0 };
      countryMap.set(city.country, {
        cityCount: existing.cityCount + 1,
        stopCount: existing.stopCount + city._count.stops,
      });
    }

    const topCountries = Array.from(countryMap.entries())
      .map(([country, stats]) => ({ country, ...stats }))
      .sort((a, b) => b.stopCount - a.stopCount)
      .slice(0, limit);

    res.status(200).json(
      createResponse(true, 'Popular destinations retrieved successfully', {
        topCities,
        topCountries,
      })
    );
  } catch (error: any) {
    console.error('Error fetching popular destinations:', error);
    res.status(500).json(createResponse(false, 'Failed to fetch popular destinations. ' + (error.message || ''), null));
  }
};

// Top activities by scheduled count + breakdown by category
export const getPopularActivities = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '10'), 10), 50);

    // --- Top activities ---
    const topActivitiesRaw = await prisma.stopActivity.groupBy({
      by: ['activityId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    const activityIds = topActivitiesRaw.map((r) => r.activityId);
    const activityDetails = await prisma.activity.findMany({
      where: { id: { in: activityIds } },
      select: { id: true, name: true, category: true, cost: true },
    });

    const activityMap = new Map(activityDetails.map((a) => [a.id, a]));
    const topActivities = topActivitiesRaw
      .map((r) => {
        const detail = activityMap.get(r.activityId);
        if (!detail) return null;
        return {
          activityId: r.activityId,
          name: detail.name,
          category: detail.category,
          scheduledCount: r._count.id,
          avgCost: detail.cost,
        };
      })
      .filter(Boolean);

    // --- By category ---
    const byCategory = await prisma.stopActivity.groupBy({
      by: ['activityId'],
      _count: { id: true },
    });

    // We need activity categories — batch fetch all scheduled activity IDs
    const allActivityIds = [...new Set(byCategory.map((r) => r.activityId))];
    const allActivities = await prisma.activity.findMany({
      where: { id: { in: allActivityIds } },
      select: { id: true, category: true },
    });
    const catMap = new Map(allActivities.map((a) => [a.id, a.category]));

    const categoryTotals: Record<string, number> = {};
    for (const row of byCategory) {
      const cat = catMap.get(row.activityId) ?? 'OTHER';
      categoryTotals[cat] = (categoryTotals[cat] ?? 0) + row._count.id;
    }
    const byCategoryArr = Object.entries(categoryTotals)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    res.status(200).json(
      createResponse(true, 'Popular activities retrieved successfully', {
        topActivities,
        byCategory: byCategoryArr,
      })
    );
  } catch (error: any) {
    console.error('Error fetching popular activities:', error);
    res.status(500).json(createResponse(false, 'Failed to fetch popular activities. ' + (error.message || ''), null));
  }
};


// Paginated list of all users with per-user stats
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = String(req.query.search || '').trim();
    const roleFilter = String(req.query.role || '').toUpperCase();
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(Math.max(1, parseInt(String(req.query.limit || '20'), 10)), 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (roleFilter === 'USER' || roleFilter === 'ADMIN') {
      where.role = roleFilter;
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          city: true,
          country: true,
          profilePhoto: true,
          createdAt: true,
          _count: {
            select: {
              trips: true,
              savedDestinations: true,
            },
          },
        },
      }),
    ]);

    const userIds = users.map((u) => u.id);
    const expenseAggs = await prisma.expense.groupBy({
      by: ['tripId'],
      where: { trip: { userId: { in: userIds } } },
      _sum: { amount: true },
    });

    const trips = await prisma.trip.findMany({
      where: { userId: { in: userIds } },
      select: { id: true, userId: true },
    });
    const tripUserMap = new Map(trips.map((t) => [t.id, t.userId]));

    const userExpenseMap = new Map<string, number>();
    for (const agg of expenseAggs) {
      const userId = tripUserMap.get(agg.tripId);
      if (userId) {
        userExpenseMap.set(userId, (userExpenseMap.get(userId) ?? 0) + (agg._sum.amount ?? 0));
      }
    }

    const usersWithStats = users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      city: u.city,
      country: u.country,
      profilePhoto: u.profilePhoto,
      createdAt: u.createdAt,
      tripCount: u._count.trips,
      savedDestinationsCount: u._count.savedDestinations,
      totalExpenses: userExpenseMap.get(u.id) ?? 0,
    }));

    res.status(200).json(
      createResponse(true, 'Users retrieved successfully', {
        users: usersWithStats,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      })
    );
  } catch (error: any) {
    console.error('Error fetching admin users:', error);
    res.status(500).json(createResponse(false, 'Failed to fetch users. ' + (error.message || ''), null));
  }
};


// Promote or demote a user between USER and ADMIN roles

export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { role } = req.body;

    if (!role || !['USER', 'ADMIN'].includes(String(role).toUpperCase())) {
      res.status(400).json(createResponse(false, "Invalid role. Must be 'USER' or 'ADMIN'", null));
      return;
    }

    // Prevent admins from demoting themselves
    if (req.user && req.user.userId === id && String(role).toUpperCase() === 'USER') {
      res.status(400).json(createResponse(false, 'You cannot remove your own admin privileges', null));
      return;
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      res.status(404).json(createResponse(false, 'User not found', null));
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role: String(role).toUpperCase() as any },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    res.status(200).json(
      createResponse(true, `User role updated to ${updatedUser.role}`, { user: updatedUser })
    );
  } catch (error: any) {
    console.error('Error updating user role:', error);
    res.status(500).json(createResponse(false, 'Failed to update user role. ' + (error.message || ''), null));
  }
};



// Paginated master list of all platform trips with computed status
export const getAllTrips = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = String(req.query.search || '').trim();
    const statusFilter = String(req.query.status || '').toLowerCase();
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(Math.max(1, parseInt(String(req.query.limit || '20'), 10)), 100);
    const skip = (page - 1) * limit;

    const now = new Date();

    const where: any = {};

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    // Status filter: translate to date range conditions
    if (statusFilter === 'upcoming') {
      where.startDate = { gt: now };
    } else if (statusFilter === 'ongoing') {
      where.startDate = { lte: now };
      where.endDate = { gte: now };
    } else if (statusFilter === 'completed') {
      where.endDate = { lt: now };
    }

    const [total, trips] = await Promise.all([
      prisma.trip.count({ where }),
      prisma.trip.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          coverPhoto: true,
          startDate: true,
          endDate: true,
          isPublic: true,
          shareSlug: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profilePhoto: true,
            },
          },
          _count: {
            select: {
              stops: true,
              expenses: true,
            },
          },
        },
      }),
    ]);

    const tripsWithStatus = trips.map((t) => ({
      ...t,
      status: getTripStatus(t.startDate, t.endDate),
      stopCount: t._count.stops,
      expenseCount: t._count.expenses,
      _count: undefined,
    }));

    res.status(200).json(
      createResponse(true, 'Trips retrieved successfully', {
        trips: tripsWithStatus,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      })
    );
  } catch (error: any) {
    console.error('Error fetching admin trips:', error);
    res.status(500).json(createResponse(false, 'Failed to fetch trips. ' + (error.message || ''), null));
  }
};
