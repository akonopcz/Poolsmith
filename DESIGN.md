---
name: Poolsmith
description: A visual planner for ZFS pool layouts, drawn as a transit network on midnight enamel.
colors:
  ground: '#0a1632'
  panel: '#0e1d3f'
  raise: '#142853'
  ink: '#eef1ea'
  ink-2: '#b3bdca'
  ink-3: '#97a3b6'
  rule: '#20345f'
  rule-strong: '#34497a'
  bay-empty: '#12234a'
  bay-full: '#1a3062'
  on-line: '#0a1632'
  line-data: '#5b93ff'
  line-special: '#b585ff'
  line-log: '#45cf91'
  line-cache: '#3cc6d8'
  line-spare: '#929cab'
  issue: '#ff7b6e'
  issue-bg: '#3a1a1e'
  warning: '#f0b43c'
  warning-bg: '#2f2714'
  info: '#9db9df'
  info-bg: '#13264d'
  gain: '#45cf91'
  loss: '#ff9a8f'
  focus: '#ffffff'
  mark: 'color-mix(in srgb, #eef1ea 14%, transparent)'
  ground-light: '#fbfbfa'
  panel-light: '#f1f2f0'
  raise-light: '#ffffff'
  ink-light: '#15181c'
  ink-2-light: '#474d56'
  ink-3-light: '#5f656e'
  rule-light: '#dcdfdc'
  rule-strong-light: '#b9bdba'
  bay-empty-light: '#e8eae8'
  bay-full-light: '#ffffff'
  on-line-light: '#ffffff'
  line-data-light: '#1d4fd8'
  line-special-light: '#7b3fc0'
  line-log-light: '#10804f'
  line-cache-light: '#0a7486'
  line-spare-light: '#646b75'
  issue-light: '#b8271f'
  issue-bg-light: '#fbe5e2'
  warning-light: '#8f5a00'
  warning-bg-light: '#fbefd2'
  info-light: '#3d5a80'
  info-bg-light: '#e5edf7'
  gain-light: '#10804f'
  loss-light: '#b8271f'
  focus-light: '#15181c'
  mark-light: 'color-mix(in srgb, #15181c 9%, transparent)'
typography:
  display:
    fontFamily: 'Overpass Variable, system-ui, sans-serif'
    fontSize: '32px'
    fontWeight: 800
    lineHeight: 1
    letterSpacing: '-0.03em'
    fontFeature: '"tnum"'
  headline:
    fontFamily: 'Overpass Variable, system-ui, sans-serif'
    fontSize: '28px'
    fontWeight: 800
    letterSpacing: '-0.02em'
    fontFeature: '"tnum"'
  wordmark:
    fontFamily: 'Overpass Variable, system-ui, sans-serif'
    fontSize: '18px'
    fontWeight: 800
    letterSpacing: '-0.01em'
  title:
    fontFamily: 'Overpass Variable, system-ui, sans-serif'
    fontSize: '15px'
    fontWeight: 700
    fontFeature: '"tnum"'
  body:
    fontFamily: 'Overpass Variable, system-ui, sans-serif'
    fontSize: '14px'
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: '"tnum"'
  body-small:
    fontFamily: 'Overpass Variable, system-ui, sans-serif'
    fontSize: '13px'
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: '"tnum"'
  label:
    fontFamily: 'Overpass Variable, system-ui, sans-serif'
    fontSize: '12px'
    fontWeight: 600
    fontFeature: '"tnum"'
  column-title:
    fontFamily: 'Overpass Variable, system-ui, sans-serif'
    fontSize: '12px'
    fontWeight: 700
    letterSpacing: '0.08em'
  bullet:
    fontFamily: 'Overpass Variable, system-ui, sans-serif'
    fontSize: '12px'
    fontWeight: 800
    lineHeight: 1
    letterSpacing: '0.01em'
  micro:
    fontFamily: 'Overpass Variable, system-ui, sans-serif'
    fontSize: '10px'
    fontWeight: 400
    fontFeature: '"tnum"'
  mono:
    fontFamily: 'ui-monospace, SFMono-Regular, JetBrains Mono, Menlo, monospace'
    fontSize: '13px'
    lineHeight: 1.6
