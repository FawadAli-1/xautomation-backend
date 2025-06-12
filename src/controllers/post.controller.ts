import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { GroqService } from '../services/groq.service';
import { TwitterService } from '../services/twitter.service';
import { GeneratePostDto, GeneratedPost } from '../types/post.types';

interface PostToTwitterDto {
  content: string;
  isThread: boolean;
  threadParts?: string[];
  mediaFile?: {
    data?: string;  // Optional base64 encoded string
    mimeType?: string;
  };
}

@Controller('posts')
export class PostController {
  constructor(
    private readonly groqService: GroqService,
    private readonly twitterService: TwitterService,
  ) {}

  @Post('generate')
  async generatePost(@Body() dto: GeneratePostDto): Promise<GeneratedPost> {
    return await this.groqService.generatePost(dto.prompt);
  }

  @Post('publish')
  async publishToTwitter(@Body() dto: PostToTwitterDto): Promise<{ tweetIds: string[] }> {
    try {
      // Log incoming request data
      console.log('Received publish request with data:', JSON.stringify(dto, null, 2));

      // Check if dto is defined
      if (!dto) {
        throw new BadRequestException('No data provided in the request');
      }

      // Validate required fields
      if (!dto.content && (!dto.isThread || !dto.threadParts?.length)) {
        throw new BadRequestException('Content is required for the tweet');
      }

      // For thread posts, ensure we have content
      if (dto.isThread && (!dto.threadParts || dto.threadParts.length === 0)) {
        throw new BadRequestException('Thread parts are required when posting a thread');
      }

      // For single posts, ensure we have content
      if (!dto.isThread && !dto.content) {
        throw new BadRequestException('Content is required for single tweets');
      }

      // Handle media upload if present
      let mediaId: string | undefined;
      if (dto.mediaFile?.data && dto.mediaFile?.mimeType) {
        try {
          const base64Data = dto.mediaFile.data.split(',')[1] || dto.mediaFile.data;
          const buffer = Buffer.from(base64Data, 'base64');
          mediaId = await this.twitterService.uploadMedia(buffer, dto.mediaFile.mimeType);
        } catch (error) {
          console.error('Error uploading media:', error);
          throw new BadRequestException('Failed to process media file');
        }
      }

      // Handle thread or single tweet posting
      if (dto.isThread && dto.threadParts?.length) {
        // Thread posting
        if (mediaId) {
          // Post first tweet with media
          const firstTweet = await this.twitterService.postWithMedia(
            dto.threadParts[0],
            [mediaId]
          );
          const remainingTweets = await this.twitterService.postThread(
            dto.threadParts.slice(1)
          );
          return { tweetIds: [firstTweet, ...remainingTweets] };
        } else {
          // Post thread without media
          const tweetIds = await this.twitterService.postThread(dto.threadParts);
          return { tweetIds };
        }
      } else {
        // Single tweet posting
        if (mediaId) {
          const tweetId = await this.twitterService.postWithMedia(
            dto.content,
            [mediaId]
          );
          return { tweetIds: [tweetId] };
        } else {
          const tweetId = await this.twitterService.postTweet(dto.content);
          return { tweetIds: [tweetId] };
        }
      }
    } catch (error) {
      console.error('Error publishing to Twitter:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Failed to publish tweet'
      );
    }
  }
} 