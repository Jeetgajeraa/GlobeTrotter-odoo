import { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { createResponse } from '../utils/api-response.js';

/**
 * Create a new community post (Screen 10)
 * Supports optional photo upload via Cloudinary & optional trip link
 */
export const createPost = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json(createResponse(false, 'Unauthorized access', null));
      return;
    }

    const { title, content, tripId, imageUrl } = req.body;

    if (!title || !content) {
      res.status(400).json(createResponse(false, 'Post title and content are required', null));
      return;
    }

    // Verify trip exists if linked
    if (tripId) {
      const trip = await prisma.trip.findUnique({ where: { id: tripId } });
      if (!trip) {
        res.status(404).json(createResponse(false, 'Linked trip not found', null));
        return;
      }
    }

    // Photo from Cloudinary upload or optional URL string
    let finalImageUrl: string | null = null;
    if (req.file && (req.file as any).path) {
      finalImageUrl = (req.file as any).path;
    } else if (imageUrl) {
      finalImageUrl = String(imageUrl).trim();
    }

    const post = await prisma.communityPost.create({
      data: {
        userId,
        tripId: tripId || null,
        title: String(title).trim(),
        content: String(content).trim(),
        imageUrl: finalImageUrl,
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
        trip: {
          select: {
            id: true,
            name: true,
            coverPhoto: true,
            shareSlug: true,
            isPublic: true,
          },
        },
      },
    });

    res.status(201).json(createResponse(true, 'Community post shared successfully', post));
  } catch (error: any) {
    console.error('Error creating community post:', error);
    res.status(500).json(createResponse(false, 'Failed to create post. ' + (error.message || ''), null));
  }
};

/**
 * Get community feed posts (Screen 10)
 * Supports search, filter by trip, sorting (latest or popular), and pagination
 */
export const getPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search,
      tripId,
      userId,
      hasImage,
      hasTrip,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = '1',
      limit = '15',
    } = req.query;

    const pageNumber = Math.max(1, parseInt(String(page)) || 1);
    const take = Math.min(50, Math.max(1, parseInt(String(limit)) || 15));
    const skip = (pageNumber - 1) * take;

    const where: any = {};

    if (search) {
      const searchStr = String(search).trim();
      where.OR = [
        { title: { contains: searchStr, mode: 'insensitive' } },
        { content: { contains: searchStr, mode: 'insensitive' } },
        { user: { firstName: { contains: searchStr, mode: 'insensitive' } } },
        { user: { lastName: { contains: searchStr, mode: 'insensitive' } } },
      ];
    }

    if (userId) {
      where.userId = String(userId);
    }

    if (tripId) {
      where.tripId = String(tripId);
    }

    if (hasImage === 'true') {
      where.imageUrl = { not: null };
    }

    if (hasTrip === 'true') {
      where.tripId = { not: null };
    }

    const validSortFields = ['createdAt', 'updatedAt', 'likeCount', 'title'];
    const sortField = validSortFields.includes(String(sortBy)) ? String(sortBy) : 'createdAt';
    const orderDirection = String(sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [total, posts] = await Promise.all([
      prisma.communityPost.count({ where }),
      prisma.communityPost.findMany({
        where,
        orderBy: { [sortField]: orderDirection },
        skip,
        take,
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
          trip: {
            select: {
              id: true,
              name: true,
              coverPhoto: true,
              shareSlug: true,
              isPublic: true,
            },
          },
        },
      }),
    ]);

    res.status(200).json(
      createResponse(true, 'Community posts retrieved successfully', {
        posts,
        pagination: {
          total,
          page: pageNumber,
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      })
    );
  } catch (error: any) {
    console.error('Error fetching community posts:', error);
    res.status(500).json(createResponse(false, 'Failed to fetch community posts', null));
  }
};

/**
 * Get single community post by ID
 */
