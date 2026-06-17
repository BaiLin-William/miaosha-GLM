这个worktree存在的意义是：refactor现有的UI layout。
原则是：仅仅做UI layout布局的打散和重组，但是，功能保持百分百等价。
而refactor核心理念是：信息分级
第一级别：基础信息展示
1.1、类关于用户：当前 preparations card中的 cookie、userinfo；这些应该从 preparations中分离出来，它们应该单独做成呼吸灯，绿色pass，因为这部分信息是用来标识用户本身的。所以，要单独成为一个语义。
正常是：绿色pass的呼吸灯，如果未登录，一定要给出需要登陆。因为，抢购商品，至少得知道用户是谁吧，哈哈哈。

1.2、类关于物理时间：比如当前日期date，当前时刻now精确到毫秒，且必须有时区。目标时间：UTC+8 10:00:00.000 （特点，时区+精度到毫秒）。delta，具体target time还有多久的倒计时。

1.3、距离接口的延时，latency。呼吸灯live展示。

第一类信息是read only是物理实施，我们无法改变，只能只读利用。

第二级别的信息，我称之为configuration zone。
2.1，是关于抢购商品的配置。我希望精简一下，目前是能够一下子选中9个商品。这跟没选一样。我认为最多可以选择3个。且这三个选择是有优先级的。

2.2，是资源的配置。目前，的资源就是在有效期内的captcha tickets。如果2.1 完成了优先级的排布。那么2.2 更进一步，就是进入到不同优先级的资源分配且是可以调节的。
假如，选中了三个不同的商品。那么，最高优先级的A商品：70%的tickets数量配比；第二优先级的B商品：20%的tickets数量配比；第三优先级的C商品：10%的tickets数量配比。

这是第二类信息，我们称之为 configuration zone。
第三级别的我认为应该是operation zone，即操作区间的UI。
3.1、验证码收集。
3.2、策略配置，如何抢购。是burst 集中发射？还是一个一个缓慢发射。

以上是关于信息的分类，因为UI就是为了展示信息和User interaction的。所以，如何交互非常重要。

接下来是关于位置也就是空间，我认为第一类信息：基础信息，可以显示在：页面 https://bigmodel.cn/glm-coding 中的dom为class="flex pass-header-nav-main" class="flex1 flex flex-between pc-header-nav-left"
这个区域，从左到右，一次显示1.2的信息；1.3的信息；和1.1的信息。

第二类信息配置信息；需要重构Overlay的UI布局。

代码库的详细了解：/Users/justdoit/Documents/shangpin/miaosha-GLM/worktree/share/codebase-guide.html