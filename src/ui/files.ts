/** Hands the text to the browser as a file download. */
export function download(fileName: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

/** A file name from a plan or pool name, keeping letters, digits, dots, dashes and underscores. */
export function safeFileName(name: string, fallback: string): string {
  const cleaned = name.trim().replace(/[^\w.-]+/g, '-')
  return cleaned === '' ? fallback : cleaned
}
