/**
 * lib/share.ts
 *
 * Independent share utilities — no component imports this file's way,
 * only the other way around, so it can be reused anywhere a "share this
 * thing" action is needed, not just the nominate page.
 */

/** Builds a deep link straight to one nominee, inside one category, on one poll. */
export function buildNominationShareUrl(pollId: string, categoryId: string, nomineeId: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const params = new URLSearchParams({ cat: categoryId, contestant: nomineeId })
  return `${origin}/polls/nominate/${pollId}?${params.toString()}`
}

export function buildNominationShareMessage(contestantName: string, categoryName: string): string {
  return `Hi there, could you please nominate ${contestantName} for ${categoryName}? It'll help a lot`
}

/** Builds a deep link straight to one contestant on a real voting poll. */
export function buildVotingShareUrl(pollName: string, contestantId: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const params = new URLSearchParams({ contestant: contestantId })
  return `${origin}/polls/${encodeURIComponent(pollName)}?${params.toString()}`
}

export function buildVotingShareMessage(contestantName: string, pollName: string): string {
  return `Hi there, could you please vote for ${contestantName} in ${pollName}? It'll help a lot`
}

export type ShareMethod = "native" | "clipboard" | "failed"

/**
 * Uses the Web Share API when available (mobile browsers, mostly), and
 * falls back to copying "message + url" to the clipboard everywhere else.
 */
export async function shareOrCopy(opts: { title?: string; text: string; url: string }): Promise<ShareMethod> {
  const { title, text, url } = opts

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text, url })
      return "native"
    } catch (err) {
      // AbortError just means the user closed the native share sheet —
      // don't fall through to clipboard in that case.
      if (err instanceof DOMException && err.name === "AbortError") return "failed"
      // Any other failure (unsupported combo, etc.) — fall back below.
    }
  }

  try {
    await navigator.clipboard.writeText(`${text} ${url}`)
    return "clipboard"
  } catch {
    return "failed"
  }
}
