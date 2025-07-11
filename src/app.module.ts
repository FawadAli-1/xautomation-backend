import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GroqService } from './services/groq.service';
import { PostController } from './controllers/post.controller';
import { TwitterService } from './services/twitter.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [PostController],
  providers: [GroqService, TwitterService],
})
export class AppModule {}
