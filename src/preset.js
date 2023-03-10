/**
 * 预设回复
 * key为正则表达式字符串
 * value为字符串或者函数，函数接受正则匹配结果作为参数
 * 如
 * {
 * 	'^你好啊$': '我是xxx',
 * 	'^你选(.+?)$': (...choices) => {
 * 		return `你选择的是${choices.join('、')}`;
 * 	}
 * }
 */
export default {
	
};