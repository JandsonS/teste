-- CreateTable
CREATE TABLE "Agendamento" (
    "id" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "telefone" TEXT,
    "servico" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "horario" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "valor" DOUBLE PRECISION NOT NULL,
    "paymentId" TEXT,
    "metodoPagamento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agendamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuracao" (
    "id" TEXT NOT NULL DEFAULT 'settings',
    "porcentagemSinal" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "precoServico" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "horarioAbertura" TEXT NOT NULL DEFAULT '08:00',
    "horarioFechamento" TEXT NOT NULL DEFAULT '20:00',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuracao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
