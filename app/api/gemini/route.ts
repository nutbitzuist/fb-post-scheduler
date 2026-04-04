import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { apiKey, prompt } = await req.json()

    const key = apiKey || process.env.GEMINI_API_KEY
    if (!key) return NextResponse.json({ error: 'No Gemini API key provided' }, { status: 400 })
    if (!prompt) return NextResponse.json({ error: 'No prompt provided' }, { status: 400 })

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1 },
        }),
      }
    )

    const data = await response.json()
    if (!response.ok || data.error) {
      return NextResponse.json({ error: data.error?.message || 'Gemini API error' }, { status: 400 })
    }

    const imageBase64 = data.predictions?.[0]?.bytesBase64Encoded
    if (!imageBase64) return NextResponse.json({ error: 'No image returned from Gemini' }, { status: 400 })

    return NextResponse.json({ imageBase64 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
