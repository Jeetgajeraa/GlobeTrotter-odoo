import { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { createResponse } from '../utils/api-response.js';
import { Role } from '../../generated/prisma/client.js';

/**
 * 1. Admin Platform Overview & User Trends Analytics (Screen 12)
 */
export const getAdminAnalytics = async (_req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();

    // 1. Overall counts
    const [
      totalUsers,
      totalTrips,
      totalStops,
      totalStopActivities,
      totalExpensesCount,
      totalCommunityPosts,
      totalCities,
      totalActivities,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.trip.count(),
      prisma.stop.count(),
      prisma.stopActivity.count(),
      prisma.expense.count(),
      prisma.communityPost.count(),
      prisma.city.count(),
      prisma.activity.count(),
    ]);

    // 2. Sum of all expenses logged on platform
    const expensesAggregation = await prisma.expense.aggregate({
      _sum: { amount: true },
    });
    const totalPlatformSpend = expensesAggregation._sum.amount || 0;

    // 3. Trip Status Distribution (Ongoing, Upcoming, Completed)
    const [ongoingTrips, upcomingTrips, completedTrips] = await Promise.all([
      prisma.trip.count({
        where: {
          startDate: { lte: now },
          endDate: { gte: now },
        },
      }),
      prisma.trip.count({
        where: {
          startDate: { gt: now },
        },
      }),
      prisma.trip.count({
        where: {
          endDate: { lt: now },
        },
      }),
    ]);

    // 4. Monthly Trip Creation Trend (Past 6 Months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const recentTrips = await prisma.trip.findMany({
      where: {
        createdAt: { gte: sixMonthsAgo },
      },
      select: { createdAt: true },
    });

    const recentUsers = await prisma.user.findMany({
      where: {
        createdAt: { gte: sixMonthsAgo },
      },
      select: { createdAt: true },
    });

    // Bucket by Month YYYY-MM
    const monthlyStatsMap: Record<string, { month: string; trips: number; newUsers: number }> = {};

    for (let i = 0; i < 6; i++) {
      const d = new Date(sixMonthsAgo);
      d.setMonth(d.getMonth() + i);
      const monthKey = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      monthlyStatsMap[monthKey] = { month: monthKey, trips: 0, newUsers: 0 };
    }

    recentTrips.forEach((t) => {
      const monthKey = t.createdAt.toLocaleString('default', { month: 'short', year: 'numeric' });
      if (monthlyStatsMap[monthKey]) {
        monthlyStatsMap[monthKey].trips += 1;
      }
    });

    recentUsers.forEach((u) => {
      const monthKey = u.createdAt.toLocaleString('default', { month: 'short', year: 'numeric' });
      if (monthlyStatsMap[monthKey]) {
        monthlyStatsMap[monthKey].newUsers += 1;
      }
    });

    const monthlyTrends = Object.values(monthlyStatsMap);

    res.status(200).json(
      createResponse(true, 'Admin analytics overview retrieved successfully', {
        summary: {
          totalUsers,
          totalTrips,
          totalStops,
          totalStopActivities,
          totalExpensesCount,
          totalPlatformSpend: Math.round(totalPlatformSpend * 100) / 100,
          totalCommunityPosts,
          totalCities,
          totalActivities,
        },
        tripStatusDistribution: {
          ongoing: ongoingTrips,
          upcoming: upcomingTrips,
          completed: completedTrips,
          total: totalTrips,
        },
        monthlyTrends,
      })
    );
  } catch (error: any) {
    console.error('Error fetching admin analytics:', error);
    res.status(500).json(createResponse(false, 'Failed to fetch admin analytics', null));
  }
};

/**
 * 2. Popular Cities / Destinations Insights (Screen 12 Tab 2)
 */
export const getAdminPopularDestinations = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit)) || 10));

    const cities = await prisma.city.findMany({
      take: limit,
      include: {
        _count: {
          select: {
            stops: true,
            savedByUsers: true,
            activities: true,
          },
        },
        stops: {
          include: {
            expenses: {
              select: { amount: true },
            },
          },
        },
      },
    });

    // Compute total spend and sort by visits (stops count + popularity)
    const rankedCities = cities
      .map((c) => {
        const totalCitySpend = c.stops.reduce((sum, stop) => {
          return sum + stop.expenses.reduce((sSum, exp) => sSum + exp.amount, 0);
        }, 0);

        return {
          id: c.id,
          name: c.name,
          country: c.country,
          region: c.region,
          costIndex: c.costIndex,
          popularity: c.popularity,
          imageUrl: c.imageUrl,
          tripsVisitedCount: c._count.stops,
          wishlistCount: c._count.savedByUsers,
          activitiesCount: c._count.activities,
          totalSpend: Math.round(totalCitySpend * 100) / 100,
        };
      })
      .sort((a, b) => b.tripsVisitedCount - a.tripsVisitedCount || b.wishlistCount - a.wishlistCount);

    res.status(200).json(
      createResponse(true, 'Popular destinations analytics retrieved successfully', rankedCities)
    );
  } catch (error: any) {
    console.error('Error fetching popular destinations for admin:', error);
    res.status(500).json(createResponse(false, 'Failed to fetch popular destinations', null));
  }
};

/**
 * 3. Popular Activities & Engagement (Screen 12 Tab 3)
 */
