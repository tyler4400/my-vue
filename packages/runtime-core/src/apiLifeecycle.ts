import { LifecycleHooks } from './enums'
import { ComponentInternalInstance, currentInstance } from '@vue/runtime-core'

function createHook(type: LifecycleHooks) {
  // 将当前的实例存到了此钩子上
  return (type: LifecycleHooks, targetInstance: ComponentInternalInstance = currentInstance) => {
    if (targetInstance) {
      // 生命周期函数 也可以在一个外部函数中调用，只要调用栈是同步的，且最终起源自 setup() 就可以。

    }
  }
}
