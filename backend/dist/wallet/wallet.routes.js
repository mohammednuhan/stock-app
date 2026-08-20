import { Router } from "express";
import { authMiddleware } from "../authmiddleware.js";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
const walletRouter = Router();
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
walletRouter.get('/balance/:symbol', authMiddleware, async (req, res) => {
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
walletRouter.post('/deposit', authMiddleware, async (req, res) => {
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
walletRouter.post('/withdraw', authMiddleware, async (req, res) => {
    const userId = (req.userId);
    if (!userId) {
        return res.status(404).json({
            message: "user not found"
        });
    }
    const { symbol, amount } = req.body;
    if (!symbol || amount == undefined) {
        return res.status(404).json({
            message: "symbol and amount not defined"
        });
    }
    if (amount < 0) {
        return res.status(404).json({
            message: "amount should be positive"
        });
    }
    const user = await prisma.user.findUnique({
        where: {
            id: userId
        }
    });
    const userBalance = balance[userId];
    if (!userBalance) {
        return res.status(404).json({
            message: "userbalance not found"
        });
    }
    const assetBalance = userBalance[symbol];
    if (!assetBalance) {
        return res.status(404).json({
            message: "stock not found"
        });
    }
    const withdrawAmount = Number(amount);
    if (assetBalance.available < withdrawAmount) {
        return res.status(400).json({
            message: "Insufficient available balance",
            available: assetBalance.available,
            requested: withdrawAmount
        });
    }
    assetBalance.available -= withdrawAmount;
    return res.status(200).json({
        message: "Withdraw successful",
        userId,
        symbol,
        amount: withdrawAmount,
        balance: assetBalance
    });
});
export default walletRouter;
