export function esUrlPdf(url: string): boolean {
  return /\.pdf(\?|#|$)/i.test(url.trim())
}
