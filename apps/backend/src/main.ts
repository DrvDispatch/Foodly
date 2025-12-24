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

    // Enable CORS for frontend - production uses strict single origin
    const isProduction = process.env.NODE_ENV === 'production';
    const allowedOrigins = isProduction
        ? [process.env.FRONTEND_URL].filter(Boolean) as string[]
        : [
            process.env.FRONTEND_URL || 'http://localhost:3000',
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:3002',
        ];

    app.enableCors({
        origin: allowedOrigins,
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
    await app.listen(port);

    console.log(`🚀 Backend running on http://localhost:${port}/api`);
}

bootstrap();
