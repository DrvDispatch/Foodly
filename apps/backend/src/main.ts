import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Security headers (configured to not break app functionality)
    app.use(helmet({
        contentSecurityPolicy: false, // Disable CSP - may break inline scripts
        crossOriginEmbedderPolicy: false, // Allow cross-origin images/resources
        crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow image loading
    }));

    // Increase body size limit for image uploads
    app.use(json({ limit: '50mb' }));
    app.use(urlencoded({ extended: true, limit: '50mb' }));

    // Global prefix for all routes
    app.setGlobalPrefix('api');

    // Enable CORS for frontend - TEMPORARILY allowing all for phone debugging
    app.enableCors({
        origin: true, // Allow ALL origins temporarily for debugging
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    const port = process.env.PORT || 4000;
    // Listen on 0.0.0.0 to accept connections from local network (phone testing)
    await app.listen(port, '0.0.0.0');

    console.log(`🚀 Backend running on http://0.0.0.0:${port}/api`);
}

bootstrap();
