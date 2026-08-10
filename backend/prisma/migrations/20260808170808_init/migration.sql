-- CreateTable
CREATE TABLE "Stocks" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "side" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "stockId" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "originald" INTEGER NOT NULL,
    "createAt" INTEGER NOT NULL,

    CONSTRAINT "Stocks_pkey" PRIMARY KEY ("id")
);
