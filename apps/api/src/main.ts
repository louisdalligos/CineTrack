import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

function resolveCorsOrigin(): string[] | boolean {
  // In production the browser origin is a fixed, known URL, so the wildcard
  // used for local development is narrowed to it. Comma-separated to allow
  // Vercel preview deployments alongside the production domain.
  const configured = process.env.CORS_ORIGIN?.trim();

  if (!configured) {
    return true; // local development: any origin
  }

  return configured.split(',').map((origin) => origin.trim());
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: resolveCorsOrigin(),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Hosting platforms inject the port they expect the app to bind to, and it
  // is not always 4000. Binding 0.0.0.0 rather than localhost is required for
  // the container to be reachable from outside.
  const port = process.env.PORT ?? 4000;
  await app.listen(port, '0.0.0.0');

  Logger.log(`API listening on port ${port}`, 'Bootstrap');
}
bootstrap();
