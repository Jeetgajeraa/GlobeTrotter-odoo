import { Role } from '../../generated/prisma/client.js';

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
