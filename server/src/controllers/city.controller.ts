import { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { createResponse } from '../utils/api-response.js';

// Get all cities with search, filtering, and pagination
export const getCities = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search,
      country,
      region,
      minCost,
      maxCost,
      sortBy = 'popularity',
      sortOrder = 'desc',
      page = '1',
      limit = '20',
    } = req.query;

    const pageNumber = Math.max(1, parseInt(String(page)) || 1);
    const take = Math.min(100, Math.max(1, parseInt(String(limit)) || 20));
    const skip = (pageNumber - 1) * take;

    const where: any = {};

    if (search) {
      const searchStr = String(search).trim();
      where.OR = [
        { name: { contains: searchStr, mode: 'insensitive' } },
        { country: { contains: searchStr, mode: 'insensitive' } },
        { region: { contains: searchStr, mode: 'insensitive' } },
      ];
    }

    if (country) {
      where.country = { equals: String(country).trim(), mode: 'insensitive' };
    }

    if (region) {
      where.region = { equals: String(region).trim(), mode: 'insensitive' };
    }

    if (minCost !== undefined || maxCost !== undefined) {
      where.costIndex = {};
      if (minCost !== undefined) where.costIndex.gte = parseFloat(String(minCost));
      if (maxCost !== undefined) where.costIndex.lte = parseFloat(String(maxCost));
    }

    // Determine sorting
    const validSortFields = ['popularity', 'costIndex', 'name', 'country'];
    const sortField = validSortFields.includes(String(sortBy)) ? String(sortBy) : 'popularity';
    const orderDirection = String(sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [total, cities] = await Promise.all([
      prisma.city.count({ where }),
      prisma.city.findMany({
        where,
        orderBy: { [sortField]: orderDirection },
        skip,
        take,
        include: {
          _count: {
            select: { activities: true, stops: true },
          },
        },
      }),
    ]);

    res.status(200).json(
      createResponse(true, 'Cities retrieved successfully', {
        cities,
        pagination: {
          total,
          page: pageNumber,
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      })
    );
  } catch (error: any) {
    console.error('Error fetching cities:', error);
    res.status(500).json(createResponse(false, 'Failed to fetch cities. ' + (error.message || ''), null));
  }
};

// Get popular / recommended cities (for Landing / Dashboard)
export const getPopularCities = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(20, Math.max(1, parseInt(String(req.query.limit)) || 6));

    const cities = await prisma.city.findMany({
      orderBy: [{ popularity: 'desc' }, { name: 'asc' }],
      take: limit,
      include: {
        _count: {
          select: { activities: true },
        },
      },
    });

    res.status(200).json(createResponse(true, 'Popular cities retrieved successfully', cities));
  } catch (error: any) {
    console.error('Error fetching popular cities:', error);
    res.status(500).json(createResponse(false, 'Failed to fetch popular cities', null));
  }
};

// Get single city by ID with activities
export const getCityById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.userId;

    const city = await prisma.city.findUnique({
      where: { id },
      include: {
        activities: {
          orderBy: { cost: 'asc' },
        },
        _count: {
          select: { savedByUsers: true, stops: true },
        },
      },
    });

    if (!city) {
      res.status(404).json(createResponse(false, 'City not found', null));
      return;
    }

    let isSavedByUser = false;
    if (userId) {
      const saved = await prisma.savedDestination.findUnique({
        where: {
          userId_cityId: {
            userId,
            cityId: id,
          },
        },
      });
      isSavedByUser = !!saved;
    }

    res.status(200).json(
      createResponse(true, 'City retrieved successfully', {
        ...city,
        isSavedByUser,
      })
    );
  } catch (error: any) {
    console.error('Error fetching city details:', error);
    res.status(500).json(createResponse(false, 'Failed to fetch city details', null));
  }
};

// Create a new city (Admin / Manager)
export const createCity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, country, region, costIndex, popularity, imageUrl } = req.body;

    if (!name || !country) {
      res.status(400).json(createResponse(false, 'City name and country are required', null));
      return;
    }

    // Photo uploaded via Cloudinary or URL
    let finalImageUrl: string | null = null;
    if (req.file && (req.file as any).path) {
      finalImageUrl = (req.file as any).path;
    } else if (imageUrl) {
      finalImageUrl = String(imageUrl).trim();
    }

    const city = await prisma.city.create({
      data: {
        name: String(name).trim(),
        country: String(country).trim(),
        region: region ? String(region).trim() : null,
        costIndex: costIndex ? parseFloat(String(costIndex)) : 50.0,
        popularity: popularity ? parseInt(String(popularity)) : 0,
        imageUrl: finalImageUrl,
      },
    });

    res.status(201).json(createResponse(true, 'City created successfully', city));
  } catch (error: any) {
    console.error('Error creating city:', error);
    if (error.code === 'P2002') {
      res.status(409).json(createResponse(false, 'A city with this name in this country already exists', null));
      return;
    }
    res.status(500).json(createResponse(false, 'Failed to create city. ' + (error.message || ''), null));
  }
};

// Update city
export const updateCity = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, country, region, costIndex, popularity, imageUrl } = req.body;

    const existing = await prisma.city.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json(createResponse(false, 'City not found', null));
      return;
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (country !== undefined) updateData.country = String(country).trim();
    if (region !== undefined) updateData.region = region ? String(region).trim() : null;
    if (costIndex !== undefined) updateData.costIndex = parseFloat(String(costIndex));
    if (popularity !== undefined) updateData.popularity = parseInt(String(popularity));

    if (req.file && (req.file as any).path) {
      updateData.imageUrl = (req.file as any).path;
    } else if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl ? String(imageUrl).trim() : null;
    }

    const updated = await prisma.city.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json(createResponse(true, 'City updated successfully', updated));
  } catch (error: any) {
    console.error('Error updating city:', error);
    res.status(500).json(createResponse(false, 'Failed to update city. ' + (error.message || ''), null));
  }
};

// Delete city
export const deleteCity = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.city.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json(createResponse(false, 'City not found', null));
      return;
    }

    await prisma.city.delete({ where: { id } });

    res.status(200).json(createResponse(true, 'City deleted successfully', null));
  } catch (error: any) {
    console.error('Error deleting city:', error);
    res.status(500).json(createResponse(false, 'Failed to delete city. ' + (error.message || ''), null));
  }
};
