import { ReactiveEffect } from './effect'

export type ObJKey = string | symbol

export type DepMap = Map<ReactiveEffect, number> & {
  cleanup?: () => void
  myVueName?: ObJKey
}
