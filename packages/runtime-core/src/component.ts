/**
 * 当rawProps传递给组件时， 没有被组件的props声明的部分会成为attrs，声明的会成为props
 * attrs不是响应式的。attrs变化不会驱动视图更新，但若视图更新时，会拿最新的attrs值。
 *
 * 这就好比有护照的是合法移民props， 没有护照的就是非法移民attrs
 * @param instance
 * @param rawProps
 */
export const initProps = (instance, rawProps) => {
  const props = {}
  const attrs = {}
  const propsOptions = instance.propsOptions || {} // 组件中定义的

  if (rawProps) {
    for (const key in rawProps) {
      // 用所有的来分裂
      const value = rawProps[key]
      if (key in propsOptions) {
        props[key] = value
      } else {
        attrs[key] = value
      }
    }
  }

  instance.attrs = attrs
  instance.props = reactive(props) // readonlyReactive，props不需要深度代理，组件内不能改props
}