rounded:
  bay: '4px'
  control: '6px'
  panel: '8px'
  bullet: '12px'
  dot: '50%'
spacing:
  xxs: '4px'
  xs: '6px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '20px'
  2xl: '24px'
  3xl: '32px'
components:
  button-primary:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.ground}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: '0 12px'
    height: '32px'
  button-primary-hover:
    backgroundColor: '{colors.ink-2}'
    textColor: '{colors.ground}'
  button-secondary:
    backgroundColor: 'transparent'
    textColor: '{colors.ink}'
    rounded: '{rounded.control}'
    padding: '0 12px'
    height: '32px'
  button-secondary-hover:
    backgroundColor: '{colors.raise}'
  button-quiet:
    backgroundColor: 'transparent'
    textColor: '{colors.ink-2}'
    rounded: '{rounded.control}'
    padding: '0 12px'
    height: '32px'
  button-small:
    padding: '0 10px'
    height: '28px'
  field-input:
    backgroundColor: '{colors.raise}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.control}'
    padding: '0 8px'
    height: '32px'
  segmented-option:
    backgroundColor: 'transparent'
    textColor: '{colors.ink-2}'
    rounded: '{rounded.control}'
    padding: '0 10px'
    height: '30px'
  segmented-option-active:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.ground}'
  line-bullet:
    backgroundColor: '{colors.line-data}'
    textColor: '{colors.on-line}'
    typography: '{typography.bullet}'
    rounded: '{rounded.bullet}'
    padding: '0 6px'
    height: '24px'
  vdev-line:
    backgroundColor: '{colors.raise}'
    rounded: '{rounded.panel}'
    padding: '10px 8px 10px 14px'
  station-dot:
    backgroundColor: '{colors.raise}'
    rounded: '{rounded.dot}'
    size: '18px'
  disk-tile:
    backgroundColor: '{colors.bay-full}'
    textColor: '{colors.ink}'
    rounded: '{rounded.bay}'
    padding: '4px 2px'
    height: '64px'
  bay-empty:
    backgroundColor: '{colors.bay-empty}'
    textColor: '{colors.ink-3}'
    rounded: '{rounded.bay}'
    height: '64px'
  finding-issue:
    backgroundColor: '{colors.issue-bg}'
    textColor: '{colors.ink}'
    typography: '{typography.body-small}'
    rounded: '{rounded.panel}'
    padding: '10px 12px'
  finding-warning:
    backgroundColor: '{colors.warning-bg}'
    textColor: '{colors.ink}'
    typography: '{typography.body-small}'
    rounded: '{rounded.panel}'
    padding: '10px 12px'
  finding-info:
    backgroundColor: 'transparent'
    textColor: '{colors.ink-2}'
    typography: '{typography.body-small}'
    padding: '10px 12px 10px 0'
  tab:
    backgroundColor: 'transparent'
    textColor: '{colors.ink-2}'
    padding: '0 14px'
    height: '40px'
  tab-active:
    textColor: '{colors.ink}'
  drop-zone:
    backgroundColor: 'transparent'
    textColor: '{colors.ink-3}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: '4px 12px'
    height: '28px'
  top-bar:
    backgroundColor: '{colors.panel}'
    textColor: '{colors.ink}'
    padding: '0 16px 0 24px'
    height: '56px'
---

# Design System: Poolsmith

## Overview

**Creative North Star: "The Midnight Transit Map"**

Poolsmith draws a storage pool as a transit network. Every vdev is a line with its own coloured bullet, every disk is a station on it, and the same bullet appears on the disk in its bay and on the line in the pool, so hardware and pool read as one map. The ground is midnight-blue enamel; type is porcelain-white signage set in Overpass with tabular figures. The light theme swaps to white enamel and keeps every line ink and its meaning.

