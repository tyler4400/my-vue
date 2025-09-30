const base = {
    msg: 'base',
    get value() {
        return this.msg
    }
}
const proxy = new Proxy(base, {
    get(target, key, receiver) {
        // A: 错误示范：this 绑定到 target（base）
        // return (target)[key]

        // B: 正确示范：this 绑定到 receiver（真实访问者）
        return Reflect.get(target, key, receiver)
    }
})

const child = Object.create(proxy)
child.msg = 'child'

console.log(child.value) // A: 'base'（错）❌  B: 'child'（对）✅
