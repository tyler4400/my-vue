import { Component } from './types'
import { isFunction } from '@vue/shared'
import { ref } from '@vue/reactivity3.4'
import { h } from './h'

export type AsyncComponentResolveResult<T = Component> = T | { default: T } // es modules

export type AsyncComponentLoader<T = any> = () => Promise<AsyncComponentResolveResult<T>>

export interface AsyncComponentOptions<T = any> {
  loader: AsyncComponentLoader<T>
  loadingComponent?: Component
  errorComponent?: Component
  delay?: number //   展示加载组件前的延迟时间
  timeout?: number
  suspensible?: boolean
  onError?: (error: Error, retry: () => void, fail: () => void, attempts: number) => any
}

export function defineAsyncComponent(options: AsyncComponentOptions | AsyncComponentLoader) {
  if (isFunction(options)) {
    options = { loader: options as AsyncComponentLoader }
  }

  return {
    setup() {
      const {
        loader,
        errorComponent,
        timeout,
        delay = 200,
        loadingComponent,
        onError,
      } = options as AsyncComponentOptions

      const loaded = ref(false)
      const loading = ref(false)
      const error = ref(false)

      let loadingTimer = null
      loadingTimer = setTimeout(() => {
        loading.value = true
      }, delay)

      let Comp = null
      let attempts = 0

      function loadFunc() {
        return loader().catch(err => {
          if (isFunction(onError)) {
            return new Promise((resolve, reject) => {
              const retry = () => resolve(loadFunc())
              const fail = () => reject(err)
              onError(err, retry, fail, ++attempts)
            })
          } else {
            throw err
          }
        })
      }

      loadFunc()
        .then(comp => {
          Comp = comp
          loaded.value = true
        })
        .catch(() => {
          error.value = true
        })
        .finally(() => {
          loading.value = false
          clearTimeout(loadingTimer)
        })

      if (timeout) {
        setTimeout(() => {
          error.value = true
          throw new Error('组件加载超时')
        }, timeout)
      }

      const placeholder = h('div')
      return () => {
        if (loaded.value) {
          return h(Comp)
        } else if (error.value && errorComponent) {
          return h(errorComponent)
        } else if (loading.value && loadingComponent) {
          return h(loadingComponent)
        } else {
          return placeholder
        }
      }
    },
  }
}
