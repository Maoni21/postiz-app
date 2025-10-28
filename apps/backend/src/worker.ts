import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  console.log('🚀 Worker is running and processing jobs...');

  // Le worker reste en vie pour traiter les jobs BullMQ
  process.on('SIGINT', async () => {
    console.log('Shutting down worker...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Shutting down worker...');
    await app.close();
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start worker:', error);
  process.exit(1);
});