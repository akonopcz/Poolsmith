/** Plain-language explanations for the ZFS terms the planner shows. */
export const TERMS = {
  vdev: 'A group of disks that ZFS treats as one unit and protects on its own. A pool spreads data over all its data vdevs. If any vdev fails completely, the whole pool is lost.',
  stripe:
    'Each disk is its own vdev. You get the space of every disk, but one failed disk loses the pool.',
  mirror:
    'Every disk holds the same data. You get the space of one disk, and all but one disk may fail.',
  raidz1:
    'Data plus one disk worth of parity, spread over all disks. One disk may fail. Risky with large disks, because a second failure during the rebuild loses the pool.',
  raidz2: 'Data plus two disks worth of parity. Any two disks may fail. The usual choice for HDDs.',
  raidz3: 'Data plus three disks worth of parity. Any three disks may fail. For very wide vdevs.',
  special:
    'Fast disks (SSD or NVMe) that hold metadata and, if you want, small files. They speed up directory listings and small reads. The pool depends on them: losing the special vdev loses the pool, so give it at least the redundancy of the data vdevs.',
  log: 'A separate log device (SLOG) for synchronous writes, as databases, VMs and NFS use them. It does not help normal file copies. Losing it costs at most a few seconds of writes.',
  cache:
    'A read cache (L2ARC) on an SSD. It only helps when the working set does not fit into RAM. Losing it is harmless.',
  spare:
    'A disk that waits idle and steps in when a disk in the pool fails. It belongs to the pool but stores nothing until then.',
  ashift:
    'The smallest block ZFS writes, as a power of two: 12 means 4 KiB. It should be at least the physical sector size of every disk. It cannot change after a vdev exists.',
  recordsize:
    'The largest block ZFS uses for files. 128 KiB fits mixed files. Large media files gain from 1 MiB, databases from small values. Datasets can override it later.',
  parity:
    'Extra data from which ZFS rebuilds what a failed disk held. It takes space but stores no files.',
  slop: 'A reserve ZFS keeps free, about 3 % of the pool and at most 128 GiB, so a full pool can still delete files.',
  embeddedLog:
    'One metaslab per vdev that ZFS keeps for its intent log when no separate log device exists.',
  metaslab:
    'ZFS divides each vdev into metaslabs. The rest at the end that is too small for a whole one stays unused.',
  labels: 'Each disk carries four small labels and a boot area that ZFS uses to find the pool.',
  padding:
    'raidz rounds each block up to a multiple of parity + 1 sectors. Small blocks on wide raidz vdevs waste space on this.',
  tib: 'Disk vendors count 1 TB as 10¹² bytes. ZFS and TrueNAS count in TiB, 2⁴⁰ bytes, which is about 10 % more. The same space shows a smaller number in TiB.',
  hba: 'In HBA mode (also IT mode) the controller passes each disk straight to the system. ZFS needs this to see and repair the disks itself.',
  raidMode:
    'In RAID mode the controller hides the disks behind its own logic. ZFS then cannot see disk errors or SMART data. Switch to HBA mode.',
  iops: 'Random small reads or writes per second, as VMs and databases cause them. Shown as multiples of one disk.',
  throughput:
    'Speed for large sequential files, such as copying video. Shown as multiples of one disk.',
  sector:
    'The smallest unit a disk writes internally. Modern HDDs use 4096 bytes and often report 512 to stay compatible.',
} as const

export type Term = keyof typeof TERMS
