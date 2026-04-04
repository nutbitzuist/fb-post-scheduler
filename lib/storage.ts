import { AppConfig, MonthlyCampaign } from './types'

const CONFIG_KEY = 'fb_scheduler_config'
const CAMPAIGNS_KEY = 'fb_scheduler_campaigns'

export const defaultConfig: AppConfig = {
  anthropicKey: '',
  bufferToken: '',
  geminiKey: '',
  page1Id: '',
  page1Name: 'Leverage100x (leverage100x)',
  page2Id: '',
  page2Name: 'นัท X-Ray ธุรกิจ (businessxray)',
  brandName: 'Leverage100x / นัท X-Ray ธุรกิจ',
  tagline: 'Multiply Everything That Matters',
  audience: `SERVICE 1 — 7-Day Fast Track (Facebook: facebook.com/leverage100):
Target: Thai working professionals 30,000–200,000+ THB/month, business owners with no time to trade, people with 500K–5M THB savings wanting passive income without watching charts or needing technical background. Skeptical of scams, value credibility and proven results.
Price: 9,900 THB (first cohort 2026, limited 20 spots). Full money-back guarantee if system not ready in 7 days.
Done-For-You: Nut installs the EA system, sets up MT4+VPS+Risk Management, teaches a 2-4hr short course, provides Line OA support.
Credibility: Nut = 15+ yrs institutional equity sales, 6+ yrs using EAs, published author, earns 50,000–150,000 THB/month from EA portfolio.
Key hook: ไม่ต้องเฝ้าจอ · ไม่ต้องมีพื้นฐาน · ระบบพร้อมใน 7 วัน
CTA: Line @leverage100x | leverage100x.com/auto-trading-7day

SERVICE 2 — นัท X-Ray ธุรกิจ (Facebook: facebook.com/businessxray):
Target: Business owners/CEOs who work hard but profits are flat, revenue exists but cash disappears, feel like bottleneck in their own business, tried coaches/courses but nothing worked, willing to hear hard truths.
Price: Package 1 = 36,000–50,000 THB/month. Package 2 = 360,000 THB/year (Annual Partner, unlimited for 1 business).
What you get: Business X-Ray Report (5-dimension deep analysis), actionable 30-day roadmap, AI & Technology integration, Automation & System Design, weekly 1-on-1 (60 min), Line support, monthly KPI performance report.
Credibility: 500+ companies analyzed, 15 yrs institutional finance, sees patterns others miss, works WITH you until results achieved.
Key case studies: Restaurant: revenue 2M/mo, profit 5% -> 14% in 60 days without extra sales. B2B: owner from 14hr -> 7hr workday. E-commerce: Cash flow fixed in 45 days after pricing + collection fixes.
Free offer: Business X-Ray Session ฟรี 20 นาที — no preparation needed, no commitment.
CTA: Line @leverage100x | Facebook: นัท X-Ray ธุรกิจ`,
  tone: 'Confident, educational, honest about risks — not a guru. 15+ years institutional finance background. Published author. Uses real numbers, real case studies. Thai-first voice. Approachable expert who has skin in the game. Never overpromises. Speaks to busy professionals who value credibility.',
  topics: 'EA trading automation, Expert Advisors, passive income, risk management, automated systems, business X-Ray, business consulting, AI for business, workflow automation, cash flow improvement, profitability, Thai entrepreneurs, financial freedom, done-for-you systems',
  visualStyle: 'Page 1 (Leverage100x): Blue and gold professional fintech, modern, clean. Page 2 (X-Ray): Business consulting, analytical, bold data visualization. Both: real-feeling, data-driven, no stock photo clichés.',
  defaultCta: 'ทักนัทมาที่ Line @leverage100x | #Leverage100x',
  postsPerWeek: 3,
  defaultPostTime: '09:00',
  postDays: ['Monday', 'Wednesday', 'Friday'],
}

export function loadConfig(): AppConfig {
  if (typeof window === 'undefined') return defaultConfig
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return defaultConfig
    return { ...defaultConfig, ...JSON.parse(raw) }
  } catch {
    return defaultConfig
  }
}

export function saveConfig(cfg: AppConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg))
}

export function loadCampaigns(): MonthlyCampaign[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CAMPAIGNS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveCampaigns(campaigns: MonthlyCampaign[]): void {
  localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaigns))
}

export function saveCampaign(campaign: MonthlyCampaign): void {
  const all = loadCampaigns()
  const idx = all.findIndex(c => c.id === campaign.id)
  if (idx !== -1) all[idx] = campaign
  else all.unshift(campaign)
  saveCampaigns(all)
}
