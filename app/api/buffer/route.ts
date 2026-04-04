import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { token, profileId, text, scheduledAt } = await req.json()

    const accessToken = token || process.env.BUFFER_ACCESS_TOKEN
    if (!accessToken) return NextResponse.json({ error: 'No Buffer access token provided' }, { status: 400 })
    if (!profileId) return NextResponse.json({ error: 'No Buffer profile ID provided' }, { status: 400 })

    const scheduledTime = Math.floor(new Date(scheduledAt).getTime() / 1000)

    const body: Record<string, unknown> = {
      profile_ids: [profileId],
      text,
      scheduled_at: new Date(scheduledAt).toISOString(),
    }

    // Only add scheduled_at as unix if valid
    if (!isNaN(scheduledTime)) {
      body.scheduled_at = new Date(scheduledAt).toISOString()
    }

    const response = await fetch('https://api.bufferapp.com/1/updates/create.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        access_token: accessToken,
        'profile_ids[]': profileId,
        text,
        scheduled_at: new Date(scheduledAt).toISOString(),
        now: 'false',
      }).toString(),
    })

    const data = await response.json()
    if (!response.ok || data.error) {
      return NextResponse.json({ error: data.error || data.message || 'Buffer API error' }, { status: 400 })
    }

    return NextResponse.json({ success: true, id: data.updates?.[0]?.id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
