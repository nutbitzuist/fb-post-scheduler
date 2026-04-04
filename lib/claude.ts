import { AppConfig, CampaignPost, Pillar } from './types'

// ─── Pillar config ─────────────────────────────────────────────────────────
export const PILLARS: { pillar: Pillar; ratio: number; color: string }[] = [
  { pillar: 'EA Fundamentals',    ratio: 0.40, color: '#1877F2' },
  { pillar: 'Strategy & Analysis', ratio: 0.25, color: '#1D9E75' },
  { pillar: 'Mindset & Risk',     ratio: 0.20, color: '#b45309' },
  { pillar: 'Behind the Scenes',  ratio: 0.15, color: '#7c3aed' },
]

export const POST_TYPES = [
  'Educational', 'Motivational', 'Case Study / Story',
  'Quick Tip', 'Myth Busting', 'Q&A / Engagement',
  'Proof / Results', 'Behind the Scenes',
]

// ─── Determine which service this campaign is for ──────────────────────────
function detectService(targetPage: string): 'fasttrack' | 'xray' | 'both' {
  if (targetPage === 'page1') return 'fasttrack'
  if (targetPage === 'page2') return 'xray'
  return 'both'
}

// ─── System prompt — fully loaded with both services ──────────────────────
export function buildSystemPrompt(cfg: AppConfig, targetPage?: string): string {
  const service = detectService(targetPage || 'both')

  const serviceContext = service === 'fasttrack' ? `
ACTIVE SERVICE FOR THIS CAMPAIGN: 7-Day Fast Track (facebook.com/leverage100)
- This is a Done-For-You EA trading setup service. Nut installs everything.
- Price: 9,900 THB. Limited to 20 people. Money-back guarantee.
- Target: Thai professionals 30K–200K THB/month income who want passive income without complexity.
- Pain points: scared to start, no time, tried before but failed, bought EA but couldn't set it up.
- Core promise: ไม่ต้องเฝ้าจอ · ไม่ต้องมีพื้นฐาน · ระบบพร้อมใน 7 วัน
- CTA ladder: Engage -> Follow/Comment -> DM for free info -> Line @leverage100x -> leverage100x.com/auto-trading-7day
- Content mix: EA education (40%), trading strategy (25%), mindset/risk (20%), Nut's proof/results (15%)
` : service === 'xray' ? `
ACTIVE SERVICE FOR THIS CAMPAIGN: นัท X-Ray ธุรกิจ (facebook.com/businessxray)
- This is a business consulting service. Nut X-Rays your business and works WITH you until results.
- Price: 36,000–50,000 THB/month OR 360,000 THB/year (Annual Partner).
- Free entry: Business X-Ray Session ฟรี 20 นาที — no prep, no commitment.
- Target: Business owners/CEOs who work hard but profits flat, feel like bottleneck, tried coaches/courses but failed.
- Pain points: revenue exists but cash disappears, no systems, team can't decide without owner, growth plateaued.
- Core promise: X-Ray ธุรกิจ — หารูรั่ว หาจุดแข็ง แก้ให้ตรงจุด เห็นผลใน 30 วัน
- Real case studies to reference:
  * Restaurant: Revenue 2M/mo, profit 5% → 14% in 60 days (no extra sales needed)
  * B2B Company: Owner workday 14hr → 7hr, business runs without owner
  * E-Commerce: Cash flow fixed in 45 days after pricing + collection system fix
- Credibility: 500+ companies X-Rayed, 15 yrs institutional equity sales (Hedge Fund level analysis)
- CTA ladder: Engage -> Learn about X-Ray -> Book free 20-min session -> Line @leverage100x
- Content mix: Business problems/patterns (40%), strategy/systems (25%), mindset/leadership (20%), Nut's results/proof (15%)
` : `
BOTH SERVICES ACTIVE — alternate between pages:
- Page 1 (facebook.com/leverage100): 7-Day Fast Track EA trading setup
- Page 2 (facebook.com/businessxray): นัท X-Ray ธุรกิจ business consulting
`

  return `You are the content strategist and copywriter for Nut (นัท) Leverage100x.

ABOUT NUT:
- Full name: สรัญภร คงอรรถการ (นัท)
- 15+ years institutional equity sales at leading Thai financial institutions
- 6+ years using and developing Expert Advisors (EAs) for automated trading
- Published author: "ถ้ารู้ว่ารวยเร็วแบบนี้ใช้ Robot เทรด Forex ไปนานแล้ว" (published by เช็ก press)
- Monthly EA income: 50,000–150,000 THB from real portfolio
- Built own tools: MyAlgoStack, MT4 Portfolio Dashboard, Nut Quant, TradingView Signal Bridge, FinDash OS, BullTiq
- Website: nut.leverage100x.com
- Has X-Rayed 500+ companies as business consultant

BRAND:
- Leverage100x / "Multiply Everything That Matters"
- NOT a guru. An expert with skin in the game who teaches what he actually does.
- Credibility is the moat. Honesty about risks builds trust.
- Thai-first. Speaks to busy Thai professionals in natural, conversational Thai.

${serviceContext}

WRITING RULES:
1. Write primarily in Thai. Natural, conversational Thai — not stiff or formal.
2. Use emojis naturally (not overloaded). 2–5 per post maximum.
3. Always end with 3–5 relevant Thai/English hashtags including #Leverage100x
4. Posts should be 150–400 words for Facebook.
5. Every post needs ONE clear CTA matching the CTA ladder above.
6. Be honest about risks. Never guarantee returns. Never sound like MLM.
7. Use real numbers when possible (from the case studies and Nut's real results).
8. Hooks must be strong — use: curiosity gap, myth busting, result reveal, or contrast (success vs failure).
9. Never start a post with "สวัสดีครับ" — start with the hook immediately.
10. The 90-day goal is to SELL the services. Content should build trust and move people toward the CTA.

VISUAL STYLE for image prompts: ${cfg.visualStyle || 'Professional fintech blue/gold for EA page. Business consulting bold data visualization for X-Ray page. Real-feeling, no stock photo clichés. Thai professional context.'}`
}

