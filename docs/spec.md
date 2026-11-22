# poolsmith spec

poolsmith is a visual planner for ZFS pool layouts. It runs locally in the browser and has no
backend. It plans only and never touches a host.

Main use: plan TrueNAS pools and storage layouts for mixed hardware, such as HP ProLiant rack
servers, tower servers and homelab thin clients.

## Non-goals

- Running commands on hosts. `zpool create` wipes the member disks, and remote execution would
  need credentials. poolsmith prints commands, it does not run them.
- Creating TrueNAS pools from the shell. The TrueNAS middleware does not know about pools
  created that way. The TrueNAS export is a list of UI steps.
- RAID types other than ZFS in the MVP. The data model must allow adding mdadm or hardware RAID
  later without a rewrite.

## MVP

### Server model

- Chassis with bays, for example 8x LFF, 2x M.2 NVMe.
- PCIe drives: an add-in card SSD (such as an Intel P3500) as a bay of its own size, and an
  adapter card with M.2 slots as an enclosure of kind PCIe card. Lanes and bifurcation are not
  modeled.
- Disk per bay: size, type (HDD, SSD, NVMe), logical and physical sector size, optional label.
- Controller per bay group with its mode (HBA or RAID).

### Pool designer

- Drag disks from bays into vdevs.
- Data vdevs: stripe, mirror, raidz1, raidz2, raidz3.
- Support vdevs: log, cache, special, spare.
- Pool settings that affect capacity: `ashift`, default `recordsize`.

### Calculation

Three levels, each shown separately:

1. TrueNAS view. Usable capacity as `zfs list` and the TrueNAS UI report it. ZFS computes this
   with a 128K reference block size.
2. Efficiency table per `recordsize` or `volblocksize` and `ashift`, including raidz padding.
   Small blocks on wide raidz vdevs lose a lot of space, and this table makes that visible
   before the pool exists.
3. Slop space and other reserves, listed as separate deductions.

Also shown: raw capacity, TB and TiB, disks each vdev may lose, and a rough relative IOPS and
throughput estimate.

Compression, metadata and fragmentation are not predictable. The UI labels all numbers as
estimates.

### Warnings

- Disks of different sizes in one vdev.
- Data vdev without redundancy.
- Special vdev without redundancy, or with less redundancy than the data vdevs. Losing it loses
  the whole pool.
- Data vdevs of different type or width in one pool.
- raidz width outside the usual range for its parity level.
- Disks behind a controller in RAID mode. ZFS needs direct disk access, so the controller should
  run in HBA mode.
- `ashift` below the physical sector size of a disk. The disk then has to read and rewrite a
  whole sector for every smaller write, and `ashift` cannot change once a vdev exists.
- Pool disks in a USB enclosure. USB bridges often hide SMART data and drop disks under load.

Hints mark a trade-off rather than a risk:

- HDDs and flash in one vdev. The vdev runs at HDD speed.
- Data vdevs with disks of different sizes. ZFS writes more to the emptier vdev, so load and fill
  level end up uneven.

### Files

- Save and load a plan as a JSON file, so plans can live in git.
- The plan file carries a schema version.
- The browser keeps the current plan across reloads. It works without browser storage, and only
  a plan file keeps a plan for good.

### Export

- Markdown summary of the plan.
- `zpool create` command for reference.
- TrueNAS UI steps to build the same pool.

## Later

- Server templates (ProLiant DL380 and ML350, common towers, thin clients with one or two slots).
- Failure simulation: mark disks as failed and see whether the pool survives.
- Compare layouts side by side.
- Growth planning: add a vdev, replace disks with larger ones, raidz expansion (OpenZFS 2.3,
  TrueNAS 24.10).
- Import a disk inventory from pasted `lsblk -J` or `smartctl` output.
- Cost per TB.
- dRAID, mdadm, hardware RAID.
- Tauri desktop build.

## Architecture

- Svelte 5, TypeScript, Vite. Static build, no server.
- `core/` holds the data model and all calculations as plain TypeScript with no UI imports.
  Vitest covers it.
- The UI only renders the model and calls `core/`. Moving to another framework would mean
  rewriting the UI, while `core/` stays as it is.
- A layout has a `kind` field (`"zfs"` for now), so other RAID types can get their own
  topology and calculation module next to the ZFS one.

## Validation

- Unit tests for every capacity formula.
- Fixtures from real pools: `zpool list -p` and `zfs list -p` output plus the known layout. The
  TrueNAS view must match these numbers.

## Open points

- Check whether current TrueNAS releases still create a swap partition on each pool disk, and
  how that changes usable capacity.
- Where server template data comes from (vendor specs, hand-maintained list).
