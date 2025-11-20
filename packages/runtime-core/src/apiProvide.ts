import { currentInstance } from './component'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface InjectionKey<T> extends Symbol {}

export function provide<T, K = InjectionKey<T> | string | number>(
  key: K,
  value: K extends InjectionKey<infer V> ? V : T,
) {
  if (!currentInstance) return // 建立在组件基础上

  const parentProvide = currentInstance.parent?.provides // 获取父组件的provide
  let provides = currentInstance.provides

  // 因为初始子组件的provides指向父组件， 所以如果是相同的，说明是本方法初始第一次指向
  if (parentProvide === provides) {
    // 在子组件上新增了provides，需要继承父组件
    provides = currentInstance.provides = Object.create(parentProvide)
  }

  provides[key as string] = value
}

export function inject<T>(key: InjectionKey<T> | string, defaultValue: T): T {
  if (!currentInstance) return // 建立在组件基础上

  const provides = currentInstance.parent?.provides

  if (provides && (key as string) in provides) {
    return provides[key as string]
  } else {
    return defaultValue
  }
}
