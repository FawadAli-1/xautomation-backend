import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: {
    origin: [
        "http://localhost:3000",
        "https://xautomation.vercel.app"
      ],
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', "OPTIONS"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"]
  }});
  app.setGlobalPrefix('api');
  
  // Apply global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();
