# Poolsmith

Visual ZFS pool and vdev planner that runs in the browser. It plans layouts only and never
runs commands on a host.

Status: early development. The MVP is in place: model a server with its enclosures, bays,
disks and controllers, drag disks into pools, read capacity, fault tolerance, efficiency and
warnings, save plans as JSON and export the TrueNAS steps or a `zpool create` command. Run it
with `pnpm install` and `pnpm dev`. See [docs/spec.md](docs/spec.md) for scope and
[DESIGN.md](DESIGN.md) for the interface.

## License

MIT, see [LICENSE](LICENSE).
