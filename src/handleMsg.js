import xml2js from 'xml2js';
import { ChatGPTAPI } from 'chatgpt';
import config from './config.js';
import { logger } from './logger.js';

// {lastConversationTime: '最近会话时间', totalTimes: '当前会话周期提问次数', conversationId: '会话id', parentMessageId: '上次消息id'}
const userUsageMap = new Map();
// {text: '答案', status: '状态，PENDING,SUCCESS,FAIL'}
const qaMap = new Map();
/**
 * 接收请求并解析
 * 进行回复
 * @param {XMLDocument} data xml数据
 * @returns 
 */
export async function handleMsg(data) {
	try {
		const { xml: msg } = await xml2js.parseStringPromise(data, { explicitArray: false });
		// 打个访问日志
		logger.info(JSON.stringify(msg));
		// 处理文本消息
		if (msg.MsgType === 'text') {
			const composedFn = compose(checkCache, checkQuota, handleResponse);
			const result = await composedFn(msg);
			return buildMsg({
				ToUserName: msg.FromUserName,
				FromUserName: msg.ToUserName,
				MsgType: 'text',
				Content: result,
			});
		}
	} catch (e) {
		// 错误日志
		logger.error(e.message);
		console.log(e);
	}
	return 'success';
}

/**
 * 构建消息体
 * @param {Object} data json数据
 * @returns 
 */
function buildMsg(data) {
	const { ToUserName, FromUserName, MsgType, Content, MediaId } = data;
	const builder = new xml2js.Builder({ headless: true, rootName: 'xml', cdata: true });
	if (MsgType === 'text') {
		return builder.buildObject({
			ToUserName,
			FromUserName,
			CreateTime: Date.now(),
			MsgType,
			Content,
		});
	} else if (MsgType === 'image') {
		return builder.buildObject({
			ToUserName,
			FromUserName,
			CreateTime: Date.now(),
			MsgType,
			Image: {
				MediaId,
			},
		});
	}
}

/**
 * 缓存检查
 * 暂时使用内存，后期考虑迁移到redis
 * 有就返回，没有就进入下个管道
 */
function checkCache(message) {
	const currentQA = qaMap.get(message.FromUserName + message.Content);
	if (currentQA && currentQA.status !== 'FAIL') {
		throw new Error(currentQA.text);
	}
	return message;
}

/**
 * 额度检查
 * @param {String} userName 
 */
function checkQuota(message) {
	const currentUser = userUsageMap.get(message.FromUserName);
	const now = Date.now();
	if (currentUser &&
		currentUser.lastConversationTime + config.checkPeriod > now &&
		currentUser.totalTimes >= config.maxTimes
	) {
		throw new Error(`抱歉，当前提问额度已用尽，请${Math.floor(config.checkPeriod / 1000 / 60 / 60)}小时后再试！`);
	}
	// 超出会话时长，重置会话并重置次数
	if (currentUser && currentUser.lastConversationTime + config.checkPeriod <= now) {
		currentUser.totalTimes = 0;
		currentUser.conversationId = '';
		currentUser.parentMessageId = '';
	}
	// 返回消息进入下个管道
	return message;
}

/**
 * 调用chatGPT
 * @param {Object} message 消息对象
 * @returns 
 */
async function runGPT(message) {
	const { FromUserName, Content, CreateTime } = message;
	// 构造响应对象
	const answerObject = {
		text: 'chatGPT仍在响应中，请稍后',
		status: 'PENDING'
	};
	// 缓存
	cacheQA(qaMap, FromUserName + Content, answerObject);
	const api = new ChatGPTAPI({
		apiKey: config.apiKey,
		timeoutMs: 2 * 60 * 1000,
	});
	const sendOptions = {};
	const currentUser = userUsageMap.get(FromUserName);
	if (currentUser && currentUser.conversationId) Object.assign(sendOptions, { conversationId: currentUser.conversationId });
	if (currentUser && currentUser.parentMessageId) Object.assign(sendOptions, { parentMessageId: currentUser.parentMessageId });
	// 可重试
	const retriedFn = retry(() => api.sendMessage(Content, sendOptions));
	let resp;
	try {
		resp = await retriedFn();
		answerObject.text = resp.text;
		answerObject.status = 'SUCCESS';
	} catch (e) {
		answerObject.text = e.message;
		answerObject.status = 'FAIL';
		return e.message;
	}
	// 更新缓存
	userUsageMap.set(FromUserName, {
		lastConversationTime: CreateTime,
		totalTimes: currentUser && currentUser.totalTimes > 0 ? currentUser.totalTimes + 1 : 1,
		conversationId: resp.conversationId,
		parentMessageId: resp.id,
	});
	return resp.text;
}

/**
 * 为函数添加重试机制
 * @param {Function} fn 函数
 * @param {Number} times 重试次数
 * @returns 
 */
function retry(fn, times = 5) {
	return async function handle() {
		try {
			const result = await fn.apply(null, arguments);
			return result;
		} catch (e) {
			logger.info(`任务执行失败正在重试，剩余重试次数：${times}次`);
			if (times > 0) {
				times--;
				const result = await handle();
				return result;
			} else {
				throw new Error('任务执行失败，重试次数已用完');
			}
		}
	};
}

/**
 * 缓存qa，保持最大maxLenth个
 * @param {Map} targetMap 对象
 * @param {String} key 键
 * @param {String} val 值
 * @param {Number} maxLength 
 */
function cacheQA(targetMap, key, val, maxLength = 10) {
	if (targetMap.size >= maxLength) {
		targetMap.delete(targetMap.keys().next().value);
	}
	targetMap.set(key, val);
}

/**
 * 回复时微信限制最长5s，否则会重试，现在超时给个提示，不让它重试
 * @param {Number} maxWait 等待毫秒
 */
async function handleResponse(message, maxWait = 4000) {
	const resp = await Promise.race([new Promise((resolve) => setTimeout(resolve, maxWait)), runGPT(message)]);
	if (!resp) {
		throw new Error('chatGPT响应较慢，请稍后按原问题再问一次，下一次不消耗次数～');
	}
	return resp;
}

/**
 * 组合函数
 */
function compose(...fns) {
	return async function() {
		let result = arguments[0];
		try {
			for (let item of fns) {
				result = await item.call(null, result);
			}
		} catch (e) {
			result = e.message;
		}
		return result;
	};
}