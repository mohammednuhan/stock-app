import dotenv from "dotenv";

dotenv.config();

import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const SECRET_KEY = process.env.SECRET_KEY as string;

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
  } 
  else {
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Token is missing",
      });
    } 

    else {
      try { 
        console.log("AUTH HEADER:", authHeader);
        console.log("TOKEN:", token);
        const decoded = jwt.verify(
          token,
          SECRET_KEY
        ) as JwtPayload & {
          userId: number;
        };

      console.log("DECODED JWT:", decoded);
      console.log("JWT USER ID:", decoded.userId);

      if (!decoded.userId) {
        return res.status(403).json({
         message: "User ID is missing",
  });
}

        if (!decoded.userId) {
          return res.status(403).json({
            message: "User ID is missing",
          });
        } 
        else {
          (req as any).userId = decoded.userId;

          next();
        }

      } catch (error) {
        console.log("JWT ERROR:", error);

        return res.status(403).json({
          message: "Invalid or expired token",
        });
      }
    }
  }
}

export default authMiddleware;