The screen is dense and calm, built for a person trying many layouts in one sitting. Three fixed columns (hardware, pool, estimate) separate by ground tone and hairline rules. Colour is spent on meaning only: five line inks name vdev roles, red and amber name issues and warnings, and everything else stays in the ink and enamel neutrals. Selection and focus are white (dark) or near-black (light) so they never read as a line or a warning.

The system refuses the admin template: no sidebar navigation, no stat-card grids, no blue call-to-action buttons. The primary button is porcelain ink on enamel, and the most important interaction (dragging a disk onto a line) needs no button at all.

**Key Characteristics:**

- Line bullets shared by bay and vdev are the signature; they carry the network metaphor.
- Fixed line inks with fixed meaning in both themes.
- Flat, tonal depth: ground, panel and raise steps plus 1px rules, almost no shadow.
- Tabular figures everywhere, so numbers hold their position while values change.
- Hovering a line, station, disk or finding dims everything not involved.

## Colors

Midnight enamel neutrals with a small set of saturated signal inks, each tied to one meaning.

### Primary

- **Porcelain Signage** (ink): primary text, the primary button fill, the active segmented option, the active tab underline and the current step roundel. In light mode it becomes near-black (ink-light).
- **Midnight Enamel** (ground): the page and the centre column. Also the text colour on porcelain fills.

### Secondary

The five line inks. Each is bound to one vdev role and is set through a per-element `--line` property, never chosen per screen.

- **Data Cobalt** (line-data): data vdevs (bullets D1, D2...).
- **Special Violet** (line-special): special vdevs (S1...).
- **Log Green** (line-log): log vdevs (L1...).
- **Cache Teal** (line-cache): cache devices (C).
- **Spare Grey** (line-spare): spares (SP).

Line inks appear as the bullet fill, the 5px track behind station dots, the station dot ring, the border of a bay that holds a placed disk (55% mixed into the strong rule), and the 12% tint of a drop target under a dragged disk.

### Tertiary

Signals, reserved for findings and deltas.

- **Signal Red** (issue) on **Red Wash** (issue-bg): issues ZFS would refuse; borders of the offending part, issue finding rows, load errors.
- **Caution Amber** (warning) on **Amber Wash** (warning-bg): risky choices; part borders, warning finding rows, "no disk may fail".
- **Notice Blue-Grey** (info) on **Notice Wash** (info-bg): quiet hints and the first-start guide note.
- **Gain Green** (gain) and **Loss Coral** (loss): the brief delta that flashes next to usable space after an edit.

### Neutral

- **Night Platform** (panel): the top bar, the estimate bar and the footer, one step lighter than ground.
- **Lit Panel** (raise): vdev lines, filled support rows, inputs, popovers, inline code.
- **Faded Porcelain** (ink-2): secondary text, field labels, quiet buttons, inactive tabs.
- **Platform Grey** (ink-3): hints, placeholders, station names, bay numbers, footnotes.
- **Track Rule** (rule): region dividers, line row borders, table rules.
- **Strong Rule** (rule-strong): control borders, dashed drop zones, disk tile borders.
- **Empty Bay** (bay-empty) and **Occupied Bay** (bay-full): bay slots without and with a disk.
- **Bullet Text** (on-line): text on a line ink fill.
- **Focus White** (focus): focus outlines, the picked station and the picked disk tile.
- **Row Mark** (mark): the highlighted current row in the efficiency table.

### Named Rules

**The Fixed Ink Rule.** A line ink means one vdev role, in both themes, on every surface. Never use a line ink for decoration, emphasis or a button.

**The Signal Reserve Rule.** Red and amber belong to issues and warnings only. Gain green and loss coral appear only in the usable-space delta.

