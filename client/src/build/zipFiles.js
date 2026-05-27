import { zip } from 'fflate'

/**
 * Fetch the current preview HTML from the server-side store and pack it
 * into a ZIP suitable for POSTing to /api/deploy. Returns a browser
 * File object with the multipart-friendly type/filename set.
 *
 * Same-origin fetch from the parent page (not the sandboxed iframe), so
 * no CSP / sandbox restrictions apply. The server sends Cache-Control:
 * no-store on preview responses, so this always reads the current file.
 */
export async function zipPreview(previewUrl) {
  const res = await fetch(previewUrl, { credentials: 'same-origin', cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Could not fetch the preview (${res.status}). The session may have expired.`)
  }
  const html = await res.text()

  const buf = await new Promise((resolve, reject) => {
    zip({ 'index.html': new TextEncoder().encode(html) }, { level: 6 }, (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  })

  return new File([buf], 'site.zip', { type: 'application/zip' })
}
