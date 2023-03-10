import path from 'path';
import { fileURLToPath } from 'url';

// esmodule不存在__dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export default {
	token: process.env.TOKEN || '', // 微信后台的token，可以通过npm run token生成
	apiKey: process.env.OPENAI_API_KEY || '', // openAI的key
	maxTimes: 15, // 单人单会话限额
	checkPeriod: 1800000, // 检测会话间隔
	logdir: path.resolve(__dirname, '../logs'), // 日志目录
	cacheSession: 300000, // 会话缓存保留时长
	relatedSessions: 2, // 关联会话数
	maxContentLength: 100, // 会话最大内容
};