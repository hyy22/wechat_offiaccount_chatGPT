# 微信公众号（订阅号）接入chatGPT

> 首先需要注册open AI并生成key，参考教程[https://sms-activate.org/cn/info/ChatGPT](https://sms-activate.org/cn/info/ChatGPT)

## 使用方法

**下载代码**

```bash
git clone https://github.com/hyy22/wechat_offiaccount_chatGPT.git
cd wechat_offiaccount_chatGPT
```

**打包镜像**

```bash
docker build -t hyy/wechat_offiaccount_chatgpt .
```

**运行服务**

```bash
docker run -d --name wechat_offiaccount_chatgpt -p 3000:3000 -v "$HOME/dockerdata/wechat_offiaccount_chatGPT/logs":/app/logs -e TOKEN="填入公众号后台的token，可通过npm run token生成" -e OPENAI_API_KEY="填入openai的key" hyy/wechat_offiaccount_chatgpt
```


## 特性

最大程度的利用了微信接口的重试机制，将回复的等待时长提升到最大，ChatGPT响应过久肯定还会有超时提示，只要按原问题重新提问就好

支持上下文，使用`ChatGPT`官方api，实现了上下文对话机制

支持预设问题回复，支持正则匹配和函数返回



## 截图

![WX20230310-195602@2x](https://asset.higher.wang/images/2023/03/10/0d239dbb381f6d6e33f59555263041e5.png)



## 工作流程

请求 -> 缓存 -> 预设-> 额度检测 -> ChatGPT调用

**以下是项目`src`目录结构**

```
src
├── authHandle.js # 处理订阅号GET /wx鉴权
├── config.js # 配置文件
├── gpt.js # 处理chatGPT管道
├── helper.js # 辅助函数
├── index.js # app人口，路由
├── logger.js # 日志方法
├── parse.js # 消息解析、生成
├── post.js # 处理订阅号POST /wx请求
└── preset.js # 预设配置文件
```



## 一些实现说明

### 接口重试后能做些什么

> 微信服务器在五秒内收不到响应会断掉连接，并且重新发起请求，总共重试三次，重试次数用完后仍未回复就会报错"**该公众号暂时无法提供服务，请稍后再试**"

上一个版本是直接利用`Promise.race`来实现5s必须回复来阻止接口重试，这种体验并不好，因为基本上chatGPT的等待时间都会大于5s。

这个版本利用了重试机制，首先全局缓存了一个Map，以`openId+prompt`作为`key`，`{text: "回答", status: "状态", retry: "剩余重试次数"}`作为`value`，首先判断没有key时表示第一次请求用来调用chatGPT服务获取返回值，如果赶在重试之前返回就直接完成。存在key时表示重试，在重试部分循环读取`status`的状态，如果发生更改则表示完成，否则进入下一次重试。重试次数用完后会给一个超时回复。



### gpt.js代码组织

用了高阶函数compose实现 `预设` -> `额度检测` -> `gpt调用`的组合调用，一个环节出错直接退出并返回结果。



### 预设问答支持正则

主要是考虑后续扩展，可能会给订阅号一些预设的问题，就像在后台自己设置的那样，通过关键词去触发相应的回复，但是正则明显比之要灵活。

```js
export default {
	'^你好$': '你好啊～',
  '^你选(.+?)$': (...choices) => {
    return `你选择的是${choices.join('、')}`;
  }
};
```



## 体验

扫码关注订阅号开始体验～

![qrcode_for_gh_3ec27a9407c8_344](https://asset.higher.wang/images/2023/03/10/c84c89592721946c006d7967254ee328.jpg)