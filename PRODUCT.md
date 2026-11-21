# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Homelab users who plan ZFS pools for TrueNAS on mixed hardware: rack servers such as HP
ProLiant with disk shelves, tower servers, thin clients with one or two slots. Many are ZFS
beginners. They know their hardware and what they want to store, but not what `ashift`, slop
space or a special vdev mean. The product is public and open source (MIT, GitHub). UI copy is
English.

They plan at a desk with a mouse, often before buying disks or before wiping a server.

## Product Purpose

Poolsmith is a visual planner for ZFS pool layouts. It shows, before the pool exists, how much
space a layout gives, how many disks each vdev may lose, roughly how fast it is, and which
choices ZFS would reject or that are risky. It plans only and never touches a host.

Success: a user tries several layouts in a few minutes, understands the trade-off between them,
picks one with confidence and leaves with the TrueNAS UI steps or a `zpool create` command.

## Positioning

Capacity calculators take a disk count and a RAID level. Poolsmith starts from the physical
server: enclosures, bays, controllers and the actual disks in them. It catches problems a
calculator cannot see, such as a controller in RAID mode, disks in a USB enclosure or an
`ashift` below a disk's physical sector size. Its capacity matches what TrueNAS reports, with
each deduction listed.

## Operating Context

- Typical session: the hardware is entered quickly, then the user moves disks between layouts
  (one raidz2 vs. several mirrors) many times. Numbers and warnings must update while dragging.
- Plans are saved as JSON files, so they can live in git.
- Output goes into the TrueNAS UI (step list) or a shell (`zpool create`, for reference).
- First start is an empty plan that guides the user: add an enclosure, add disks, build a pool.
  The example plan is one click away.

## Capabilities and Constraints

- Svelte 5, TypeScript, Vite. Static build, no backend.
- `src/core/` holds the model and all calculations. The UI renders the model and calls `core/`.
  It contains no calculation logic.
- Desktop first. On small screens a plan can be viewed, but editing and drag-and-drop are not
  optimized for touch.
- A plan has one host and may hold several pools. One pool is edited at a time; disks used by
  another pool show as taken.
- Data vdevs: stripe, mirror, raidz1, raidz2, raidz3. A stripe is several single-disk vdevs in
  the model; the UI may offer "stripe" as a shortcut. Support vdevs: special, log, cache, spare.
- Two severities of findings: issues (ZFS would refuse) and warnings, where `info` hints are
  shown quieter than `warning`. Each points at the affected disk, vdev or setting.
- All numbers are estimates. Compression, metadata and fragmentation are not predictable.

## Evidence on Hand

- `examplePlan` in `src/core/testing.ts`: DL380 Gen9 with a DS4246 shelf, raidz2 of six HDDs,
  special mirror of two SSDs, one spare.
- No screenshots, logos, testimonials or user numbers exist. Do not invent them.

## Product Principles

1. The one number that matters stays findable: usable space and how many disks may fail come
   before any table.
2. Explain every ZFS term where it appears, in plain words.
3. Show the cost of a choice before the pool exists, never after.
4. Serious enough to trust with data: no toy look, no generic admin template.
5. Plan, never execute.
