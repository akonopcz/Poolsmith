<script lang="ts">
  import { TERMS, type Term } from './terms'

  let { term, label }: { term: Term; label: string } = $props()

  const id = $props.id()
</script>

<button
  type="button"
  class="term"
  popovertarget="term-{id}"
  style:anchor-name="--term-{id}"
  aria-label="{label}: explanation"
>
  {label}
</button><span popover id="term-{id}" class="pop" style:position-anchor="--term-{id}">
  <strong>{label}</strong>
  {TERMS[term]}
</span>

<style>
  .term {
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    color: inherit;
    text-decoration: underline dotted;
    text-decoration-color: var(--ink-3);
    text-underline-offset: 3px;
    cursor: help;
  }

  .term:hover {
    text-decoration-color: currentColor;
  }

  .pop {
    inset: auto;
    margin: 4px 0;
    width: min(320px, calc(100vw - 32px));
    padding: 12px 14px;
    border: 1px solid var(--rule-strong);
    border-radius: 8px;
    background: var(--raise);
    color: var(--ink);
    font-size: 13px;
    font-weight: 400;
    line-height: 1.5;
    text-transform: none;
    letter-spacing: 0;
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.28);
    position-area: bottom span-right;
    position-try-fallbacks:
      flip-block,
      flip-inline,
      flip-block flip-inline;
  }

  @supports not (position-area: bottom) {
    .pop {
      inset: auto 16px 16px auto;
    }
  }

  .pop strong {
    display: block;
    margin-bottom: 4px;
  }
</style>
