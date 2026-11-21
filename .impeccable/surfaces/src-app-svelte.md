---
version: 1
slug: 'src-app-svelte'
primary_target: 'src/App.svelte'
related_targets: ['src/main.ts']
---

# Planner screen

Mode: Operate. The single working screen of Poolsmith: model the server, build pools, read the
estimate, export.

## Audience and task

Homelab users, often ZFS beginners, at a desktop with a mouse, trying many layouts in one
session. Success: they compare layouts in minutes, trust the numbers and leave with TrueNAS steps
or a `zpool create` command. Mobile is read-only.

## Decisions

- Layout: three columns. Hardware left (drag source), pool centre (drop target), estimate right
  (always visible). Export is its own view with three tabs.
- Theme: dark by default, light as a user option.
- First start: empty plan with a three-step guide and "Load example".
- Pool-level fault tolerance waits for a core function; until then show it per vdev.

## Direction contract

THESIS: Every vdev is a transit line and every disk a station on it. The same coloured line
bullet marks the disk in its bay and the line in the pool, so hardware and pool read as one
network. Refuses the admin template of sidebar, stat cards and blue buttons.

OWN-WORLD: Midnight-blue enamel ground with porcelain-white signage type (Overpass, tabular
figures). Fixed line inks with fixed meaning: data cobalt, special violet, log green, cache
teal, spare grey. Red and amber belong only to issues and warnings. Regions separate by ground
tone and rules, never boxed cards. Light theme: white enamel with the same inks.

STORY: The visitor sees their server's bays, drags disks onto lines, and watches usable space
and failure tolerance change in place. They learn each ZFS term from a plain sentence beside it,
fix what is flagged on the part itself, and export.

FIRST VIEWPORT: 56px top bar (wordmark, plan name, estimate notice, New/Open/Save, theme,
Export). Left 372px: enclosures with bay grids at their real arrangement. Centre: pool tabs, then
Data/Special/Log/Cache/Spare groups as line rows with station dots, add-vdev buttons, ashift and
recordsize. Right 360px: usable TB at display size with TiB below, fault tolerance, unused disks,
findings, collapsible capacity, efficiency and performance. Primary action: dragging a disk
onto a line.

FORM: challenger wayfinding-cartography-signage-midnight-transit-diagram, chosen over the
assigned grounded direction (light transit map); seed:8559387cecee097b. Signature move: line
bullets shared by bay and vdev; focus on a line or finding dims everything not involved.
Results keep fixed positions and flash the delta when a value changes.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
