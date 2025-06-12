import { Injectable } from '@nestjs/common';
import { TwitterApi } from 'twitter-api-v2';
import { GroqApiException } from '../common/exceptions/groq-api.exception';

type MediaIdsTuple = [string] | [string, string] | [string, string, string] | [string, string, string, string];

@Injectable()
export class TwitterService {
  private twitterClient: TwitterApi;

  constructor() {
    // Check for required environment variables
    const requiredEnvVars = [
      'TWITTER_APP_KEY',
      'TWITTER_APP_SECRET',
      'TWITTER_ACCESS_TOKEN',
      'TWITTER_ACCESS_SECRET',
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`${envVar} is not defined in environment variables`);
      }
    }

    // Log credentials (masked) for debugging
    console.log('Twitter API Configuration:', {
      appKey: `${process.env.TWITTER_APP_KEY?.slice(0, 4)}...`,
      appSecret: `${process.env.TWITTER_APP_SECRET?.slice(0, 4)}...`,
      accessToken: `${process.env.TWITTER_ACCESS_TOKEN?.slice(0, 4)}...`,
      accessSecret: `${process.env.TWITTER_ACCESS_SECRET?.slice(0, 4)}...`,
    });

    // Initialize Twitter client
    try {
      this.twitterClient = new TwitterApi({
        appKey: process.env.TWITTER_APP_KEY!,
        appSecret: process.env.TWITTER_APP_SECRET!,
        accessToken: process.env.TWITTER_ACCESS_TOKEN!,
        accessSecret: process.env.TWITTER_ACCESS_SECRET!,
      });

      console.log('Twitter client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Twitter client:', error);
      throw new Error('Failed to initialize Twitter client');
    }
  }

  async postTweet(content: string): Promise<string> {
    try {
      console.log('Attempting to post tweet:', { contentLength: content.length });
      const tweet = await this.twitterClient.v2.tweet(content);
      console.log('Tweet posted successfully:', tweet.data.id);
      return tweet.data.id;
    } catch (error) {
      console.error('Failed to post tweet:', {
        error: error.message,
        code: error.code,
        data: error.data,
      });
      throw new GroqApiException(
        'Failed to post tweet',
        {
          originalError: error.message,
          errorCode: error.code,
          errorData: error.data,
          content
        }
      );
    }
  }

  async postThread(tweets: string[]): Promise<string[]> {
    try {
      console.log('Attempting to post thread:', { 
        tweetCount: tweets.length,
        tweetLengths: tweets.map(t => t.length)
      });

      const tweetIds: string[] = [];
      let replyToId: string | undefined;

      for (const tweetContent of tweets) {
        console.log('Posting thread tweet:', { 
          contentLength: tweetContent.length,
          replyToId 
        });

        const tweet = await this.twitterClient.v2.tweet(
          tweetContent,
          replyToId ? { reply: { in_reply_to_tweet_id: replyToId } } : undefined
        );
        
        tweetIds.push(tweet.data.id);
        replyToId = tweet.data.id;
        console.log('Thread tweet posted:', tweet.data.id);
      }

      console.log('Thread posted successfully:', { tweetIds });
      return tweetIds;
    } catch (error) {
      console.error('Failed to post thread:', {
        error: error.message,
        code: error.code,
        data: error.data,
      });
      throw new GroqApiException(
        'Failed to post thread',
        {
          originalError: error.message,
          errorCode: error.code,
          errorData: error.data,
          tweets
        }
      );
    }
  }

  async postWithMedia(content: string, mediaIds: string[]): Promise<string> {
    try {
      console.log('Attempting to post tweet with media:', { 
        contentLength: content.length,
        mediaIds 
      });

      // Ensure we don't exceed 4 media items and convert to tuple
      const mediaIdsTuple = mediaIds.slice(0, 4) as MediaIdsTuple;
      
      const tweet = await this.twitterClient.v2.tweet(content, {
        media: { media_ids: mediaIdsTuple }
      });

      console.log('Tweet with media posted successfully:', tweet.data.id);
      return tweet.data.id;
    } catch (error) {
      console.error('Failed to post tweet with media:', {
        error: error.message,
        code: error.code,
        data: error.data,
      });
      throw new GroqApiException(
        'Failed to post tweet with media',
        {
          originalError: error.message,
          errorCode: error.code,
          errorData: error.data,
          content,
          mediaIds
        }
      );
    }
  }

  async uploadMedia(buffer: Buffer, mimeType: string): Promise<string> {
    try {
      console.log('Attempting to upload media:', { mimeType });
      const mediaId = await this.twitterClient.v1.uploadMedia(buffer, {
        mimeType: mimeType,
      });
      console.log('Media uploaded successfully:', mediaId);
      return mediaId;
    } catch (error) {
      console.error('Failed to upload media:', {
        error: error.message,
        code: error.code,
        data: error.data,
      });
      throw new GroqApiException(
        'Failed to upload media',
        {
          originalError: error.message,
          errorCode: error.code,
          errorData: error.data,
          mimeType
        }
      );
    }
  }
} 