export const getPostById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const post = await prisma.communityPost.findUnique({
      where: { id },
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
        trip: {
          include: {
            stops: {
              orderBy: { order: 'asc' },
              include: { city: true },
            },
          },
        },
      },
    });

    if (!post) {
      res.status(404).json(createResponse(false, 'Community post not found', null));
      return;
    }

    res.status(200).json(createResponse(true, 'Community post retrieved successfully', post));
  } catch (error: any) {
    console.error('Error fetching community post:', error);
    res.status(500).json(createResponse(false, 'Failed to fetch community post', null));
  }
};

/**
 * Like a post
 */
export const likePost = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const post = await prisma.communityPost.findUnique({ where: { id } });
    if (!post) {
      res.status(404).json(createResponse(false, 'Post not found', null));
      return;
    }

    const updated = await prisma.communityPost.update({
      where: { id },
      data: {
        likeCount: { increment: 1 },
      },
    });

    res.status(200).json(
      createResponse(true, 'Post liked', {
        id: updated.id,
        likeCount: updated.likeCount,
      })
    );
  } catch (error: any) {
    console.error('Error liking post:', error);
    res.status(500).json(createResponse(false, 'Failed to like post', null));
  }
};

/**
 * Unlike a post
 */
export const unlikePost = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const post = await prisma.communityPost.findUnique({ where: { id } });
    if (!post) {
      res.status(404).json(createResponse(false, 'Post not found', null));
      return;
    }

    const updated = await prisma.communityPost.update({
      where: { id },
      data: {
        likeCount: Math.max(0, post.likeCount - 1),
      },
    });

    res.status(200).json(
      createResponse(true, 'Post unliked', {
        id: updated.id,
        likeCount: updated.likeCount,
      })
    );
  } catch (error: any) {
    console.error('Error unliking post:', error);
    res.status(500).json(createResponse(false, 'Failed to unlike post', null));
  }
};

/**
 * Update community post (owner or ADMIN)
 */
export const updatePost = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const id = req.params.id as string;

    if (!userId) {
      res.status(401).json(createResponse(false, 'Unauthorized access', null));
      return;
    }

    const existingPost = await prisma.communityPost.findUnique({ where: { id } });
    if (!existingPost) {
      res.status(404).json(createResponse(false, 'Post not found', null));
      return;
    }

    if (existingPost.userId !== userId && userRole !== 'ADMIN') {
      res.status(403).json(createResponse(false, 'You can only edit your own posts', null));
      return;
    }

    const { title, content, tripId, imageUrl } = req.body;
    const updateData: any = {};

    if (title !== undefined) updateData.title = String(title).trim();
    if (content !== undefined) updateData.content = String(content).trim();
    if (tripId !== undefined) updateData.tripId = tripId || null;

    if (req.file && (req.file as any).path) {
      updateData.imageUrl = (req.file as any).path;
    } else if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl ? String(imageUrl).trim() : null;
    }

    const updated = await prisma.communityPost.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, profilePhoto: true },
        },
      },
    });

    res.status(200).json(createResponse(true, 'Post updated successfully', updated));
  } catch (error: any) {
    console.error('Error updating community post:', error);
    res.status(500).json(createResponse(false, 'Failed to update post. ' + (error.message || ''), null));
  }
};

/**
 * Delete community post (owner or ADMIN)
 */
export const deletePost = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const id = req.params.id as string;

    if (!userId) {
      res.status(401).json(createResponse(false, 'Unauthorized access', null));
      return;
    }

    const existingPost = await prisma.communityPost.findUnique({ where: { id } });
    if (!existingPost) {
      res.status(404).json(createResponse(false, 'Post not found', null));
      return;
    }

    if (existingPost.userId !== userId && userRole !== 'ADMIN') {
      res.status(403).json(createResponse(false, 'You can only delete your own posts', null));
      return;
    }

    await prisma.communityPost.delete({ where: { id } });

    res.status(200).json(createResponse(true, 'Post deleted successfully', null));
  } catch (error: any) {
    console.error('Error deleting community post:', error);
    res.status(500).json(createResponse(false, 'Failed to delete post', null));
  }
};