// ─── Assign pillars based on service ──────────────────────────────────────
export function assignPillars(totalPosts: number): Pillar[] {
  const result: Pillar[] = []
  const counts = PILLARS.map(p => ({ ...p, count: Math.round(p.ratio * totalPosts) }))
  let assigned = 0
  for (const p of counts) {
    for (let i = 0; i < p.count && assigned < totalPosts; i++) {
      result.push(p.pillar)
      assigned++
    }
  }
  // shuffle for even distribution across weeks
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// ─── Generate scheduled dates ──────────────────────────────────────────────
export function generateScheduleDates(
  monthIndex: number,
  year: number,
  postDays: string[],
  postTime: string
): { date: Date; dayLabel: string; week: number }[] {
  const dayMap: Record<string, number> = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
    Thursday: 4, Friday: 5, Saturday: 6,
  }
  const [hours, minutes] = postTime.split(':').map(Number)
  const results: { date: Date; dayLabel: string; week: number }[] = []
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthIndex, day, hours, minutes, 0)
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' })
    if (postDays.includes(dayName)) {
      const week = Math.ceil(day / 7)
      results.push({
        date: d,
        dayLabel: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        week,
      })
    }
  }
  return results
}

// ─── Generate monthly plan (topics + angles) ──────────────────────────────
export async function generateMonthlyPlan(
  cfg: AppConfig,
  month: string,
  totalPosts: number,
  pillars: Pillar[],
  targetPage: string
): Promise<Array<{ pillar: Pillar; postType: string; topic: string; angle: string }>> {
  const sys = buildSystemPrompt(cfg, targetPage)
  const service = detectService(targetPage)
  const serviceNote = service === 'fasttrack'
    ? 'All posts should support selling the 7-Day Fast Track (9,900 THB). Build trust, educate, move people to DM.'
    : service === 'xray'
    ? 'All posts should support selling the X-Ray business consulting service. Build authority, share patterns, move people to book the free 20-min session.'
    : 'Mix of posts for both services.'

  const prompt = `Generate a ${month} Facebook content plan with exactly ${totalPosts} posts.
${serviceNote}

This is a 90-DAY SALES CAMPAIGN. Month content should:
- Build awareness and trust early (weeks 1-2)
- Deepen expertise and create desire mid-month (week 3)
- Drive conversions with proof and urgency end of month (week 4)

Pillar assignments (match these EXACTLY in order):
${pillars.map((p, i) => `${i + 1}. ${p}`).join('\n')}

For each post provide:
- postType: one of [Educational, Motivational, Case Study / Story, Quick Tip, Myth Busting, Q&A / Engagement, Proof / Results, Behind the Scenes]
- topic: specific topic title in Thai (make it concrete, not generic)
- angle: the unique hook/angle for this post in English (1 sentence, must be specific)

Do NOT repeat topics. Vary post types. Build momentum across the month.

Return ONLY valid JSON array, no markdown:
[{"pillar":"EA Fundamentals","postType":"Educational","topic":"EA คืออะไร?","angle":"Start with the biggest misconception beginners have about EAs"}]`

  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: cfg.anthropicKey, systemPrompt: sys, userPrompt: prompt }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  const clean = data.text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

