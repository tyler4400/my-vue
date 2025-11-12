import { LifecycleHooks } from './enums'
import { currentInstance, setCurrentInstance, unsetCurrentInstance } from './component'
import { ComponentInternalInstance, LifecycleHook } from './types'

const createHook = <T extends Function = () => any>(type: LifecycleHooks) => {
  // 将当前的实例存到了此钩子上
  return (hook: T, targetInstance: ComponentInternalInstance = currentInstance) => {
    if (targetInstance) {
      // 生命周期函数 也可以在一个外部函数中调用，只要调用栈是同步的，且最终起源自 setup() 就可以。
      const hooks = targetInstance[type] || (targetInstance[type] = [])
      const wrapHook = () => {
        setCurrentInstance(targetInstance)
        hook()
        unsetCurrentInstance()
      }
      hooks.push(wrapHook)
    }
  }
}

export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT)
export const onMounted = createHook(LifecycleHooks.MOUNTED)
export const onBeforeUpdate = createHook(LifecycleHooks.BEFORE_UPDATE)
export const onUpdated = createHook(LifecycleHooks.UPDATED)

export const invokeArray = (funcs: LifecycleHook) => {
  if (!Array.isArray(funcs) || funcs.length === 0) return
  for (let i = 0; i < funcs.length; i++) {
    funcs[i]()
  }
}
