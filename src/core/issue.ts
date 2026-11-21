export type IssueCode =
  | 'duplicate-id'
  | 'unknown-controller'
  | 'unknown-disk'
  | 'disk-in-several-bays'
  | 'disk-used-twice'
  | 'invalid-disk-size'
  | 'invalid-sector-size'
  | 'invalid-ashift'
  | 'invalid-recordsize'
  | 'invalid-pool-name'
  | 'no-data-vdev'
  | 'vdev-disk-count'
  | 'log-vdev-type'

/** A plan that ZFS would reject or that refers to missing parts. Advice is not an issue. */
export interface Issue {
  code: IssueCode
  message: string
  /** IDs of the parts involved, so the UI can highlight them. */
  ids: string[]
}
