import { describe, expect, it } from 'vitest'
import { inlineMarkdown } from './markdown'

describe('inlineMarkdown', () => {
  it('renders bold and code', () => {
    expect(inlineMarkdown('Click **Create Pool** and enter `hdd01`.')).toBe(
      'Click <strong>Create Pool</strong> and enter <code>hdd01</code>.',
    )
  })

  it('escapes HTML from the plan', () => {
    expect(inlineMarkdown('Name `<img src=x onerror=alert(1)>`')).toBe(
      'Name <code>&lt;img src=x onerror=alert(1)&gt;</code>',
    )
  })
})
