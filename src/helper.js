/**
 * 组合函数
 */
export function compose(...fns) {
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

/**
 * 为异步函数添加重试机制
 * @param {Function} fn 函数
 * @param {Number} times 重试次数
 * @returns 
 */
export function retry(fn, times = 5) {
	return async function handle() {
		try {
			const result = await fn.apply(null, arguments);
			return result;
		} catch (e) {
			if (times > 0) {
				times--;
				const result = await handle();
				return result;
			} else {
				throw new Error('Retry limit exceeded');
			}
		}
	};
}
