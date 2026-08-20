import { Router } from "express";
import { authMiddleware } from "../authmiddleware.js";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({
    connectionString,
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
            locked: 500,
            available: 2000
        }
    }
};
const orderRouter = Router();
orderRouter.post("/orders", authMiddleware, async (req, res) => {
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
orderRouter.get("/orderlist", authMiddleware, async (req, res) => {
    const userId = (req.userId);
    if (!userId) {
        return res.status(404).json({
            message: "user not found"
        });
    }
    const order = await prisma.order.findMany({
        where: {
            userId: userId
        }
    });
    if (order.length == 0) {
        return res.status(403).json({
            message: "order not found"
        });
    }
    res.status(200).json({
        message: "order list",
        order: "orders"
    });
});
// some error are there
orderRouter.delete('/orders', authMiddleware, async (req, res) => {
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
orderRouter.get('/orders', authMiddleware, async (req, res) => {
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
export default orderRouter;