**The Neutral Focus Rule.** Selection and focus use the focus token (white in dark, near-black in light), never a hue, so they cannot be mistaken for a line or a finding.

## Typography

**Display Font:** Overpass Variable (with system-ui, sans-serif)
**Body Font:** Overpass Variable (with system-ui, sans-serif)
**Label/Mono Font:** ui-monospace stack (SFMono-Regular, JetBrains Mono, Menlo), only for code and the `zpool create` output

**Character:** Overpass is highway-signage type: open, upright and legible at small sizes, which suits station names and bay numbers. Tabular figures are switched on globally, so every number aligns and does not jitter while values update.

### Hierarchy

- **Display** (800, 32px, line-height 1, -0.03em): the usable-space number in the estimate bar. One per screen.
- **Headline** (800, 28px, -0.02em): view titles, currently the Export view.
- **Wordmark** (800, 18px, -0.01em): the Poolsmith name in the top bar, next to a ring icon. The unit beside the display number also uses 18px, at 600.
- **Title** (700, 15px): group heads (Data, Special, Log, Cache, Spare), enclosure names, form titles, export subheads.
- **Body** (400, 14px, line-height 1.45): default text and input values (inputs at 600). Export prose caps at 65 to 72ch.
- **Body small** (13px): findings, tables, the guide note, button text (600).
- **Label** (600, 12px): field labels, meta lines, hints, drop-zone text.
- **Column title** (700, 12px, 0.08em, uppercase): only the column headings HARDWARE and ESTIMATE.
- **Bullet** (800, 12px, 0.01em): line bullet codes; 10 to 11px in disk tiles and fault-tolerance facts.
- **Micro** (400, 10px): bay numbers, disk type, station names. Only inside bays and under station dots.

### Named Rules

**The Tabular Rule.** All figures are tabular (`tnum`). Never switch to proportional figures for a number that can change.

**The One Big Number Rule.** Display size is for usable space alone. Fault tolerance and other facts sit at body size, bold, in the facts list below it.

## Layout

A working screen between a 56px top bar and a 32px footer: an estimate bar across the full width, below it two columns. Hardware on the left is as wide as its enclosures need, at most half the window and at least 340px; the pool on the right takes the rest (at least 480px). Enclosures flow side by side when they fit, left-aligned, and the column takes the widest row. A divider between the two columns can be dragged (or moved with the arrow keys); a double-click returns to the automatic width, and the dragged width is remembered in the browser. Each column scrolls on its own and the screen height is 100vh minus top bar and footer. The estimate bar sits on panel ground, hardware and pool on ground, separated by 1px rules; there are no boxed regions.

Column padding is 20px top and 24px sides, with 32px at the bottom of scroll areas. Rhythm runs on 4px steps: 4px between bays, 6px between line rows and add buttons, 8px under heads, 20 to 24px between groups and enclosures. Bay grids follow each enclosure's real column count at one fixed scale shaped like the carriers: SFF 48 × 96px (upright), LFF 88 × 64px (flat), M.2 104 × 56px, PCIe add-in card 160 × 56px. Bays shrink only when the column is narrower than the enclosure.

The Export view is a single centred column (max 860px, 32px top padding) with tabs under the title.

Below 900px the columns stack into one, the estimate moves to the top, editing controls hide and fields become read-only text. Small screens are for reading a plan, not editing it.

## Elevation & Depth

Flat and tonal. Depth comes from three ground steps (ground, panel, raise) and 1px rules. Shadows exist only where something genuinely floats or needs a ring.

### Shadow Vocabulary

- **Popover lift** (`box-shadow: 0 8px 24px rgb(0 0 0 / 0.28)`): the term explanation popover, the only floating layer.
- **Picked ring** (`box-shadow: 0 0 0 1px var(--focus)`): doubles the border of a picked disk tile.
- **Tab underline** (`box-shadow: inset 0 -3px 0 var(--ink)`): the active pool or export tab.
- **Hollow bullet** (`box-shadow: inset 0 0 0 2px var(--line)`): the bullet of an empty cache or spare row.

