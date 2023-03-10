import { Configuration, OpenAIApi } from 'openai';
import config from './config.js';
import { compose } from './helper.js';
import preset from './preset.js';

const configuration = new Configuration({
	apiKey: config.apiKey,
});
const openai = new OpenAIApi(configuration);
// 会话列表
const conversationMap = new Map();

/**
 * 处理预设问题
 * key为正则匹配，value可为字符串或者函数
 * @param {Object} msg 消息体
 */
function handlePreset(msg) {
	for (let k of Object.keys(preset)) {
		const regExp = new RegExp(k, 'i');
		const match = regExp.exec(msg.Content);
		if (match) {
			let result = typeof preset[k] === 'function' ? preset[k].apply(null, match.slice(1)) : preset[k];
			throw new Error(result);
		}
	}
	return msg;
}

/**
 * 格式化时间
 * @param {Number} t ms
 * @returns 
 */
function formatTime(t) {
	let r = t; // 剩余
	let d = parseInt(r / 86400000);
	if (d > 0) return `${d}天`;
	r = r - (d * 86400000);
	let h = parseInt(r / 3600000);
	if (h > 0) return `${h}小时`;
	r = r - (h * 3600000);
	let m = parseInt(r / 60000);
	if (m > 0) return `${m}分钟`;
	r = r - (m * 60000);
	return `${r}秒`;
}

/**
 * 额度检查
 * @param {Object} msg 消息体
 */
function checkQuota(msg) {
	const currentUser = conversationMap.get(msg.FromUserName);
	const now = Date.now();
	if (currentUser &&
		currentUser.lastConversationTime + config.checkPeriod > now &&
		currentUser.totalTimes >= config.maxTimes
	) {
		throw new Error(`抱歉，当前提问额度已用尽，请${formatTime(config.checkPeriod)}后再试！`);
	}
	// 超出会话时长，重置会话并重置次数
	if (currentUser && currentUser.lastConversationTime + config.checkPeriod <= now) {
		currentUser.totalTimes = 0;
	}
	// 返回消息进入下个管道
	return msg;
}

/**
 * 调用ChatGPT api
 * @param {Object} msg 消息体
 * @returns 
 */
async function callChatGPT(msg) {
	const currentUser = conversationMap.get(msg.FromUserName);
	const conversations = currentUser.messages;
	const messages = [
		{ role: 'system', content: 'You are a helpful assistant.' },
		...conversations,
		{ role: 'user', content: msg.Content }
	];
	const completion = await openai.createChatCompletion({
		model: 'gpt-3.5-turbo',
		messages,
	});
	const response = completion.data.choices[0].message.content;
	// 更新缓存
	conversations.push({
		role: 'user',
		content: msg.Content
	}, {
		role: 'assistant',
		content: response.slice(-Math.min(config.maxContentLength, response.length))
	});
	const diff = conversations.length - config.relatedSessions * 2;
	if (diff > 0) {
		conversations.splice(0, diff);
	}
	currentUser.lastConversationTime = Date.now();
	currentUser.totalTimes += 1;
	return response;
}

/**
 * gpt服务
 * @param {Object} msg 消息体
 * @returns 
 */
export default async function gptService(msg) {
	if (!conversationMap.has(msg.FromUserName)) {
		conversationMap.set(msg.FromUserName, {
			messages: [],
			lastConversationTime: Date.now(),
			totalTimes: 0,
		});
	}
	const composedFn = compose(handlePreset, checkQuota, callChatGPT);
	const result = await composedFn(msg);
	return result;
}
