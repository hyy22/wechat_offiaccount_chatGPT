import path from 'path';
import { fileURLToPath } from 'url';

// esmodule不存在__dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export default {
	token: process.env.TOKEN || '', // 微信后台的token，可以通过npm run token生成
	apiKey: process.env.OPENAI_API_KEY || 'openai-key', // openAI的key
	maxTimes: 50, // 单人单会话限额50次
	checkPeriod: 86400000, // 检测会话间隔24小时
	logdir: path.resolve(__dirname, '../logs'), // 日志目录
};