### Named Rules

**The Flat Ground Rule.** Surfaces rest flat. A part lifts by moving one ground step (ground to raise), never by gaining a drop shadow.

## Shapes

Small, consistent corners that grow with the size of the part: 4px for bays, tiles, inline code and the pool letter badge; 6px for buttons, fields, segmented controls and drop zones; 8px for line rows, findings, guide notes, popovers and code blocks. Bullets are pills (12px radius on a 24px height) and station dots are circles with a 4px ink ring. Lines are 5px tracks with 3px rounded ends.

Dashed borders mean "empty, drop here": drop zones and empty support rows use 1.5px dashed strong rules, an empty line track is a 3px dashed line at 60% ink, and a disk taken by another pool shows a dashed tile on no fill.

## Components

### Buttons

Quiet signage controls; porcelain is reserved for the one primary action in view.

- **Shape:** gently rounded (6px), 32px tall, 12px side padding, 600 weight at 13px, optional 16px icon with a 6px gap.
- **Primary:** porcelain ink fill with ground text (Export, Back to plan, Add enclosure on first start). Hover drops to ink-2.
- **Secondary:** transparent with a strong-rule border; hover fills with raise and lightens the border to ink-3.
- **Quiet:** borderless, ink-2 text, ink on hover. Used in the top bar and for low-weight actions.
- **Small / Icon:** 28px tall (10px padding, 12px text); icon buttons are square. Danger variants turn the border and text to issue only on hover.
- **Transitions:** background and border at 150ms ease-out. Disabled at 50% opacity.

### Segmented control

- **Style:** one 6px-rounded strong-rule frame, options split by 1px rules, 30px tall (24px inside the controller row).
- **State:** the pressed option fills with porcelain ink and ground text. A flagged controller turns frame and hint text amber.

### Inputs / Fields

- **Style:** raise fill, 1px strong-rule border, 6px radius, 32px tall, 8px padding, 14px at 600. The label sits above at 12px in ink-2 with a 4px gap.
- **Hover:** border to ink-3. **Focus:** the global 2px focus outline at 2px offset.
- **Error:** a flagged field takes the issue or warning border. Inline names (plan name, enclosure name) are borderless until hovered or focused.

### Navigation

- **Top bar:** 56px, panel ground, bottom rule. Wordmark, plan name, then quiet "New plan", "Open plan file…" and "Save plan file", the theme toggle and the primary Export.
- **Footer:** 32px, panel ground, top rule, always in view. ink-3 at 12px: the estimates notice on the left, "Poolsmith only plans" on the right. On small screens it stacks at the end of the page.
- **Tabs:** 40px tall, 14px padding, ink-2 at 600; the active tab is ink with a 3px inset underline. Pool tabs end with a quieter "+ New pool".

### Line bullet (signature)

The coloured pill that names a vdev: D1, S1, L1, C, SP. Filled with the role's line ink, bullet text in on-line colour, 24px tall in line rows, 18 to 20px inside disk tiles and the facts list. The same code appears on the disk's bay and on its line, which is what ties hardware to pool.

### Vdev line (signature)

