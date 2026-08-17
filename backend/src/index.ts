import dotenv from "dotenv";
dotenv.config();
import express,{Request ,Response} from 'express';
import { randomUUID } from "crypto";
import jwt from 'jsonwebtoken'
import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt  from "bcrypt"
import cors from "cors"
import authMiddleware from "./authmiddleware.js"
import { availableParallelism } from "os";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!
});

const prisma = new PrismaClient({
    adapter,
})



//in memory data

type status= {
  LIMIT : String,
  SELL : String,
  BUY : String
}
type Balance = {
  locked: number;
  available: number;
};

type UserBalance = {
  Axis: Balance;
  HDFC: Balance;
  IDFC: Balance;
};

const balance: {
  [userId: number]: {
    [symbol: string]: {
      locked: number;
      available: number;
    };
  };
} = {
  1: {
    Axis: {
      locked: 10,
      available: 20
    },
    HDFC: {
      locked: 20,
      available: 30
    },
    INR: {
      locked: 30,
      available: 40
    }
  },

  2: {
    Axis: {
      locked: 10,
      available: 20
    },
    HDFC: {
      locked: 20,
      available: 30
    },
    INR: {
      locked: 30,
      available: 100
    }
  }
};

const app = express ();
app.use(express.json());
app.use(cors());


app.post("/signup", async (req: Request, res: Response) => {
   console.log("REQUEST BODY:", req.body);

  if (!req.body) {
    return res.status(400).json({
      message: "Request body is missing",
    });
  }
  

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
});


app.post('/signin',async(req : Request ,res : Response )=>{
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

app.post("/orders",authMiddleware,async (req: Request, res: Response) => {
      const userId = Number((req as any).userId);

    const {
        orderId,
        side,
        price,
        qty,
        filledQty,
        symbol,
        type
      } = req.body;

      if (!orderId || !side || !price || !qty || !symbol) {
        return res.status(400).json({
          message: "orderId, side, price, qty and symbol are required"
        });
      }
      
      // two side
      if(side != "LIMIT" || side != "MARKET"){
        return res.status(203).json({
          message : "you can sell or buy stock"
        })
      }

      //first side to buy
      if (type != "LIMIT"){
        return res.status(403).json({
          message : "you cannot buy the stock"
        })
      }

      if(price * qty < 0){
        return res.status(403).json({
          message : "insucfficient balance"
        })
      }


      // checking user available
      const user = await prisma.user.findUnique({
        where : {
          id : userId
        }
      })

      if(!user){
        return res.status(403).json({
          message : "user not found"
        })
      }

      //checking order is available
      const order = await prisma.orderId.findUnique({
        where : {
           symbol : symbol
        }
      })

      if(!order){
        return res.status(403).json({
          message : "order not found"
        })
      }

      // userbalance checking
    const userBalance = balance[userId]

      if(!userBalance){
        return res.status(403).json({
          message : "balance is not there"
        })
      }

      if(type === "LIMIT") {

        if (side === "BUY") {
            const inrBalance = userBalance.INR

            if(!inrBalance) {
                return res.status(404).json({
                    message: "INR Balance not found"
                })
            }

            const requiredAmount = qty * price

            if(inrBalance.available < requiredAmount) {
                return res.status(402).json({
                    message: `You have insuffient balance short by ${requiredAmount - inrBalance.available}`
                })
            }

            inrBalance.available -= requiredAmount
            inrBalance.locked += requiredAmount
        }
        res.json({
          message : "order is completed"
        }) 
      }

      //selling side
      if (type != "SELL"){

        const orderBalance = userBalance[symbol]

        if(!orderBalance){
          return res.json(403).json({
            message : "orders not available"
          })
        }
        orderBalance.available -=symbol
        orderBalance.locked += qty
      }

      const order = await prisma.order.create({
        data : 
        {
            userId : userId,
            orderId : orderId,
            qty ,
            filledQty,
            price,
            side,
            type,

        }
      })

      res.json({
        message : "order is sell succesfully"
      })
})
    

app.get("/orderlist",authMiddleware,async (req: Request, res: Response) => {
    try {
      const userId = Number((req as any).userId);

      if (!userId) {
        return res.status(401).json({
          message: "User not authenticated"
        });
      } else {
        const orders = await prisma.order.findMany({
          where: {
            userId: userId
          },
          orderBy: {
            createdAt: "desc"
          }
        });

        if (!orders) {
          return res.status(404).json({
            message: "Orders not found"
          });
        } else {
          if (orders.length === 0) {
            return res.status(404).json({
              message: "No orders found"
            });
          } else {
            return res.status(200).json({
              message: "Your order list",
              orders: orders
            });
          }
        }
      }

    } catch (error) {
      console.log(error);

      return res.status(500).json({
        message: "Internal server error"
      });
    }
  }
);

app.delete('/orders',authMiddleware,async(req : Request, res : Response)=>{
    const orderId = req.body.orderId

    const order = await prisma.order.findFirst ({
        where : {
            orderId 
        }
    })
    if(!order) {
        return res.status(409).json({
            message : "order not found"
        })
    }
    await prisma.order.delete({
         where: {
            id : orderId 
        }
    })
    res.json ({
        message : "order delete succcesfully"
    })
    
})

app.get('/orders',async(req : Request, res : Response)=>{

})

app.get('/balance/usd',async(req : Request, res : Response)=>{

})


app.get('/balance',async(req : Request, res : Response)=>{

})



app.listen(4000, () => {
  console.log("Server running on port 4000");
});