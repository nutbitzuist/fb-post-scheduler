export interface AppConfig {
  anthropicKey: string
  bufferToken: string
  geminiKey: string
  page1Id: string
  page1Name: string
  page2Id: string
  page2Name: string
  brandName: string
  tagline: string
  audience: string
  tone: string
  topics: string
  visualStyle: string
  defaultCta: string
  postsPerWeek: number
  defaultPostTime: string
  postDays: string[] // e.g. ['Monday','Wednesday','Friday']
}

export type Pillar = 'EA Fundamentals' | 'Strategy & Analysis' | 'Mindset & Risk' | 'Behind the Scenes'
export type PostStatus = 'draft' | 'generating' | 'ready' | 'scheduled' | 'failed'
export type TargetPage = 'both' | 'page1' | 'page2'

export interface CampaignPost {
  id: string
  weekNumber: number       // 1-4
  dayLabel: string         // e.g. "Mon Jan 6"
  scheduledAt: string      // ISO string
  pillar: Pillar
  postType: string
  topic: string
  angle: string
  text: string
  imagePrompt: string
  imageBase64?: string
  targetPage: TargetPage
  status: PostStatus
  bufferUpdateId?: string
  error?: string
}

export interface MonthlyCampaign {
  id: string
  month: string            // e.g. "May 2025"
  monthIndex: number       // 0-11
  year: number
  theme: string            // AI-generated monthly theme
  goal: string             // e.g. "Build EA fundamentals awareness"
  posts: CampaignPost[]
  createdAt: string
  scheduledAt?: string     // when bulk-scheduled
}

export interface GeneratedPost {
  text: string
  imagePrompt: string
}
