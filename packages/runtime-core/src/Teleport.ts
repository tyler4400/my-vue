export const Teleport = {
  name: 'Teleport',
  __isTeleport: true,
  process() {},
}

export const isTeleport = (val: any) => val?.__isTeleport
