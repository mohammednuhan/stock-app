import express,{Request ,Response} from 'express';
import "dotenv/config";
import jwt from 'jsonwebtoken'
import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt  from "bcrypt"
import authMiddleware from "./authmiddleware.js"

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!
});

const prisma = new PrismaClient({
    adapter,
})

const app = express ();
app.use(express.json());

app.post("/signup", async (req: Request, res: Response) => {

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

        const user = await prisma.user.findUnique({
            where : {
                username
            }
        })
        if(!user){
            return res.status(403).json({
                message : "user already logged in"
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
        userId: user.id
    },
    process.env.JWT_SECRET!
    );
    
    res.json ({
       token : token 
    })
})


app.post('/orders',authMiddleware,async(req : Request, res : Response)=>{
     const userId = req.body.userId
     const { id,side, price, qty,orderId,filledQty,symbol} = req.body

     const order = await prisma.order.findUnique({
        where : {
            id ,
            userId
        }
     })
    
     await prisma.order.create({
        data : {
            id ,
            orderId,
            userId,
            price,
            qty,
            filledQty,
            side,
            symbol
        
        }
     })
     res.json ({
        message : "order completed successfully",
        order

     })

})

app.get('/orders/:orderId',authMiddleware,async(req : Request, res : Response)=>{
   const orderId = Number(req.params.orderId);

    const id  = await prisma.order.findFirst({
        where : {
            id : orderId,
        }
    })
    if(!id){
        return res.status(403).json({
            message : "order id not found"
        })
    }
    await prisma.order.findFirst({
        where:{
            orderId
        }
    })

    res.json ({
        message  : "your order list"
    })

})

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