A raised row (raise fill, 1px rule border, 8px radius) in one line: the bullet with the shared enclosure name beside it (600, 12px, on the bullet's centre); then the line, running through the row's centre level with the bullet, its station names hanging below; then the layout select (700, 13px, sized to its content), the size ("6 × 8 TB") and the fault tolerance ("any 2 may fail") stacked and right-aligned; then the remove button, which appears on hover or focus. When all disks share an enclosure, stations show only bay numbers; otherwise each station shows enclosure and bay on a wider stop and no name stands beside the bullet. Stations keep a fixed rhythm (56px, 104px with full names) and shrink only when the row runs out of room, so a line is as long as its vdev is wide. Each station draws its share of the 5px line, which runs from terminal to terminal; the two ends wear an extra ring like transit-map terminals. Dots are 18px circles on raise with a 4px ink ring, labels 11px ink-3, scaling to 1.15 on hover; a picked station fills with the focus colour. An empty vdev shows a 120px dashed line and "Drop disks here", centred on the row. Under a dragged or picked disk the row border turns to the line ink. Issue and warning borders override the rule.

### Disk tile and bay

- **Empty bay:** bay-empty fill, 4px radius, 10px bay number top left, a plus icon appearing on hover.
- **Disk tile:** bay-full fill with a strong-rule border, bay number and bullet in the head row, size (700, 12px) and type (10px) below. A placed disk tints its border toward the line ink. Picked uses the focus border and ring; dragging drops it to 40% opacity; a disk owned by another pool is dashed and unfilled. A finding shows as an 8px dot bottom right in issue, warning or info colour, and issues and warnings also colour the border.
- **Moving:** a tile dragged onto another bay moves there, or swaps with the disk in it; the target bay gets a 2px focus outline. While a tile is dragged, "Disks without a bay" appears as a drop zone. Enclosures reorder by the six-dot grip or the up and down buttons, all to the right of the name beside the trash icon. A hovered target gets a dashed focus frame with a 6% tint, drawn behind the content 12px out on every side so it never crosses text; "Disks without a bay" uses the same frame.

### Findings

- **Issue / warning:** full-width rows on the matching wash, 8px radius, 10px 12px padding, a 16px icon and the bold severity word in the signal colour, body text in ink.
- **Info:** no wash, ink-2 text, info-coloured icon, flush left.
- **Compact:** under the part they concern, a single 12px line in the signal colour.
- **Behaviour:** hovering or focusing a finding dims every part it does not point at to 35% opacity; clicking scrolls to the part and rings it briefly with the focus outline.

### Drop zones and support rows

Dashed 1.5px strong-rule boxes with ink-3 text that say what to drop ("Drop an SSD here..."). When a disk is picked or dragged they take the line ink border; under the pointer they add a 12% ink tint. Support rows (cache, spare) become filled raise rows with a solid rule once they hold a disk.

### Estimate bar

Always in view above hardware and pool, so the numbers stay visible while dragging. Left to right: usable space at display size with the unit beside it and TiB plus a term link below; "Pool may lose" with the per-line bullets; "Not in any pool"; then, pushed right, the finding counts in their signal colours and a "Details" button. Facts are separated by 1px rules, labels 12px ink-3 above 18px bold values. "Details" opens a panel under the bar (max 45vh, own scroll) with findings, Capacity, Space efficiency and Performance in auto-fit columns of at least 280px; clicking the finding counts opens it too. After an edit the delta flashes beside the TiB line in gain or loss for 2.6s.

## Do's and Don'ts

### Do:

- **Do** set a part's colour through `--line: var(--line-<role>)` so bullet, track, dot and drop tint all follow the role.
- **Do** show the same bullet code on a disk's bay and on its line.
- **Do** separate regions with ground steps (ground, panel, raise) and 1px rules.
- **Do** keep all transitions at 150ms ease-out, and honour reduced motion (all durations to 0ms).
- **Do** put the plain-word explanation next to every ZFS term, as a dotted-underline term with a popover.
- **Do** mark a flagged part with the issue or warning border on the part itself, not only in the findings list.

### Don't:

- **Don't** use a line ink, red or amber for decoration, buttons or emphasis.
- **Don't** wrap columns or sections in boxed cards; filled, rounded containers belong to single parts (line rows, findings, notices, popovers, code blocks), never to regions.
- **Don't** add stat-card grids, a navigation sidebar or blue call-to-action buttons.
- **Don't** use a hue for selection or focus; use the focus token.
- **Don't** add drop shadows to resting surfaces; the popover is the only lifted layer.
- **Don't** use the uppercase column title as a kicker above other headings; it names a column and nothing else.
