import { INestApplication, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly maxConnectionAttempts = 5;
  private readonly initialRetryDelayMs = 500;

  async onModuleInit(): Promise<void> {
    await this.connectWithRetry();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  enableShutdownHooks(app: INestApplication): void {
    const shutdownSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];

    for (const signal of shutdownSignals) {
      process.once(signal, async () => {
        this.logger.log(`Received ${signal}, closing Nest application...`);
        await app.close();
      });
    }
  }

  withTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.$transaction((tx) => callback(tx));
  }

  private async connectWithRetry(): Promise<void> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxConnectionAttempts; attempt += 1) {
      try {
        await this.$connect();
        this.logger.log('Prisma connected to database.');
        return;
      } catch (error) {
        lastError = error;
        const delayMs = this.initialRetryDelayMs * Math.pow(2, attempt - 1);
        this.logger.warn(
          `Prisma connection attempt ${attempt}/${this.maxConnectionAttempts} failed. Retrying in ${delayMs}ms...`,
        );
        await this.sleep(delayMs);
      }
    }

    this.logger.error('Prisma failed to connect after maximum retry attempts.');
    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
