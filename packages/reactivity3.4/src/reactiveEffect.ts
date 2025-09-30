import { activeEffect } from './effect'

export function track(target: object, key: string | symbol) {
  if (activeEffect) {
    console.log('track', target, key, activeEffect)
  }
}
