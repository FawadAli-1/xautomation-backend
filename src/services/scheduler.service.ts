import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PostingTime } from '../types/post.types';
import { ScheduledPostsService } from './scheduled-posts.service';
import { TwitterService } from './twitter.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private POSTS_PER_DAY = 16;

  constructor(
    private readonly scheduledPostsService: ScheduledPostsService,
    private readonly twitterService: TwitterService,
  ) {}

  calculatePostingTimes(): PostingTime[] {
    const now = new Date();
    const times: PostingTime[] = [];
    
    // Calculate time slots evenly distributed over 24 hours
    const intervalHours = 24 / this.POSTS_PER_DAY;
    
    for (let i = 0; i < this.POSTS_PER_DAY; i++) {
      const postTime = new Date(now);
      postTime.setHours(now.getHours() + (i * intervalHours));
      postTime.setMinutes(0);
      postTime.setSeconds(0);
      
      times.push({
        time: postTime,
        index: i + 1
      });
    }

    return times;
  }

  getNextPostingTime(): PostingTime {
    const times = this.calculatePostingTimes();
    const now = new Date();
    
    // Find the next available time slot
    return times.find(time => time.time > now) || times[0];
  }

  // Run every minute to check for posts that need to be published
  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledPosts() {
    this.logger.debug('Checking for scheduled posts to publish...');
    
    try {
      const pendingPosts = await this.scheduledPostsService.findPendingPosts();
      
      if (pendingPosts.length === 0) {
        return;
      }
      
      this.logger.log(`Found ${pendingPosts.length} posts to publish`);
      
      for (const post of pendingPosts) {
        try {
          let tweetId: string | null = null;
          let tweetIds: string[] | null = null;
          
          if (post.isThread && post.threadParts && post.threadParts.length > 0) {
            // Post as thread
            tweetIds = await this.twitterService.postThread(post.threadParts, post.mediaFile);
            this.logger.log(`Posted thread with IDs: ${tweetIds.join(', ')}`);
          } else {
            // Post as single tweet
            tweetId = await this.twitterService.postTweet(post.content, post.mediaFile);
            this.logger.log(`Posted tweet with ID: ${tweetId}`);
          }
          
          // Mark as posted
          await this.scheduledPostsService.markAsPosted(post.id, tweetId, tweetIds);
        } catch (error) {
          this.logger.error(`Failed to post scheduled tweet: ${error.message}`, error.stack);
          // We don't mark as posted so it will be retried next time
        }
      }
    } catch (error) {
      this.logger.error(`Error in scheduled post handler: ${error.message}`, error.stack);
    }
  }
}