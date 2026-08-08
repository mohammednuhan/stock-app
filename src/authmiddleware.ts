import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const SECRET_KEY = process.env.JWT_SECRET as string;

function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "Authorization token is required",
    });
  } else {
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Token is missing",
      });
    } else {
      const decoded = jwt.verify(token, SECRET_KEY) as JwtPayload & {
        userId: string;
      };

      if (!decoded.userId) {
        return res.status(403).json({
          message: "User ID is missing",
        });
      } else {
        (req as any).userId = decoded.userId;

        next();
      }
    }
  }
}

export default authMiddleware;