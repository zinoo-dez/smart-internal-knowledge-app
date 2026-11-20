import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { IngestionJobData, IngestionProcessor } from './ingestion.processor';

@Injectable()
export class IngestionQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IngestionQueueService.name);
  private readonly QUEUE_NAME = 'document-ingestion';

  private queue: Queue<IngestionJobData> | null = null;
  private worker: Worker<IngestionJobData> | null = null;
  private queueConnection: Redis | null = null;
  private workerConnection: Redis | null = null;
  private isBullMqActive = false;

  constructor(private readonly ingestionProcessor: IngestionProcessor) {}

  onModuleInit(): void {
    const rawRedisUrl = process.env.REDIS_URL;
    if (!rawRedisUrl || process.env.NODE_ENV === 'test') {
      this.logger.log('Hybrid BullMQ running in inline fallback mode (no Redis or test env).');
      return;
    }

    try {
      const redisUrl =
        rawRedisUrl.includes('upstash.io') && rawRedisUrl.startsWith('redis://')
          ? rawRedisUrl.replace('redis://', 'rediss://')
          : rawRedisUrl;
      const rejectUnauthorized = process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false';

      const baseOpts = {
        maxRetriesPerRequest: null as null,
        connectTimeout: 3000,
        retryStrategy: (times: number) => (times > 3 ? null : Math.min(times * 250, 1000)),
        tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized } : undefined,
      };

      this.queueConnection = new Redis(redisUrl, baseOpts);
      this.workerConnection = new Redis(redisUrl, baseOpts);

      this.queueConnection.on('ready', () => {
        this.isBullMqActive = true;
        this.logger.log('Hybrid BullMQ Queue connected to Redis.');
      });

      this.queueConnection.on('error', (err: Error) => {
        this.isBullMqActive = false;
        this.logger.warn(
          `BullMQ Redis connection degraded (${err.message}). Falling back to inline execution.`,
        );
      });

      this.workerConnection.on('error', (err: Error) => {
        this.logger.warn(`BullMQ Worker connection warning: ${err.message}`);
      });

      this.queue = new Queue<IngestionJobData>(this.QUEUE_NAME, {
        connection: this.queueConnection as any,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      });

      this.worker = new Worker<IngestionJobData>(
        this.QUEUE_NAME,
        async (job) => {
          await this.ingestionProcessor.processDocument(job.data);
        },
        {
          connection: this.workerConnection as any,
          concurrency: 3,
        },
      );

      this.worker.on('failed', (job, err) => {
        this.logger.error(
          `BullMQ ingestion job ${job?.id || 'unknown'} failed (attempt ${job?.attemptsMade}): ${err.message}`,
        );
      });
    } catch (err: unknown) {
      this.isBullMqActive = false;
      this.logger.warn(
        `Could not initialize BullMQ (${(err as Error).message}). Using inline fallback.`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([
      this.worker?.close(),
      this.queue?.close(),
      this.queueConnection?.quit(),
      this.workerConnection?.quit(),
    ]);
  }

  /**
   * Enqueues a document ingestion job onto BullMQ when Redis is active,
   * automatically falling back to atomic inline background processing if offline.
   */
  async enqueueDocument(
    data: IngestionJobData,
  ): Promise<{ jobId: string; mode: 'bullmq' | 'inline' }> {
    const fallbackJobId = `job-${data.documentId}`;

    if (this.queue && this.isBullMqActive) {
      try {
        const job = await this.queue.add('ingest-document', data, {
          jobId: fallbackJobId,
        });
        return { jobId: job.id || fallbackJobId, mode: 'bullmq' };
      } catch (err: unknown) {
        this.logger.warn(
          `BullMQ enqueue failed (${(err as Error).message}). Falling back to inline ingestion.`,
        );
      }
    }

    setImmediate(async () => {
      try {
        await this.ingestionProcessor.processDocument(data);
      } catch (err: unknown) {
        this.logger.error(
          `Inline ingestion job ${fallbackJobId} failed: ${(err as Error).message}`,
        );
      }
    });

    return { jobId: fallbackJobId, mode: 'inline' };
  }
}
