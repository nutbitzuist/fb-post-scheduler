export interface BufferResult {
  success: boolean
  id?: string
  error?: string
}

export async function scheduleToBuffer(
  token: string,
  profileId: string,
  text: string,
  scheduledAt: string
): Promise<BufferResult> {
  const response = await fetch('/api/buffer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, profileId, text, scheduledAt }),
  })
  const data = await response.json()
  if (!response.ok) return { success: false, error: data.error }
  return { success: true, id: data.id }
}

export async function schedulePostToPages(
  token: string,
  page1Id: string,
  page2Id: string,
  targetPage: 'both' | 'page1' | 'page2',
  text: string,
  scheduledAt: string
): Promise<{ success: boolean; ids: string[]; errors: string[] }> {
  const ids: string[] = []
  const errors: string[] = []
  const profileIds =
    targetPage === 'both' ? [page1Id, page2Id].filter(Boolean) :
    targetPage === 'page1' ? [page1Id].filter(Boolean) :
    [page2Id].filter(Boolean)

  for (const pid of profileIds) {
    const result = await scheduleToBuffer(token, pid, text, scheduledAt)
    if (result.success && result.id) ids.push(result.id)
    else errors.push(result.error || 'Unknown error')
  }

  return { success: errors.length === 0, ids, errors }
}

