<script lang="ts" module>
  // One stroke icon set, 16px grid, 1.6 stroke, round joins.
  const PATHS = {
    plus: 'M8 3v10M3 8h10',
    x: 'M4 4l8 8M12 4l-8 8',
    trash: 'M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5',
    edit: 'M10.5 3l2.5 2.5L6 12.5H3.5V10z',
    sun: 'M8 5.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6zM8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1',
    moon: 'M13 9.6A5.5 5.5 0 0 1 6.4 3a5.5 5.5 0 1 0 6.6 6.6z',
    warning: 'M8 2l6.5 11.5h-13zM8 6.5v3M8 11.6v.1',
    issue: 'M5.5 2h5L14 5.5v5L10.5 14h-5L2 10.5v-5zM8 5v3.6M8 10.9v.1',
    info: 'M8 1.8a6.2 6.2 0 1 0 0 12.4A6.2 6.2 0 0 0 8 1.8zM8 7.2v4M8 4.9v.1',
    copy: 'M5.5 5.5h7v7h-7zM3.5 10.5v-7h7',
    download: 'M8 2.5v8M4.8 7.5L8 10.7l3.2-3.2M3 13.5h10',
    open: 'M2.5 4.5h4l1.2 1.5h5.8v6.5h-11zM8 11V7.5M6.5 9L8 7.5 9.5 9',
    save: 'M3 2.5h8l2 2v9H3zM5.5 2.5v3h5v-3M5 13.5V9h6v4.5',
    back: 'M7 3.5L2.5 8 7 12.5M2.8 8h10.7',
    check: 'M3 8.5l3.2 3L13 4.5',
    chevron: 'M6 4l4 4-4 4',
    grip: 'M6 4h.01M10 4h.01M6 8h.01M10 8h.01M6 12h.01M10 12h.01',
    ring: 'M8 2.2a5.8 5.8 0 1 0 0 11.6A5.8 5.8 0 0 0 8 2.2z',
  } as const

  export type IconName = keyof typeof PATHS
</script>

<script lang="ts">
  let { name, size = 16 }: { name: IconName; size?: number } = $props()
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 16 16"
  fill="none"
  stroke="currentColor"
  stroke-width="1.6"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <path d={PATHS[name]} />
</svg>

<style>
  svg {
    flex: none;
    display: block;
  }
</style>
