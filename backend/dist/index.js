import dotenv from "dotenv";
dotenv.config();
import express from 'express';
import { randomUUID } from "crypto";
import jwt from 'jsonwebtoken';
import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import cors from "cors";
import authMiddleware from "./authmiddleware.js";
const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL
});
const prisma = new PrismaClient({
    adapter,
});
const balance = {
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
    },
    7: {
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
const app = express();
app.use(express.json());
app.use(cors());
app.post("/signup", async (req, res) => {
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
app.post('/signin', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(403).json({
            message: "user already logged in"
        });
    }
    const user = await prisma.user.findUnique({
        where: {
            username: username
        }
    });
    if (!user) {
        return res.status(403).json({
            message: "invalid username and password"
        });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
        return res.status(403).json({
            message: "Wrong password"
        });
    }
    const token = jwt.sign({
        userId: user.id,
        username: user.username,
    }, process.env.SECRET_KEY, {
        expiresIn: "1h",
        jwtid: randomUUID(),
    });
    return res.status(200).json({
        message: "Signin successful",
        token: token,
        user: {
            id: user.id,
            username: user.username
        }
    });
});
app.post("/orders", authMiddleware, async (req, res) => {
    const userId = (req.userId);
    const { orderId, side, price, qty, filledQty, symbol, type } = req.body;
    if (!orderId || !side || !price || !qty || !symbol) {
        return res.status(400).json({
            message: "orderId, side, price, qty and symbol are required"
        });
    }
    // two side
    if (side !== "BUY" && side !== "SELL") {
        return res.status(400).json({
            message: "side must be buy or sell"
        });
    }
    //first side to buy
    if (type != "LIMIT") {
        return res.status(403).json({
            message: "you cannot buy the stock"
        });
    }
    if (price < 0) {
        return res.status(403).json({
            message: " price is not available"
        });
    }
    if (qty < 0) {
        return res.status(403).json({
            message: " price is not available"
        });
    }
    // checking user available
    const user = await prisma.user.findUnique({
        where: {
            id: userId
        }
    });
    if (!user) {
        return res.status(403).json({
            message: "user not found"
        });
    }
    //checking order is available
    // userbalance checking
    const userBalance = balance[userId];
    if (!userBalance) {
        return res.status(403).json({
            message: "balance is not there"
        });
    }
    const requiredAmount = price * qty;
    if (type === "LIMIT") {
        if (side === "BUY") {
            const inrBalance = userBalance.INR;
            if (!inrBalance) {
                return res.status(404).json({
                    message: "INR Balance not found"
                });
            }
            if (inrBalance.available < requiredAmount) {
                return res.status(402).json({
                    message: `You have insuffient balance short by ${requiredAmount - inrBalance.available}`
                });
            }
            inrBalance.available -= requiredAmount;
            inrBalance.locked += requiredAmount;
        }
        //selling side
        if (side === "SELL") {
            const orderBalance = userBalance[symbol];
            if (!orderBalance) {
                return res.status(403).json({
                    message: "orders not available"
                });
            }
            orderBalance.available -= qty;
            orderBalance.locked += qty;
        }
        const order = await prisma.order.create({
            data: {
                userId,
                orderId,
                qty,
                symbol,
                filledQty: filledQty ?? 0,
                price,
                side,
                type: "LIMIT",
                status: "OPEN",
            }
        });
        res.status(200).json({
            message: "order is created succesfully"
        });
    }
    //ORDER BOOK FIRST THE PRICE SHOULD MATCH
    //TWO SIDE BUY AND SELL [WHO HAVE THE HIGHEST -> FIRST PRIOTRITY,FOR SELL LOWEST PRICE -> FIRST ]
    //FINDING THE BEST PRICE TO BUY AND SELL 
    //FIXING THE PRICE AT WHAT PRICE TO BUY AND SELL 
    // WHILE BUY THE QUATITY OF BUYING WAITING THE REQUIRED QUATIY IS FULL 
    // ORDER STATUS IS FULL FILLED OR NOT 
    // BUY IS IN INR,STOCK ARE IN SYMBOLS
    //WAIT TILL THE ORDER IS FULL SILLED
    //CANCEL ORDERS
});
app.get("/orderlist", authMiddleware, async (req, res) => {
    try {
        const userId = Number(req.userId);
        if (!userId) {
            return res.status(401).json({
                message: "User not authenticated"
            });
        }
        else {
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
            }
            else {
                if (orders.length === 0) {
                    return res.status(404).json({
                        message: "No orders found"
                    });
                }
                else {
                    return res.status(200).json({
                        message: "Your order list",
                        orders: orders
                    });
                }
            }
        }
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
});
// some error are there
app.delete('/orders', authMiddleware, async (req, res) => {
    const orderId = req.body.orderId;
    if (!orderId) {
        return res.status(404).json({
            message: "orderid not found"
        });
    }
    const order = await prisma.order.findFirst({
        where: {
            id: orderId
        }
    });
    if (!order) {
        return res.status(409).json({
            message: "order not found"
        });
    }
    await prisma.order.delete({
        where: {
            id: orderId.id
        }
    });
    return res.status(204).json({
        message: "order delete succcesfully"
    });
});
app.get('/orders', authMiddleware, async (req, res) => {
    const userId = (req.userId);
    if (!userId) {
        return res.status(403).json({
            message: "user is invalid"
        });
    }
    await prisma.user.findUnique({
        where: {
            id: userId
        }
    });
    const order = await prisma.order.findMany({
        where: {
            userId: userId
        }
    });
    if (!order) {
        return res.status(403).json({
            message: "order not found"
        });
    }
    return res.status(203).json({
        message: "this is the order list",
        order
    });
});
app.get('/balance/usd', async (req, res) => {
});
app.get('/balance/:symbol', authMiddleware, async (req, res) => {
    const userId = req.body.userId;
    if (!userId) {
        return res.status(403).json({
            message: "user is invalid"
        });
    }
    const userBalance = balance[userId];
    if (!userBalance) {
        return res.status(404).json({
            message: "users balance is not there"
        });
    }
    return res.status(200).json({
        message: "User balance",
        userId,
        balance: userBalance
    });
});
app.post('/deposit', authMiddleware, async (req, res) => {
    const userId = (req.userId);
    const { symbol, amount } = req.body;
    if (!userId) {
        return res.status(404).json({
            message: "user not found"
        });
    }
    if (!symbol || !amount) {
        return res.status(404).json({
            message: "symbol and amount not defined"
        });
    }
    if (amount < 0) {
        return res.status(404).json({
            message: "amount not found"
        });
    }
    const user = await prisma.user.findUnique({
        where: {
            id: userId
        }
    });
    if (!user) {
        return res.status(404).json({
            message: "user not found"
        });
    }
    const userBalance = balance[userId];
    if (!userBalance) {
        return res.status(404).json({
            message: "balance not found"
        });
    }
    const assetBalance = userBalance[symbol];
    if (!assetBalance) {
        return res.status(404).json({
            message: "asset balance not available"
        });
    }
    assetBalance.available += Number(amount);
    return res.status(200).json({
        message: "Deposit successful",
        userId: userId,
        symbol: symbol,
        depositedAmount: Number(amount),
        balance: assetBalance
    });
});
app.post('/withdraw', authMiddleware, async (req, res) => {
});
app.listen(4000, () => {
    console.log("Server running on port 4000");
});
