import { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { createResponse } from '../utils/api-response.js';
import { ActivityCategory } from '../../generated/prisma/enums.js';

// Get activities with filters
export const getActivities = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      cityId,
      search,
      category,
      minCost,
      maxCost,
      maxDuration,
      sortBy = 'cost',
      sortOrder = 'asc',
      page = '1',
      limit = '30',
    } = req.query;

    const pageNumber = Math.max(1, parseInt(String(page)) || 1);
    const take = Math.min(100, Math.max(1, parseInt(String(limit)) || 30));
    const skip = (pageNumber - 1) * take;

    const where: any = {};

    if (cityId) {
      where.cityId = String(cityId);
    }

    if (search) {
      const searchStr = String(search).trim();
      where.OR = [
        { name: { contains: searchStr, mode: 'insensitive' } },
        { description: { contains: searchStr, mode: 'insensitive' } },
      ];
    }

    if (category) {
      const cat = String(category).toUpperCase();
      if (Object.values(ActivityCategory).includes(cat as any)) {
        where.category = cat as ActivityCategory;
      }
    }

    if (minCost !== undefined || maxCost !== undefined) {
      where.cost = {};
      if (minCost !== undefined) where.cost.gte = parseFloat(String(minCost));
      if (maxCost !== undefined) where.cost.lte = parseFloat(String(maxCost));
    }

    if (maxDuration !== undefined) {
      where.durationMin = { lte: parseInt(String(maxDuration)) };
    }

    const validSortFields = ['cost', 'durationMin', 'name'];
    const sortField = validSortFields.includes(String(sortBy)) ? String(sortBy) : 'cost';
    const orderDirection = String(sortOrder).toLowerCase() === 'desc' ? 'desc' : 'asc';

    const [total, activities] = await Promise.all([
      prisma.activity.count({ where }),
      prisma.activity.findMany({
        where,
        orderBy: { [sortField]: orderDirection },
        skip,
        take,
        include: {
          city: {
            select: { id: true, name: true, country: true },
          },
        },
      }),
    ]);

    res.status(200).json(
      createResponse(true, 'Activities retrieved successfully', {
        activities,
        pagination: {
          total,
          page: pageNumber,
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      })
    );
  } catch (error: any) {
    console.error('Error fetching activities:', error);
    res.status(500).json(createResponse(false, 'Failed to fetch activities. ' + (error.message || ''), null));
  }
};

// Get single activity
export const getActivityById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const activity = await prisma.activity.findUnique({
      where: { id },
      include: {
        city: true,
      },
    });

    if (!activity) {
      res.status(404).json(createResponse(false, 'Activity not found', null));
      return;
    }

    res.status(200).json(createResponse(true, 'Activity retrieved successfully', activity));
  } catch (error: any) {
    console.error('Error fetching activity:', error);
    res.status(500).json(createResponse(false, 'Failed to fetch activity', null));
  }
};

// Create activity
export const createActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cityId, name, description, category, cost, durationMin, imageUrl } = req.body;

    if (!cityId || !name || durationMin === undefined) {
      res.status(400).json(createResponse(false, 'cityId, name, and durationMin are required', null));
      return;
    }

    // Check if city exists
    const city = await prisma.city.findUnique({ where: { id: cityId } });
    if (!city) {
      res.status(404).json(createResponse(false, 'Target city does not exist', null));
      return;
    }

    let finalImageUrl: string | null = null;
    if (req.file && (req.file as any).path) {
      finalImageUrl = (req.file as any).path;
    } else if (imageUrl) {
      finalImageUrl = String(imageUrl).trim();
    }

    const activity = await prisma.activity.create({
      data: {
        cityId,
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        category: (category as ActivityCategory) || ActivityCategory.OTHER,
        cost: cost ? parseFloat(String(cost)) : 0,
        durationMin: parseInt(String(durationMin)),
        imageUrl: finalImageUrl,
      },
      include: {
        city: true,
      },
    });

    res.status(201).json(createResponse(true, 'Activity created successfully', activity));
  } catch (error: any) {
    console.error('Error creating activity:', error);
    res.status(500).json(createResponse(false, 'Failed to create activity. ' + (error.message || ''), null));
  }
};

// Update activity
export const updateActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, description, category, cost, durationMin, imageUrl } = req.body;

    const existing = await prisma.activity.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json(createResponse(false, 'Activity not found', null));
      return;
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (description !== undefined) updateData.description = description ? String(description).trim() : null;
    if (category !== undefined) updateData.category = category as ActivityCategory;
    if (cost !== undefined) updateData.cost = parseFloat(String(cost));
    if (durationMin !== undefined) updateData.durationMin = parseInt(String(durationMin));

    if (req.file && (req.file as any).path) {
      updateData.imageUrl = (req.file as any).path;
    } else if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl ? String(imageUrl).trim() : null;
    }

    const updated = await prisma.activity.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json(createResponse(true, 'Activity updated successfully', updated));
  } catch (error: any) {
    console.error('Error updating activity:', error);
    res.status(500).json(createResponse(false, 'Failed to update activity. ' + (error.message || ''), null));
  }
};

// Delete activity
export const deleteActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.activity.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json(createResponse(false, 'Activity not found', null));
      return;
    }

    await prisma.activity.delete({ where: { id } });

    res.status(200).json(createResponse(true, 'Activity deleted successfully', null));
  } catch (error: any) {
    console.error('Error deleting activity:', error);
    res.status(500).json(createResponse(false, 'Failed to delete activity. ' + (error.message || ''), null));
  }
};
