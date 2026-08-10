import express from 'express';
import "dotenv/config";
import jwt from 'jsonwebtoken';
import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import authMiddleware from "./authmiddleware.js";
const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL
});
const prisma = new PrismaClient({
    adapter,
});
const app = express();
app.use(express.json());
const balance = {
    1: {
        Axis: {
            locked: 10,
            available: 20
        }
    },
    HDFC: {
        locked: 20,
        available: 30,
    },
    IDFC: {
        locked: 30,
        available: 40
    }
};
app.post("/signup", async (req, res) => {
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
    const user = await prisma.user.findUnique({
        where: {
            username
        }
    });
    if (!user) {
        return res.status(403).json({
            message: "user already logged in"
        });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
        return res.status(403).json({
            message: "Wrong password"
        });
    }
    const token = jwt.sign({
        userId: user.id
    }, process.env.JWT_SECRET);
    console.log(process.env.JWT_SECRET);
    res.json({
        token: token
    });
});
app.post('/orders', authMiddleware, async (req, res) => {
    const userId = Number(req.body.userId);
    const { orderId, side, price, qty, filledQty, symbol } = req.body;
    const userBalance = balance[userId];
    if (!userBalance) {
        return res.status(404).json({
            message: "User not found"
        });
    }
    const stockBalance = userBalance[symbol];
    if (!stockBalance) {
        return res.status(404).json({
            message: "Stock not found"
        });
    }
    const totalPrice = price * qty;
    if (stockBalance.available < totalPrice) {
        return res.status(403).json({
            message: "Insufficient balance"
        });
    }
    const order = await prisma.order.create({
        data: {
            orderId,
            userId,
            price,
            qty,
            filledQty,
            side,
            symbol
        }
    });
    stockBalance.available = stockBalance.available - totalPrice;
    res.json({
        message: "Order completed successfully",
        order,
        remainingBalance: stockBalance.available
    });
});
app.get('/orders/:orderId', authMiddleware, async (req, res) => {
    const orderId = Number(req.params.orderId);
    const id = await prisma.order.findFirst({
        where: {
            id: orderId,
        }
    });
    if (!id) {
        return res.status(403).json({
            message: "order id not found"
        });
    }
    await prisma.order.findFirst({
        where: {
            orderId
        }
    });
    res.json({
        message: "your order list"
    });
});
app.delete('/orders', authMiddleware, async (req, res) => {
    const orderId = req.body.orderId;
    const order = await prisma.order.findFirst({
        where: {
            orderId
        }
    });
    if (!order) {
        return res.status(409).json({
            message: "order not found"
        });
    }
    await prisma.order.delete({
        where: {
            id: orderId
        }
    });
    res.json({
        message: "order delete succcesfully"
    });
});
app.get('/orders', async (req, res) => {
});
app.get('/balance/usd', async (req, res) => {
});
app.get('/balance', async (req, res) => {
});
app.listen(4000, () => {
    console.log("Server running on port 4000");
});