// ─── Generate full post + image prompt ────────────────────────────────────
export async function generatePostContent(
  cfg: AppConfig,
  post: Partial<CampaignPost>
): Promise<{ text: string; imagePrompt: string }> {
  const sys = buildSystemPrompt(cfg, post.targetPage)

  const prompt = `Write a complete Facebook post for Leverage100x / นัท:

PILLAR: ${post.pillar}
POST TYPE: ${post.postType}
TOPIC: ${post.topic}
ANGLE: ${post.angle}
TARGET PAGE: ${post.targetPage === 'page1' ? '7-Day Fast Track (leverage100x page)' : post.targetPage === 'page2' ? 'นัท X-Ray ธุรกิจ (businessxray page)' : 'both pages'}

Write the full Thai Facebook post now. Start with a strong hook (NOT สวัสดีครับ). Follow the angle. End with the right CTA for this service and appropriate hashtags.

After the post text, add on a NEW LINE:
IMAGE_PROMPT: [a detailed, specific Gemini Imagen 3 image generation prompt — describe the scene, mood, colors, style that fits this post perfectly]

Return ONLY the post text + IMAGE_PROMPT line. Nothing else.`

  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: cfg.anthropicKey, systemPrompt: sys, userPrompt: prompt }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)

  const raw: string = data.text
  const imgIdx = raw.lastIndexOf('IMAGE_PROMPT:')
  if (imgIdx !== -1) {
    return {
      text: raw.slice(0, imgIdx).trim(),
      imagePrompt: raw.slice(imgIdx + 13).trim(),
    }
  }
  return {
    text: raw.trim(),
    imagePrompt: `Professional Thai fintech/business photo for: ${post.topic}. Clean, modern, blue-gold palette. No stock clichés.`,
  }
}

// ─── Generate monthly theme + goal ────────────────────────────────────────
export async function generateCampaignTheme(
  cfg: AppConfig,
  month: string,
  targetPage: string
): Promise<{ theme: string; goal: string }> {
  const sys = buildSystemPrompt(cfg, targetPage)
  const service = detectService(targetPage)
  const serviceHint = service === 'fasttrack'
    ? 'for the 7-Day Fast Track EA trading service (9,900 THB)'
    : service === 'xray'
    ? 'for the นัท X-Ray ธุรกิจ consulting service (free 20-min session entry point)'
    : 'for both services (EA trading + business consulting)'

  const prompt = `Suggest a compelling monthly theme and content goal ${serviceHint} for ${month}.
The goal should move people toward the service CTA. Make the theme specific and motivating.
Return ONLY valid JSON: {"theme":"...","goal":"..."}`

  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: cfg.anthropicKey, systemPrompt: sys, userPrompt: prompt }),
  })
  const data = await res.json()
  if (!res.ok) return { theme: `${month} Campaign`, goal: 'Build trust and drive conversions' }
  try {
    const clean = data.text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return { theme: `${month} Campaign`, goal: 'Build trust and drive conversions' }
  }
}
