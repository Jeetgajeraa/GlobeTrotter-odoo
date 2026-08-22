import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';
import { createResponse } from '../utils/api-response.js';

const JWT_SECRET = process.env.JWT_SECRET || 'globetrotter_secret_key_2026_super_secure_jwt_token_auth';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

//registeration
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      city,
      country,
      bio,
      profilePhoto
    } = req.body;

    if (!firstName || !lastName || !email || !password) {
      res.status(400).json(createResponse(false, 'First name, last name, email, and password are required', null));
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      res.status(400).json(createResponse(false, 'Please provide a valid email address', null));
      return;
    }

    if (password.length < 6) {
      res.status(400).json(createResponse(false, 'Password must be at least 6 characters long', null));
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      res.status(409).json(createResponse(false, 'An account with this email address already exists', null));
      return;
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Determine profile photo URL (from Cloudinary upload or optional URL string in body)
    let finalProfilePhoto: string | null = null;
    if (req.file && (req.file as any).path) {
      finalProfilePhoto = (req.file as any).path;
    } else if (profilePhoto) {
      finalProfilePhoto = String(profilePhoto).trim();
    }

    const newUser = await prisma.user.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        passwordHash,
        phoneNumber: phoneNumber ? String(phoneNumber).trim() : null,
        city: city ? String(city).trim() : null,
        country: country ? String(country).trim() : null,
        bio: bio ? String(bio).trim() : null,
        profilePhoto: finalProfilePhoto,
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as any }
    );

    const { passwordHash: _, ...userWithoutPassword } = newUser;

    res.status(201).json(createResponse(true, 'User registered successfully', {
      user: userWithoutPassword,
      token
    }));
  } catch (error: any) {
    console.error('Error in user registration:', error);
    res.status(500).json(createResponse(false, 'Failed to register user. ' + (error.message || ''), null));
  }
};

//login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json(createResponse(false, 'Email and password are required', null));
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      res.status(401).json(createResponse(false, 'Invalid email or password', null));
      return;
    }


    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json(createResponse(false, 'Invalid email or password', null));
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as any }
    );

    const { passwordHash: _, ...userWithoutPassword } = user;

    res.status(200).json(createResponse(true, 'Login successful', {
      user: userWithoutPassword,
      token
    }));
  } catch (error: any) {
    console.error('Error in user login:', error);
    res.status(500).json(createResponse(false, 'Failed to log in. ' + (error.message || ''), null));
  }
};

//user detail
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.userId) {
      res.status(401).json(createResponse(false, 'Unauthorized access', null));
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user) {
      res.status(404).json(createResponse(false, 'User profile not found', null));
      return;
    }

    const { passwordHash: _, ...userWithoutPassword } = user;

    res.status(200).json(createResponse(true, 'User profile retrieved successfully', {
      user: userWithoutPassword
    }));
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    res.status(500).json(createResponse(false, 'Failed to fetch user profile', null));
  }
};

//logout
export const logout = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json(createResponse(true, 'Logout successful', null));
};
