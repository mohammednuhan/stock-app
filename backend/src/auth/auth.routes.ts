import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import "dotenv/config";
import { randomUUID } from "crypto";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";


const connectionString = process.env.DATABASE_URL!;

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});


const authRouter = Router();


authRouter.post("/signup", async (req: Request, res: Response) => {

  try {
    const { username, password } = req.body;

    const userExist = await prisma.user.findFirst({
      where: {
        username,
      },
    });

    if (userExist) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        username,
        password: hashPassword,
      },
    });

    res.json({
      message: "User created successfully",
    });

  } catch (error) {
    console.error("PRISMA ERROR:", error);

    return res.status(500).json({
      message: "Something went wrong",
      error: error instanceof Error ? error.message : error,
    });
  }
});


authRouter.post('/signin',async(req : Request ,res : Response )=>{
        const { username , password } = req.body

        if(!username || !password){
            return res.status(403).json({
                message : "user already logged in"
            })
        }
         const user = await prisma.user.findUnique({
            where : {
                username : username
            }
        })
        if (!user){
          return res.status(403).json({
            message  : "invalid username and password"
          })
        }

       const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(403).json({
        message: "Wrong password"
      });
    }


 const token = jwt.sign(
  {
    userId: user.id,
    username: user.username,
  },
  process.env.SECRET_KEY as string,
  {
    expiresIn: "1h",
    jwtid: randomUUID(),
  }
);
    return res.status(200).json({
      message: "Signin successful",
      token: token,
      user: {
        id: user.id,
        username: user.username
      }
    });
})

export default authRouter