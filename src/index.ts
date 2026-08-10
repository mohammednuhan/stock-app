import express,{Request ,Response} from 'express';
import jwt from 'jsonwebtoken'
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt  from "bcrypt"
import authMiddleware from "./authmiddleware"

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!
});

const prisma = new PrismaClient({
    adapter,
})

const app = express ();
app.use(express.json());

app.post('/signup',async(req : Request, res: Response )=>{
    const { username ,password }= req.body

    const userExist= await prisma.user.findUnique({
        where : {
            username 
        }
    })
    if(userExist){
        return res.status(409).json({
            message : "user already exist"
        })
    }
    const hashPassword = await bcrypt.hash(password,20)


    await prisma.user.create ({
        where : {
        username ,
        password : hashPassword
        }
    })

    res.json ({
        message : "user created successfully"
    })
})


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
     const { symbol, side, price, qty, type } = req.body

     const order = await prisma.order.findUnique({
        where : {
            userId
        }
     })
    
     await prisma.order.create({
        data : {
            userId : userId,
            order : order,
            symbol ,
            side,
            price,
            qty,
            type
        }
     })
     res.json ({
        message : "order completed successfully",
        order

     })

})

app.get('/orders/orderId',authMiddleware,async(req : Request, res : Response)=>{
    const userId = req.body.userId;
   const orderId = Number(req.params.orderId);

    const id  = await prisma.order.findFirst({
        where : {
            id : orderId,
            userId : userId
        }
    })
    if(!orderId){
        return res.status(403).json({
            message : "order id not found"
        })
    }
    await prisma.orderId.create({
        data : {
            id ,
            orderId
        }
    })
    res.json ({
        message  : "order id recorded"
    })

})

app.delete('/orders',async(req : Request, res : Response)=>{
    
})

app.get('/orders',async(req : Request, res : Response)=>{

})

app.get('/balance/usd',async(req : Request, res : Response)=>{

})


app.get('/balance',async(req : Request, res : Response)=>{

})




app.listen (3000);