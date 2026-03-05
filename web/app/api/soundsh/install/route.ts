import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { spawnSync } from 'child_process'
import { PACKS_DIR, ASSIGNMENTS_PATH } from '@/lib/packs'

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

interface SoundshSound {
  hookEvent: string
  slug: string
  audioUrl: string
  durationMs: number
}

interface SoundshTheme {
  id: string
  name: string
  slug: string
  description: string
  installsCount: number
  sounds: SoundshSound[]
}

interface Assignments {
  global: Record<string, string>
  agents: Record<string, unknown>
  skills: Record<string, unknown>
  settings: {
    masterVolume: number
    enabled: boolean
    theme: string
    uiTheme: string
  }
}

const DEFAULT_ASSIGNMENTS: Assignments = {
  global: {},
  agents: {},
  skills: {},
  settings: { masterVolume: 1, enabled: true, theme: 'terran', uiTheme: 'sc2' },
}

// sounds.sh uses "TaskCompleted"; agentcraft uses "Stop"
function normalizeHookEvent(hookEvent: string): string {
  return hookEvent === 'TaskCompleted' ? 'Stop' : hookEvent
}

// Extract filename from a slug like "soundsh/minecraft-villager-hmm" → "minecraft-villager-hmm.mp3"
function filenameFromSlug(slug: string): string {
  const base = slug.includes('/') ? slug.slice(slug.lastIndexOf('/') + 1) : slug
  return `${base}.mp3`
}

async function readAssignments(): Promise<Assignments> {
  try {
    const raw = await readFile(ASSIGNMENTS_PATH, 'utf-8')
    return { ...DEFAULT_ASSIGNMENTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_ASSIGNMENTS }
  }
}

// POST { themeSlug: string, applyAssignments?: boolean }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { themeSlug, applyAssignments = false } = body

    if (!themeSlug || !SLUG_RE.test(themeSlug)) {
      return NextResponse.json({ error: 'Invalid themeSlug' }, { status: 400 })
    }

    // Fetch theme metadata from sounds.sh
    const themeRes = await fetch(`https://sounds.sh/api/themes/${themeSlug}`)
    if (!themeRes.ok) {
      return NextResponse.json(
        { error: `Theme not found: ${themeSlug}` },
        { status: themeRes.status === 404 ? 404 : 502 }
      )
    }
    const theme: SoundshTheme = await themeRes.json()

    const packDir = join(PACKS_DIR, 'soundsh', themeSlug)
    await mkdir(packDir, { recursive: true })

    // Download each sound file — clean up partial dir on any failure
    const hookAssignments: Record<string, string> = {}

    try {
      for (const sound of theme.sounds) {
        const filename = filenameFromSlug(sound.slug)
        const dest = join(packDir, filename)

        const audioRes = await fetch(sound.audioUrl)
        if (!audioRes.ok) throw new Error(`Failed to download sound: ${sound.slug}`)
        const buf = await audioRes.arrayBuffer()
        await writeFile(dest, Buffer.from(buf))

        const normalizedEvent = normalizeHookEvent(sound.hookEvent)
        // Only set Stop if not already assigned (TaskCompleted maps to Stop)
        if (!(normalizedEvent in hookAssignments)) {
          // Store as full assignment path for consistency
          hookAssignments[normalizedEvent] = `soundsh/${themeSlug}:${filename}`
        }
      }
    } catch (err) {
      spawnSync('rm', ['-rf', packDir])
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Download failed' },
        { status: 502 }
      )
    }

    // Write pack.json
    const manifest = {
      name: theme.name,
      description: theme.description,
      version: '1.0.0',
      source: 'soundsh',
      themeSlug,
      types: ['sounds'],
      hookAssignments,
    }
    await writeFile(join(packDir, 'pack.json'), JSON.stringify(manifest, null, 2))

    // Optionally apply assignments globally
    if (applyAssignments) {
      const assignments = await readAssignments()
      for (const [hookEvent, path] of Object.entries(hookAssignments)) {
        assignments.global[hookEvent] = path
      }
      await writeFile(ASSIGNMENTS_PATH, JSON.stringify(assignments, null, 2))
    }

    // Best-effort install ping — don't fail the request if this errors
    fetch(`https://sounds.sh/api/themes/${themeSlug}/install`, { method: 'POST' }).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Install failed' }, { status: 500 })
  }
}

// DELETE { themeSlug: string }
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { themeSlug } = body

    if (!themeSlug || !SLUG_RE.test(themeSlug)) {
      return NextResponse.json({ error: 'Invalid themeSlug' }, { status: 400 })
    }

    const packDir = join(PACKS_DIR, 'soundsh', themeSlug)
    spawnSync('rm', ['-rf', packDir])

    // Clear any global assignments pointing at this pack
    const assignments = await readAssignments()
    const prefix = `soundsh/${themeSlug}:`
    let changed = false
    for (const [hookEvent, value] of Object.entries(assignments.global)) {
      if (typeof value === 'string' && value.startsWith(prefix)) {
        delete assignments.global[hookEvent]
        changed = true
      }
    }
    if (changed) {
      await writeFile(ASSIGNMENTS_PATH, JSON.stringify(assignments, null, 2))
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Remove failed' }, { status: 500 })
  }
}
