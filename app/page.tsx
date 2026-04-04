'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppConfig, MonthlyCampaign, CampaignPost, Pillar, TargetPage } from '@/lib/types'
import { loadConfig, saveConfig, loadCampaigns, saveCampaign, defaultConfig } from '@/lib/storage'
import {
  PILLARS, assignPillars, generateScheduleDates,
  generateMonthlyPlan, generatePostContent, generateCampaignTheme,
} from '@/lib/claude'
import { schedulePostToPages } from '@/lib/buffer'

type Tab = 'setup' | 'campaign' | 'review' | 'history'

const PILLAR_COLORS: Record<Pillar, string> = {
  'EA Fundamentals':    '#1877F2',
  'Strategy & Analysis':'#1D9E75',
  'Mindset & Risk':     '#b45309',
  'Behind the Scenes':  '#7c3aed',
}
const PILLAR_BADGES: Record<Pillar, string> = {
  'EA Fundamentals':    'badge-blue',
  'Strategy & Analysis':'badge-green',
  'Mindset & Risk':     'badge-amber',
  'Behind the Scenes':  'badge-purple',
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS_OF_WEEK = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

export default function Home() {
  const [tab, setTab] = useState<Tab>('campaign')
  const [cfg, setCfg] = useState<AppConfig>(defaultConfig)
  const [saved, setSaved] = useState(false)
  const [campaigns, setCampaigns] = useState<MonthlyCampaign[]>([])
  const [activeCampaign, setActiveCampaign] = useState<MonthlyCampaign | null>(null)

  const now = new Date()
  const [selMonth, setSelMonth] = useState(now.getMonth())
  const [selYear, setSelYear] = useState(now.getFullYear())
  const [postDays, setPostDays] = useState<string[]>(['Monday','Wednesday','Friday'])
  const [postTime, setPostTime] = useState('09:00')
  const [targetPage, setTargetPage] = useState<TargetPage>('both')
  const [manualTheme, setManualTheme] = useState('')

  const [phase, setPhase] = useState<'idle'|'planning'|'generating'|'done'>('idle')
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [genError, setGenError] = useState('')

  const [scheduling, setScheduling] = useState(false)
  const [scheduleProgress, setScheduleProgress] = useState(0)
  const [scheduleMsg, setScheduleMsg] = useState('')
  const [scheduleErr, setScheduleErr] = useState('')

  const [editingPost, setEditingPost] = useState<CampaignPost | null>(null)
  const [editText, setEditText] = useState('')

  useEffect(() => {
    setCfg(loadConfig())
    const all = loadCampaigns()
    setCampaigns(all)
    if (all.length > 0) setActiveCampaign(all[0])
  }, [])

  const updateCampaign = useCallback((c: MonthlyCampaign) => {
    setActiveCampaign(c)
    saveCampaign(c)
    setCampaigns(prev => {
      const idx = prev.findIndex(x => x.id === c.id)
      if (idx !== -1) { const n = [...prev]; n[idx] = c; return n }
      return [c, ...prev]
    })
  }, [])

  function handleSaveSetup() {
    saveConfig({ ...cfg, postDays, defaultPostTime: postTime })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function toggleDay(day: string) {
    setPostDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  async function handleGenerateCampaign() {
    if (!cfg.anthropicKey) { setGenError('Add your Anthropic API key in Setup first.'); return }
    setGenError('')
    setPhase('planning')
    setProgress(0)

    try {
      const monthName = `${MONTHS[selMonth]} ${selYear}`
      const dates = generateScheduleDates(selMonth, selYear, postDays, postTime)
      const totalPosts = dates.length
      if (!totalPosts) {
        setGenError('No posting days found. Check your day selection.')
        setPhase('idle')
        return
      }

      setProgressLabel(`Creating campaign theme for ${monthName}...`)
      const { theme, goal } = await generateCampaignTheme(cfg, monthName, targetPage)

      setProgressLabel(`Planning ${totalPosts} posts across content pillars...`)
      const pillars = assignPillars(totalPosts)
      const plans = await generateMonthlyPlan(cfg, monthName, totalPosts, pillars, targetPage)

      const campaignId = Date.now().toString()
      const skeletonPosts: CampaignPost[] = dates.map((d, i) => ({
        id: `${campaignId}-${i}`,
        weekNumber: d.week,
        dayLabel: d.dayLabel,
        scheduledAt: d.date.toISOString(),
        pillar: plans[i]?.pillar || pillars[i],
        postType: plans[i]?.postType || 'Educational',
        topic: plans[i]?.topic || `Post ${i + 1}`,
        angle: plans[i]?.angle || '',
        text: '',
        imagePrompt: '',
        targetPage,
        status: 'generating',
      }))

      const campaign: MonthlyCampaign = {
        id: campaignId,
        month: monthName,
        monthIndex: selMonth,
        year: selYear,
        theme: manualTheme || theme,
        goal,
        posts: skeletonPosts,
        createdAt: new Date().toISOString(),
      }
      updateCampaign(campaign)
      setTab('review')
      setPhase('generating')

      for (let i = 0; i < skeletonPosts.length; i++) {
        const post = skeletonPosts[i]
        setProgress(Math.round((i / skeletonPosts.length) * 100))
        setProgressLabel(`Writing post ${i + 1} of ${skeletonPosts.length}: ${post.topic}`)
        try {
          const { text, imagePrompt } = await generatePostContent(cfg, post)
          skeletonPosts[i] = { ...post, text, imagePrompt, status: 'ready' }
        } catch {
          skeletonPosts[i] = { ...post, status: 'failed', error: 'Generation failed' }
        }
        updateCampaign({ ...campaign, posts: [...skeletonPosts] })
      }

      setProgress(100)
      setProgressLabel('All posts generated!')
      setPhase('done')
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : 'Campaign generation failed')
      setPhase('idle')
    }
  }

  async function handleRegeneratePost(postId: string) {
    if (!activeCampaign) return
    const idx = activeCampaign.posts.findIndex(p => p.id === postId)
    if (idx === -1) return
    const post = activeCampaign.posts[idx]
    const posts = [...activeCampaign.posts]
    posts[idx] = { ...post, status: 'generating' }
    updateCampaign({ ...activeCampaign, posts })
    try {
      const { text, imagePrompt } = await generatePostContent(cfg, post)
      posts[idx] = { ...post, text, imagePrompt, status: 'ready' }
    } catch {
      posts[idx] = { ...post, status: 'failed', error: 'Regeneration failed' }
    }
    updateCampaign({ ...activeCampaign, posts: [...posts] })
  }

  async function handleGenerateImage(postId: string) {
    if (!activeCampaign || !cfg.geminiKey) return
    const idx = activeCampaign.posts.findIndex(p => p.id === postId)
    if (idx === -1) return
    const post = activeCampaign.posts[idx]
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: cfg.geminiKey, prompt: post.imagePrompt }),
      })
      const data = await res.json()
      if (data.imageBase64) {
        const posts = [...activeCampaign.posts]
        posts[idx] = { ...post, imageBase64: data.imageBase64 }
        updateCampaign({ ...activeCampaign, posts })
      }
    } catch { /* silent */ }
  }

  async function handleGenerateAllImages() {
    if (!activeCampaign || !cfg.geminiKey) return
    for (const post of activeCampaign.posts) {
      if (post.status === 'ready' && !post.imageBase64) {
        await handleGenerateImage(post.id)
        await new Promise(r => setTimeout(r, 900))
      }
    }
  }

  function handleSaveEdit() {
    if (!activeCampaign || !editingPost) return
    const posts = activeCampaign.posts.map(p =>
      p.id === editingPost.id ? { ...p, text: editText, status: 'ready' as const } : p
    )
    updateCampaign({ ...activeCampaign, posts })
    setEditingPost(null)
  }

  async function handleScheduleAll() {
    if (!activeCampaign) return
    if (!cfg.bufferToken) { setScheduleErr('Add your Buffer access token in Setup.'); return }
    const readyPosts = activeCampaign.posts.filter(p => p.status === 'ready')
    if (!readyPosts.length) { setScheduleErr('No ready posts to schedule.'); return }

    setScheduling(true)
    setScheduleMsg('')
    setScheduleErr('')
    setScheduleProgress(0)

    const errors: string[] = []
    const updatedPosts = [...activeCampaign.posts]

    for (let i = 0; i < readyPosts.length; i++) {
      const post = readyPosts[i]
      setScheduleProgress(Math.round((i / readyPosts.length) * 100))
      const idx = updatedPosts.findIndex(p => p.id === post.id)
      const result = await schedulePostToPages(
        cfg.bufferToken, cfg.page1Id, cfg.page2Id,
        post.targetPage, post.text, post.scheduledAt
      )
      if (result.success) {
        updatedPosts[idx] = { ...post, status: 'scheduled', bufferUpdateId: result.ids.join(',') }
      } else {
        updatedPosts[idx] = { ...post, status: 'failed', error: result.errors.join(', ') }
        errors.push(`Post ${i + 1} (${post.topic}): ${result.errors.join(', ')}`)
      }
      updateCampaign({ ...activeCampaign, posts: updatedPosts, scheduledAt: new Date().toISOString() })
      await new Promise(r => setTimeout(r, 300))
    }

    setScheduleProgress(100)
    setScheduling(false)
    if (errors.length) setScheduleErr(errors.join('\n'))
    else setScheduleMsg(`✓ ${readyPosts.length} posts scheduled to Buffer!`)
  }

  const readyCount = activeCampaign?.posts.filter(p => p.status === 'ready').length ?? 0
  const scheduledCount = activeCampaign?.posts.filter(p => p.status === 'scheduled').length ?? 0
  const failedCount = activeCampaign?.posts.filter(p => p.status === 'failed').length ?? 0
  const generatingCount = activeCampaign?.posts.filter(p => p.status === 'generating').length ?? 0
  const totalCount = activeCampaign?.posts.length ?? 0

  const pageName = (p: TargetPage) =>
    p === 'both' ? `${cfg.page1Name} + ${cfg.page2Name}` :
    p === 'page1' ? cfg.page1Name : cfg.page2Name

  function weekGroups() {
    if (!activeCampaign) return []
    const weeks: Record<number, CampaignPost[]> = {}
    for (const post of activeCampaign.posts) {
      if (!weeks[post.weekNumber]) weeks[post.weekNumber] = []
      weeks[post.weekNumber].push(post)
    }
    return Object.entries(weeks).map(([w, posts]) => ({ week: Number(w), posts }))
  }

  const previewDates = generateScheduleDates(selMonth, selYear, postDays, postTime)

  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <div className="logo">
            <div className="logo-icon">📅</div>
            <div>
              <div>FB Campaign Engine</div>
              <div style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text3)' }}>Leverage100x · Monthly Autopilot</div>
            </div>
          </div>
          <nav className="nav">
            {([['campaign','🗓 New Campaign'],['review','📋 Review & Edit'],['history','🗂 History'],['setup','⚙️ Setup']] as [Tab,string][]).map(([t,label]) => (
              <button key={t} className={`nav-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{label}</button>
            ))}
          </nav>
        </div>
      </header>

      <main className="main">
        <div className="container">

          {/* ── NEW CAMPAIGN ─────────────────────────────────────────── */}
          {tab === 'campaign' && (
            <div>
              <div className="card">
                <div className="card-title">🗓 Monthly Campaign Generator</div>
                <p style={{ fontSize: '14px', color: 'var(--text2)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                  Set your month, posting schedule, and pages — Claude will plan all topics, write every post in Thai with hooks and hashtags, generate image prompts, and let you schedule everything to Buffer in one click.
                </p>

                <div className="section-label">Campaign Month</div>
                <div className="grid-2">
                  <div className="field">
                    <label>Month</label>
                    <select value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}>
                      {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Year</label>
                    <select value={selYear} onChange={e => setSelYear(Number(e.target.value))}>
                      {[2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                <hr className="divider" />
                <div className="section-label">Posting Schedule</div>

                <div className="field">
                  <label>Post on these days of the week</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {DAYS_OF_WEEK.map(day => (
                      <button key={day}
                        className={`btn btn-sm${postDays.includes(day) ? ' btn-primary' : ''}`}
                        onClick={() => toggleDay(day)} style={{ minWidth: '76px' }}>
                        {day.slice(0,3)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid-2">
                  <div className="field">
                    <label>Post time (Bangkok time)</label>
                    <input type="time" value={postTime} onChange={e => setPostTime(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Target Facebook pages</label>
                    <select value={targetPage} onChange={e => setTargetPage(e.target.value as TargetPage)}>
                      <option value="both">Both pages</option>
                      <option value="page1">{cfg.page1Name} only</option>
                      <option value="page2">{cfg.page2Name} only</option>
                    </select>
                  </div>
                </div>

                {/* Live preview */}
                {previewDates.length > 0 && (
                  <div className="alert alert-info">
                    <strong>{previewDates.length} posts</strong> will be generated for {MONTHS[selMonth]} {selYear} —
                    posting {postDays.join(', ')} at {postTime}
                    {targetPage !== 'both' ? ` to ${pageName(targetPage)}` : ` to both pages`}
                  </div>
                )}

                <hr className="divider" />
                <div className="section-label">Content Pillar Balance</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {PILLARS.map(p => {
                    const n = Math.round(p.ratio * previewDates.length)
                    return (
                      <div key={p.pillar} style={{
                        background: PILLAR_COLORS[p.pillar] + '15',
                        border: `1px solid ${PILLAR_COLORS[p.pillar]}35`,
                        borderRadius: '8px', padding: '8px 14px', fontSize: '13px',
                      }}>
                        <span style={{ color: PILLAR_COLORS[p.pillar], fontWeight: 600 }}>{n} posts</span>
                        <span style={{ color: 'var(--text2)', marginLeft: '6px' }}>{p.pillar}</span>
                        <span style={{ color: 'var(--text3)', marginLeft: '4px', fontSize: '11px' }}>({Math.round(p.ratio * 100)}%)</span>
                      </div>
                    )
                  })}
                </div>

                <hr className="divider" />
                <div className="section-label">Optional Overrides</div>
                <div className="field">
                  <label>Monthly theme — leave blank to let Claude suggest one</label>
                  <input type="text" placeholder="e.g. 'EA Scam Awareness Month' or 'Risk Management Series'"
                    value={manualTheme} onChange={e => setManualTheme(e.target.value)} />
                </div>

                {genError && <div className="alert alert-error" style={{ marginBottom: '12px' }}>{genError}</div>}

                {phase === 'idle' || phase === 'done' ? (
                  <button className="btn btn-primary" onClick={handleGenerateCampaign}
                    style={{ fontSize: '15px', padding: '12px 28px', marginTop: '8px' }}>
                    🚀 Generate Full Month Campaign
                  </button>
                ) : (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                      <span className="spinner" style={{ width: '20px', height: '20px' }} />
                      <span style={{ fontSize: '14px', color: 'var(--text2)' }}>{progressLabel}</span>
                    </div>
                    <div style={{ background: 'var(--surface2)', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                      <div style={{ background: 'var(--blue)', height: '100%', width: `${progress}%`, transition: 'width 0.4s ease' }} />
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '6px' }}>{progress}% complete — switch to Review tab to watch posts appear live</div>
                  </div>
                )}
              </div>

              <div className="card" style={{ borderStyle: 'dashed', borderColor: 'var(--border2)' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>💡 What gets generated automatically</div>
                <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.9 }}>
                  ✓ <strong>Monthly theme & content goal</strong> — tailored to your brand stage<br/>
                  ✓ <strong>Topic plan</strong> — unique topic for every post, balanced across your 4 pillars<br/>
                  ✓ <strong>Full Thai post copy</strong> — hook, content, CTA, hashtags per post<br/>
                  ✓ <strong>Image prompt</strong> — Gemini-ready prompt for every post<br/>
                  ✓ <strong>Schedule dates</strong> — auto-spaced to your chosen posting days<br/>
                  ✓ <strong>Buffer scheduling</strong> — one click sends all posts to both pages
                </div>
              </div>
            </div>
          )}

          {/* ── REVIEW & EDIT ────────────────────────────────────────── */}
          {tab === 'review' && (
            <div>
              {!activeCampaign ? (
                <div className="card"><div className="empty-state">No campaign yet. Go to New Campaign to generate one.</div></div>
              ) : (
                <>
                  {/* Campaign summary bar */}
                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>{activeCampaign.month}</div>
                        <div style={{ fontSize: '14px', color: 'var(--text2)' }}>🎯 {activeCampaign.theme}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '2px' }}>{activeCampaign.goal}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className="badge badge-gray">{totalCount} posts</span>
                        {readyCount > 0 && <span className="badge badge-green">{readyCount} ready</span>}
                        {scheduledCount > 0 && <span className="badge badge-blue">{scheduledCount} scheduled</span>}
                        {generatingCount > 0 && <span className="badge badge-amber">{generatingCount} writing...</span>}
                        {failedCount > 0 && <span className="badge badge-red">{failedCount} failed</span>}
                      </div>
                    </div>

                    {/* Progress bar while generating */}
                    {generatingCount > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ background: 'var(--surface2)', borderRadius: '999px', height: '5px', overflow: 'hidden' }}>
                          <div style={{
                            background: 'var(--blue)', height: '100%',
                            width: `${Math.round(((totalCount - generatingCount) / totalCount) * 100)}%`,
                            transition: 'width 0.4s'
                          }} />
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>
                          {totalCount - generatingCount} of {totalCount} posts written
                        </div>
                      </div>
                    )}

                    {/* Image generation */}
                    {cfg.geminiKey && readyCount > 0 && activeCampaign.posts.some(p => p.status === 'ready' && !p.imageBase64) && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text2)' }}>
                          🖼 Generate images for all ready posts
                        </span>
                        <button className="btn btn-sm" onClick={handleGenerateAllImages}>Generate all images (Gemini)</button>
                      </div>
                    )}

                    {/* Schedule bar */}
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                      {scheduleMsg && <div className="alert alert-success" style={{ marginBottom: '10px' }}>{scheduleMsg}</div>}
                      {scheduleErr && <div className="alert alert-error" style={{ marginBottom: '10px', whiteSpace: 'pre-wrap' }}>{scheduleErr}</div>}
                      {scheduling && (
                        <div style={{ marginBottom: '10px' }}>
                          <div style={{ background: 'var(--surface2)', borderRadius: '999px', height: '5px', overflow: 'hidden' }}>
                            <div style={{ background: 'var(--blue)', height: '100%', width: `${scheduleProgress}%`, transition: 'width 0.3s' }} />
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>Scheduling to Buffer... {scheduleProgress}%</div>
                        </div>
                      )}
                      <div className="btn-group btn-group-end">
                        {scheduledCount > 0 && scheduledCount === totalCount
                          ? <span className="badge badge-blue" style={{ padding: '8px 16px', fontSize: '13px' }}>✓ All {scheduledCount} posts live in Buffer</span>
                          : <button className="btn btn-primary" onClick={handleScheduleAll}
                              disabled={scheduling || readyCount === 0 || generatingCount > 0}>
                              {scheduling
                                ? <><span className="spinner" /> Scheduling...</>
                                : `🚀 Schedule all ${readyCount} ready posts via Buffer`}
                            </button>
                        }
                      </div>
                    </div>
                  </div>

                  {/* Edit drawer */}
                  {editingPost && (
                    <div style={{
                      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200,
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                      padding: '2rem 1rem', overflowY: 'auto',
                    }}>
                      <div style={{
                        background: 'var(--surface)', borderRadius: '14px', padding: '1.5rem',
                        maxWidth: '600px', width: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '15px' }}>Edit — {editingPost.dayLabel}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>
                              {editingPost.pillar} · {editingPost.postType}
                            </div>
                          </div>
                          <button className="btn btn-sm" onClick={() => setEditingPost(null)}>✕</button>
                        </div>
                        <textarea value={editText} onChange={e => setEditText(e.target.value)}
                          style={{ minHeight: '280px', fontSize: '14px' }} />
                        <div className="char-count">{editText.length} characters</div>
                        <div className="btn-group btn-group-end" style={{ marginTop: '12px' }}>
                          <button className="btn" onClick={() => { handleRegeneratePost(editingPost.id); setEditingPost(null) }}>
                            ✨ Regenerate with AI
                          </button>
                          <button className="btn btn-primary" onClick={handleSaveEdit}>Save changes</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Posts week by week */}
                  {weekGroups().map(({ week, posts }) => (
                    <div key={week}>
                      <div style={{
                        fontSize: '11px', fontWeight: 700, color: 'var(--text3)',
                        letterSpacing: '0.07em', textTransform: 'uppercase',
                        margin: '1.25rem 0 8px',
                      }}>
                        Week {week}
                      </div>
                      {posts.map(post => (
                        <div key={post.id} className="queue-item" style={{
                          borderLeft: `3px solid ${PILLAR_COLORS[post.pillar]}`,
                          opacity: post.status === 'generating' ? 0.65 : 1,
                          transition: 'opacity 0.3s',
                        }}>
                          {/* Date col */}
                          <div style={{ minWidth: '72px', flexShrink: 0 }}>
                            <div style={{ fontSize: '12px', fontWeight: 600 }}>{post.dayLabel}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>
                              {new Date(post.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>

                          {/* Content col */}
                          <div className="queue-body">
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '5px', alignItems: 'center' }}>
                              <span className={`badge ${PILLAR_BADGES[post.pillar]}`} style={{ fontSize: '10px' }}>{post.pillar}</span>
                              <span className="badge badge-gray" style={{ fontSize: '10px' }}>{post.postType}</span>
                              {post.status === 'generating' && <span className="badge badge-amber" style={{ fontSize: '10px' }}>⏳ Writing</span>}
                              {post.status === 'ready' && <span className="badge badge-green" style={{ fontSize: '10px' }}>✓ Ready</span>}
                              {post.status === 'scheduled' && <span className="badge badge-blue" style={{ fontSize: '10px' }}>📅 Scheduled</span>}
                              {post.status === 'failed' && <span className="badge badge-red" style={{ fontSize: '10px' }}>✗ Failed</span>}
                              {post.imageBase64 && <span className="badge badge-purple" style={{ fontSize: '10px' }}>🖼 Image</span>}
                            </div>

                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                              {post.topic}
                            </div>

                            {post.text && (
                              <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.6 }}>
                                {post.text.slice(0, 150)}{post.text.length > 150 ? '…' : ''}
                              </div>
                            )}

                            {post.status === 'generating' && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                                <span className="spinner" />
                                <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Claude is writing this post...</span>
                              </div>
                            )}

                            {post.error && (
                              <div style={{ fontSize: '12px', color: 'var(--red)', marginTop: '4px' }}>{post.error}</div>
                            )}

                            {post.imageBase64 && (
                              <img src={`data:image/png;base64,${post.imageBase64}`} alt="Generated"
                                style={{ maxWidth: '100px', borderRadius: '6px', marginTop: '8px', border: '1px solid var(--border)' }} />
                            )}
                          </div>

                          {/* Actions col */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flexShrink: 0 }}>
                            {post.status !== 'generating' && (
                              <button className="btn btn-xs" onClick={() => { setEditingPost(post); setEditText(post.text) }}>Edit</button>
                            )}
                            {(post.status === 'ready' || post.status === 'failed') && (
                              <button className="btn btn-xs" onClick={() => handleRegeneratePost(post.id)}>Redo</button>
                            )}
                            {cfg.geminiKey && post.status === 'ready' && !post.imageBase64 && (
                              <button className="btn btn-xs" onClick={() => handleGenerateImage(post.id)}>🖼</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* ── HISTORY ──────────────────────────────────────────────── */}
          {tab === 'history' && (
            <div>
              <div className="card">
                <div className="card-title">🗂 Campaign History</div>
                {campaigns.length === 0 ? (
                  <div className="empty-state">No campaigns yet.</div>
                ) : campaigns.map(c => {
                  const scheduled = c.posts.filter(p => p.status === 'scheduled').length
                  const total = c.posts.length
                  const pct = total > 0 ? Math.round((scheduled / total) * 100) : 0
                  return (
                    <div key={c.id} className="queue-item" style={{ cursor: 'pointer' }}
                      onClick={() => { setActiveCampaign(c); setTab('review') }}>
                      <div className="queue-body">
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{c.month}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '2px' }}>🎯 {c.theme}</div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                          <span className="badge badge-gray">{total} posts</span>
                          <span className="badge badge-blue">{scheduled} scheduled</span>
                          <span className="badge badge-green">{pct}% complete</span>
                          <span style={{ fontSize: '11px', color: 'var(--text3)', alignSelf: 'center' }}>
                            Created {new Date(c.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <span style={{ fontSize: '13px', color: 'var(--blue)', flexShrink: 0 }}>View →</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── SETUP ────────────────────────────────────────────────── */}
          {tab === 'setup' && (
            <div>
              <div className="card">
                <div className="card-title">🔑 API Keys</div>
                <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                  Keys are stored locally in your browser. Nothing is saved to any external database.
                </div>
                {[
                  { label: 'Anthropic API key — Claude Sonnet (required for content)', key: 'anthropicKey', ph: 'sk-ant-...' },
                  { label: 'Buffer access token (required for scheduling)', key: 'bufferToken', ph: 'Your Buffer access token...' },
                  { label: 'Gemini API key — Imagen 3 (optional, for image generation)', key: 'geminiKey', ph: 'Your Gemini API key...' },
                ].map(({ label, key, ph }) => (
                  <div className="field" key={key}>
                    <label>{label}</label>
                    <input type="password" placeholder={ph}
                      value={(cfg as any)[key]}
                      onChange={e => setCfg({ ...cfg, [key]: e.target.value })} />
                  </div>
                ))}
              </div>

              <div className="card">
                <div className="card-title">📄 Facebook Pages</div>
                <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                  Find your Buffer profile IDs:<br/>
                  <code style={{ fontSize: '12px' }}>GET https://api.bufferapp.com/1/profiles.json?access_token=YOUR_TOKEN</code>
                </div>
                <div className="grid-2">
                  {[1,2].map(n => (
                    <div key={n}>
                      <div className="section-label">Page {n}</div>
                      <div className="field"><label>Display name</label>
                        <input type="text" placeholder={`e.g. ${n === 1 ? 'Leverage100x' : 'My Trading Page'}`}
                          value={n === 1 ? cfg.page1Name : cfg.page2Name}
                          onChange={e => setCfg({ ...cfg, [n === 1 ? 'page1Name' : 'page2Name']: e.target.value })} /></div>
                      <div className="field"><label>Buffer profile ID</label>
                        <input type="text" placeholder="5f1234abc..."
                          value={n === 1 ? cfg.page1Id : cfg.page2Id}
                          onChange={e => setCfg({ ...cfg, [n === 1 ? 'page1Id' : 'page2Id']: e.target.value })} /></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-title">🎨 Brand Identity</div>
                <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '1rem' }}>
                  Pre-loaded with your Leverage100x brand profile. Claude reads this to generate on-brand content.
                </p>
                <div className="grid-2">
                  <div className="field"><label>Brand name</label>
                    <input type="text" value={cfg.brandName} onChange={e => setCfg({ ...cfg, brandName: e.target.value })} /></div>
                  <div className="field"><label>Tagline</label>
                    <input type="text" value={cfg.tagline} onChange={e => setCfg({ ...cfg, tagline: e.target.value })} /></div>
                </div>
                <div className="field"><label>Target audience</label>
                  <textarea value={cfg.audience} onChange={e => setCfg({ ...cfg, audience: e.target.value })} style={{ minHeight: '70px' }} /></div>
                <div className="grid-2">
                  <div className="field"><label>Brand tone</label>
                    <input type="text" value={cfg.tone} onChange={e => setCfg({ ...cfg, tone: e.target.value })} /></div>
                  <div className="field"><label>Content topics / pillars</label>
                    <input type="text" value={cfg.topics} onChange={e => setCfg({ ...cfg, topics: e.target.value })} /></div>
                </div>
                <div className="grid-2">
                  <div className="field"><label>Visual style (for image prompts)</label>
                    <input type="text" value={cfg.visualStyle} onChange={e => setCfg({ ...cfg, visualStyle: e.target.value })} /></div>
                  <div className="field"><label>Default call-to-action</label>
                    <input type="text" value={cfg.defaultCta} onChange={e => setCfg({ ...cfg, defaultCta: e.target.value })} /></div>
                </div>
                <div className="btn-group btn-group-end">
                  <button className="btn btn-primary" onClick={handleSaveSetup}>Save all settings</button>
                </div>
                {saved && <div className="alert alert-success" style={{ marginTop: '10px' }}>✓ Settings saved.</div>}
              </div>
            </div>
          )}

        </div>
      </main>
    </>
  )
}
