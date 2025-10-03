import { activeEffect, ReactiveEffect, trackEffect, triggerEffects } from './effect'
import { DepMap, ObJKey } from './types'

/**
 * targetMap 存放依赖收集的关系
 * key是target，也就是reactive(obj)中的obj
 * value也是一个Map，收集obj的各个key的依赖effect副作用函数.
 * 注意：key是effect函数，
 *
 *     effect(() => {
 *       app.innerHTML = `姓名: ${state.name} 年龄: ${state.age}`
 *     })
 *     jack.age = 2
 *     effect(() => {
 *       app.innerHTML = `姓名: ${state.name}`
 *     })
 *      * 对于如上， 期望的收集形式
 *      * {
 *      *   {name:'jw',age:30}:{
 *      *   age:[effect],
 *    *     name:[effect, effect]
 *      * }
 *
 */
const targetMap = new WeakMap<object, Map<ObJKey, DepMap>>()

const createDep = (cleanup: () => void, key: ObJKey): DepMap => {
  // 创建的收集器还是一个map
  const dep: DepMap = new Map<ReactiveEffect, number>()
  dep.cleanup = cleanup
  dep.depName = key
  return dep
}

export function track(target: object, key: ObJKey) {
  console.log(target, key, activeEffect)
  // activeEffect 有这个属性,说明这个key是在effect中访问的,没有说明是在effect之外访问的不用进行收集
  if (activeEffect) {
    let depsMap = targetMap.get(target)
    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map()))
    }
    let dep = depsMap.get(key)
    if (!dep) {
      // cleanup 后面用于清理不需要的属性
      depsMap.set(key, (dep = createDep(() => depsMap.delete(key), key)))
    }

    // 将当前的effect放入dep(映射表)中, 后续可以根据值的变化触发此dep中存放的effect
    trackEffect(activeEffect, dep)
  }
}

export function trigger(target: object, key: ObJKey, value: any, oldVak: any) {
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    // 找不到对象 直接return
    return
  }
  const dep = depsMap.get(key)
  if (dep) {
    triggerEffects(dep)
  }
}
