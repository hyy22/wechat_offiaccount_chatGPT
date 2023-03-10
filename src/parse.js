import xml2js from 'xml2js';

/**
 * 解析消息体
 * @param {XMLDocument} data 
 * @returns 
 */
export function parseMsg(data) {
	return xml2js.parseStringPromise(data, { explicitArray: false });
}

/**
 * 构建消息体
 * @param {Object} data json数据
 * @returns 
 */
export function buildMsg(data) {
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
