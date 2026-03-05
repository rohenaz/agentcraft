import { NextResponse } from 'next/server'

export const revalidate = 3600 // cache 1 hour

export async function GET() {
  const r = await fetch('https://sounds.sh/api/themes', { next: { revalidate: 3600 } })
  if (!r.ok) return NextResponse.json({ error: 'Failed to fetch themes' }, { status: 502 })
  const data = await r.json()
  // sounds.sh wraps themes in { themes: [...] }
  const themes = Array.isArray(data) ? data : (data.themes ?? data)
  return NextResponse.json(themes)
}
