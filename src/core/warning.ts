export type WarningCode =
  | 'raid-controller'
  | 'usb-disk'
  | 'mixed-disk-sizes'
  | 'mixed-media'
  | 'no-redundancy'
  | 'special-no-redundancy'
  | 'special-less-redundant'
  | 'mixed-data-vdevs'
  | 'uneven-data-vdevs'
  | 'raidz-width'
  | 'ashift-below-sector'

/** Advice on a plan that ZFS would accept. `info` marks a trade-off rather than a risk. */
export interface Warning {
  code: WarningCode
  severity: 'warning' | 'info'
  message: string
  /** IDs of the parts involved, so the UI can highlight them. */
  ids: string[]
}
