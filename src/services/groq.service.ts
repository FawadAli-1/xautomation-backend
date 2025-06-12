import { Injectable } from '@nestjs/common';
import { Groq } from 'groq-sdk';
import { GroqApiException } from '../common/exceptions/groq-api.exception';

interface ThreadedPost {
  content: string;
  isThread: boolean;
  threadParts?: string[];
}

@Injectable()
export class GroqService {
  private groq: Groq;
  private readonly MAX_TWEET_LENGTH = 280;

  constructor() {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not defined in environment variables');
    }

    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  async generatePost(prompt: string): Promise<ThreadedPost> {
    try {
      if (!prompt || prompt.trim().length === 0) {
        throw new GroqApiException('Prompt cannot be empty');
      }

      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 500,
        messages: [
          {
            role: 'system',
            content: `
You are a savvy social media strategist with 10+ years experience creating viral content. Your specialty is crafting posts that feel like they came from a real human expert, not a bot.

Task: Generate 1 X post based on the user's input. Each post must follow these rules:

### Content Rules
1. **Human Tone Priority**:
   - Use contractions ("you're", "it's")
   - Include 1-2 conversational phrases ("Seriously though...", "Here's the thing...")
   - Add subtle humor when appropriate (dry wit > forced jokes)
   - Show vulnerability ("This surprised me...", "I struggled with...")
   - Remove jargon words like elevate, seemless, unless used in the right context
   - Add "1:...., 2:...." instead of 1/2, 2/2. And only add that when I am pointing to multiple references or points, else it's not necessery to add

2. **Emoji Rules**:
   - Maximum 2 emojis per post
   - Only use at END of sentences
   - Never replace words with emojis
   - Context-based usage:
     - 🚀 for growth/achievements
     - 🤯 for surprising facts
     - ❤️ for emotional content
     - 🤔 for thought-provoking questions

3. **Structure Formula**:
   [Hook] + [Core Insight] + [Human Element] + [Engagement Trigger]
   
   Example structure:
   "Who else [relatable pain]?  
   I discovered [insight] after [personal experience].  
   The kicker? [Surprising twist].  
   [Question that sparks discussion]"

4. **Bullet Point Rules**:
   - Only for lists of 3+ items
   - Start with action verbs
   - Keep under 6 words per point
   - Add personality in parentheses:
     "• Track this (seriously)  
     • Avoid that (trust me)  
     • Try this (game-changer!)"

5. **Depth Requirements**:
   - Include 1 unexpected insight
   - Reference real-world application
   - Add subtle social proof:  
     "Most founders miss this..."  
     "Top performers always..."

**Output Format**:
Provide only the tweet text, without JSON formatting.
`          
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const rawContent = completion.choices[0]?.message?.content;
      if (!rawContent) {
        throw new GroqApiException('No content generated from Groq API');
      }

      // Attempt to parse JSON if provided; otherwise use raw text
      let tweetText = rawContent.trim();
      try {
        // If model outputs JSON-like, extract the "post" field
        const parsed = JSON.parse(rawContent);
        if (parsed.post) {
          tweetText = parsed.post.trim();
        }
      } catch {
        // Not valid JSON; use raw content
      }

      // If tweet exceeds max length, split into thread
      return this.processIntoThread(tweetText);
    } catch (error) {
      if (error instanceof GroqApiException) {
        throw error;
      }

      if (error.response?.data) {
        throw new GroqApiException(
          'Groq API Error',
          {
            originalError: error.response.data,
            prompt
          }
        );
      }

      throw new GroqApiException(
        'Failed to generate content',
        {
          originalError: error.message,
          prompt
        }
      );
    }
  }

  private processIntoThread(content: string): ThreadedPost {
    const cleanContent = content.trim();

    if (cleanContent.length <= this.MAX_TWEET_LENGTH) {
      return {
        content: cleanContent,
        isThread: false
      };
    }

    // Split content into thread parts
    const words = cleanContent.split(' ');
    const threads: string[] = [];
    let currentThread = '';
    let tweetCount = 1;
    const totalTweets = Math.ceil(cleanContent.length / this.MAX_TWEET_LENGTH);

    for (const word of words) {
      const threadPrefix = `${tweetCount}/${totalTweets} `;
      const potentialThread = currentThread 
        ? `${currentThread} ${word}`
        : `${threadPrefix}${word}${tweetCount === 1 ? ' (thread)' : ''}`;

      if (potentialThread.length > this.MAX_TWEET_LENGTH) {
        threads.push(currentThread);
        currentThread = `${threadPrefix}${word}`;
        tweetCount++;
      } else {
        currentThread = potentialThread;
      }
    }

    if (currentThread) {
      threads.push(currentThread);
    }

    return {
      content: threads[0],
      isThread: true,
      threadParts: threads
    };
  }
}
