# patchKeyedChildren指针解释说明

这个文档针对的情形是，当重新渲染时，新旧节点是 `新旧vnode都存在，且新旧vnode的type和key都相同`
且新旧节点的children都是数组，在这种情况下：对children数组进行diff的时候(主要的函数是`patchKeyedChildren`)。
从头尾对比一遍后，指针可能存在的情况。
 ```ts
    // 指针是依次指下面3个
    let head = 0 // 开始比对的头索引
    let tail1 = vnodeList1.length - 1 // 第一个数组的尾部索引
    let tail2 = vnodeList2.length - 1 // 第二个数组的尾部索引
```

### 情形一： 尾部插入时
如图所示：头尾对比结束时指针依次为： 2 1 2

此时，`head` 肯定大于`tail1` 且 `head` <= `tail2`

![尾部插入时.png](assets/%E5%B0%BE%E9%83%A8%E6%8F%92%E5%85%A5%E6%97%B6.png)

### 情形二： 头部插入时
如图所示：头尾对比结束时指针依次为： 0 -1 0

此时，`head` 肯定大于`tail1` 且 `head` <= `tail2`

![头部插入时.png](assets/%E5%A4%B4%E9%83%A8%E6%8F%92%E5%85%A5%E6%97%B6.png)

## 结论
新节点单纯比旧节点多的时候（中间是一样的， 不管是尾多还是头多），肯定是 
```head > tail1 && head <= tail2```。  
此时， 需要把从`head`到`tail2`的部分插入到`tail2`中，这部分就是新增的内容
> 理解  
> 头尾分别diff一遍，就相当于一条线上扫雷。两端的警察最终总会在中间停下。 情形1，2时，head总会
> 在tail2前面，head到tail2的部分就是新增的部分，我们把它们patch到tail2的下一位之前。
