import path from 'path';
import log4js from 'log4js';
import config from './config.js';

log4js.configure({
	appenders: {
		access: {
			type: 'dateFile',
			pattern: '-yyyy-MM-dd.log', // 生成文件的规则
			filename: path.join(config.logdir, 'access.log'), // 生成文件名
		},
		application: {
			type: 'dateFile',
			pattern: '-yyyy-MM-dd.log',
			filename: path.join(config.logdir, 'application.log'),
		},
		out: {
			type: 'console',
		},
	},
	categories: {
		default: { appenders: ['out'], level: 'info' },
		access: { appenders: ['access'], level: 'info' },
		application: {
			appenders: ['application', 'out'],
			level: 'info',
		},
	},
});

// 访问日志
export const accessLogger = log4js.getLogger('access');
// 应用日志
export const logger = log4js.getLogger('application');