export interface PostingTime {
  time: Date;
  index: number;
}

export interface GeneratePostDto {
  prompt: string;
  includeSchedule?: boolean;
}

export interface ThreadedPost {
  content: string;
  isThread: boolean;
  threadParts?: string[];
}

export interface GeneratedPost extends ThreadedPost {
  nextPostingTime?: PostingTime;
} 