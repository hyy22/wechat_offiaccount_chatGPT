import { parseMsg, buildMsg } from './parse.js';
import config from './config.js';
import gptService from './gpt.js';
import { logger } from './logger.js';
import { retry } from './helper.js';

/**
 * 请求
 * 预设回复
 * 缓存
 * 额度检测
 * 请求服务
 */

// 缓存问题状态
const promptCache = new Map();
const TIMEOUT_REPLY = `sorry~发了个呆，请在${Math.ceil(config.cacheSession / 60000)}分钟内按原问题再问一次吧～`; // 超时文案
const WX_MAX_RETRY = 2; // 微信重试次数

/**
 * 休眠
 * @param {Number} ms 
 * @returns 
 */
function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 响应微信post请求
 * @param {import('koa').Context} ctx 
 */
export async function handleWxPost(ctx) {
	const data = ctx.request.body;
	// 解析消息
	const { xml: msg } = await parseMsg(data);
	// 打个日志
	logger.info('received msg: ', JSON.stringify(msg));
	const cacheKey = `${msg.FromUserName}_${msg.Content}`;
	let currentMsg = promptCache.get(cacheKey);
	if (!currentMsg) {
		// 第一次请求
		let answerObject = {
			text: '', // 回复
			status: 'PENDING', // 当前状态
			timer: null, // 计时器
			retry: WX_MAX_RETRY, // 重试次数
		};
		promptCache.set(cacheKey, answerObject);
		const retriedFn = retry(() => gptService(msg));
		let resp;
		try {
			// 调用ChatGPT服务
			resp = await retriedFn();
			answerObject.text = resp;
			answerObject.status = 'SUCCESS';
		} catch (e) {
			resp = e.message;
			answerObject.text = resp;
			answerObject.status = 'FAIL';
			logger.error(resp);
		}
		// 定时清除缓存
		answerObject.timer = setTimeout(() => {
			let row = promptCache.get(cacheKey);
			if (!row) return;
			promptCache.delete(cacheKey);
		}, config.cacheSession);
		// 回复
		reply(ctx, msg, resp);
	} else {
		// 重试操作
		let ms = 500; // 间隔
		let wxWait = 3000; // 微信等待时间，不写5s因为有误差
		// 每间隔ms查看一次
		for (let total = 0; total < wxWait; total += ms) {
			await sleep(ms);
			if (currentMsg.status !== 'PENDING') {
				// 回复
				let resp = currentMsg.text;
				clearTimeout(currentMsg.timer);
				promptCache.delete(cacheKey);
				return reply(ctx, msg, resp);
			}
		}
		currentMsg.retry--;
		if (currentMsg.retry < 1) {
			// 超时
			currentMsg.retry = WX_MAX_RETRY; // 重置次数
			reply(ctx, msg, TIMEOUT_REPLY);
			return;
		}
	}
}

/**
 * 回复
 * @param {import('koa').Context} ctx
 * @param {Object} msg 接收的消息体
 * @param {String} text 回复内容
 * @returns 
 */
function reply(ctx, msg, text) {
	ctx.body = buildMsg({
		ToUserName: msg.FromUserName,
		FromUserName: msg.ToUserName,
		MsgType: 'text',
		Content: text,
	});
}