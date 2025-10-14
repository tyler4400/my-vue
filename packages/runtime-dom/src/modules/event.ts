import { HostElement } from '@vue/runtime-core'

interface Invoker extends EventListener {
  value: EventValue
  attached?: number
}
type EventValue = Function | Function[]

const veiKey = Symbol('_vei')

export default function patchEvent(
  el: HostElement & { [veiKey]?: Record<string, Invoker | undefined> },
  name: string,
  nextValue: Function,
) {
  // 获取当前 DOM 元素上存储的事件 invokers（_vei 是自定义的属性名）
  const invokers = el[veiKey] || (el[veiKey] = {})

  // 提取事件名称，如 "onClick" -> "click"
  const eventName = name.slice(2).toLowerCase()

  // 查找之前是否绑定过这个事件 是否存在同名的事件绑定
  const existingInvokers = invokers[name]

  if (nextValue) {
    if (existingInvokers) {
      // 如果existingInvokers已存在， 且存在新值。 就说明是要换绑
      return (existingInvokers.value = nextValue)
    } else {
      // existingInvokers不存在， 说明是新值第一次
      const invoker = (invokers[name] = createInvoker(nextValue))
      return el.addEventListener(eventName, invoker)
    }
  } else {
    if (existingInvokers) {
      // 现在没有，以前有. 说明 新的事件不存在，之前存在事件，要解绑
      el.removeEventListener(eventName, existingInvokers)
      invokers[name] = undefined
    }
  }
}

function createInvoker(func: Function): Invoker {
  const invoker = e => invoker.value(e)
  // 将传入的函数绑定到 invoker.value 上，之后可以更改 value 而不需要解绑事件
  invoker.value = func // 更改invoker中的value属性 可以修改对应的调用函数
  return invoker
}