export const getAdminPopularActivities = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit)) || 10));

    const activities = await prisma.activity.findMany({
      take: limit,
      include: {
        city: {
          select: { name: true, country: true },
        },
        _count: {
          select: {
            stopActivities: true,
          },
        },
      },
    });

    const rankedActivities = activities
      .map((a) => ({
        id: a.id,
        cityId: a.cityId,
        name: a.name,
        description: a.description,
        category: a.category,
        cost: a.cost,
        durationMin: a.durationMin,
        imageUrl: a.imageUrl,
        cityName: a.city.name,
        country: a.city.country,
        scheduledCount: a._count.stopActivities,
      }))
      .sort((a, b) => b.scheduledCount - a.scheduledCount);

    // Grouping by Category distribution
    const categoryCounts: Record<string, number> = {};
    rankedActivities.forEach((a) => {
      categoryCounts[a.category] = (categoryCounts[a.category] || 0) + a.scheduledCount;
    });

    res.status(200).json(
      createResponse(true, 'Popular activities analytics retrieved successfully', {
        activities: rankedActivities,
        categoryDistribution: categoryCounts,
      })
    );
  } catch (error: any) {
    console.error('Error fetching popular activities for admin:', error);
    res.status(500).json(createResponse(false, 'Failed to fetch popular activities', null));
  }
};

/**
 * 4. Manage Users (Screen 12 Tab 1)
 */
export const getAdminUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, role, page = '1', limit = '20', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const pageNumber = Math.max(1, parseInt(String(page)) || 1);
    const take = Math.min(100, Math.max(1, parseInt(String(limit)) || 20));
    const skip = (pageNumber - 1) * take;

    const where: any = {};

    if (search) {
      const searchStr = String(search).trim();
      where.OR = [
        { firstName: { contains: searchStr, mode: 'insensitive' } },
        { lastName: { contains: searchStr, mode: 'insensitive' } },
        { email: { contains: searchStr, mode: 'insensitive' } },
      ];
    }

    if (role && (role === 'USER' || role === 'ADMIN')) {
      where.role = role as Role;
    }

    const validSortFields = ['createdAt', 'firstName', 'lastName', 'email'];
    const sortField = validSortFields.includes(String(sortBy)) ? String(sortBy) : 'createdAt';
    const orderDirection = String(sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { [sortField]: orderDirection },
        skip,
        take,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          city: true,
          country: true,
          bio: true,
          profilePhoto: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              trips: true,
              savedDestinations: true,
              communityPosts: true,
            },
          },
        },
      }),
    ]);

    res.status(200).json(
      createResponse(true, 'Platform users retrieved successfully', {
        users,
        pagination: {
          total,
          page: pageNumber,
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      })
    );
  } catch (error: any) {
    console.error('Error fetching users for admin:', error);
    res.status(500).json(createResponse(false, 'Failed to fetch users', null));
  }
};

/**
 * 5. Update User Role (Promote to ADMIN or revert to USER)
 */
export const updateAdminUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { role } = req.body;

    if (!role || (role !== 'USER' && role !== 'ADMIN')) {
      res.status(400).json(createResponse(false, 'Role must be either USER or ADMIN', null));
      return;
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json(createResponse(false, 'User not found', null));
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    res.status(200).json(createResponse(true, `User role updated to ${role} successfully`, updated));
  } catch (error: any) {
    console.error('Error updating user role:', error);
    res.status(500).json(createResponse(false, 'Failed to update user role', null));
  }
};

/**
 * 6. View All Platform Trips (Admin Master Trip List)
 */
export const getAdminAllTrips = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, status, page = '1', limit = '20' } = req.query;

    const pageNumber = Math.max(1, parseInt(String(page)) || 1);
    const take = Math.min(100, Math.max(1, parseInt(String(limit)) || 20));
    const skip = (pageNumber - 1) * take;

    const where: any = {};
    const now = new Date();

    if (search) {
      const searchStr = String(search).trim();
      where.OR = [
        { name: { contains: searchStr, mode: 'insensitive' } },
        { user: { firstName: { contains: searchStr, mode: 'insensitive' } } },
        { user: { email: { contains: searchStr, mode: 'insensitive' } } },
      ];
    }

    if (status === 'ongoing') {
      where.startDate = { lte: now };
      where.endDate = { gte: now };
    } else if (status === 'upcoming') {
      where.startDate = { gt: now };
    } else if (status === 'completed') {
      where.endDate = { lt: now };
    }

    const [total, trips] = await Promise.all([
      prisma.trip.count({ where }),
      prisma.trip.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
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
            },
          },
          expenses: {
            select: { amount: true },
          },
          _count: {
            select: { stops: true, expenses: true },
          },
        },
      }),
    ]);

    const formattedTrips = trips.map((trip) => {
      const totalExpense = trip.expenses.reduce((sum, exp) => sum + exp.amount, 0);
      return {
        id: trip.id,
        name: trip.name,
        startDate: trip.startDate,
        endDate: trip.endDate,
        isPublic: trip.isPublic,
        coverPhoto: trip.coverPhoto,
        createdAt: trip.createdAt,
        user: trip.user,
        stopsCount: trip.stops.length,
        cities: trip.stops.map((s) => s.city.name),
        totalExpense: Math.round(totalExpense * 100) / 100,
      };
    });

    res.status(200).json(
      createResponse(true, 'All platform trips retrieved successfully', {
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
    console.error('Error fetching all trips for admin:', error);
    res.status(500).json(createResponse(false, 'Failed to fetch platform trips', null));
  }
};
