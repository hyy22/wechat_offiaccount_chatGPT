import { createHash } from 'crypto';
import config from './config.js';

export function handle({ signature, timestamp, nonce, echostr }) {
	if (!signature || !timestamp || !nonce || !echostr) return '';
	const list = [config.token, timestamp, nonce].sort();
	const hash = createHash('sha1');
	list.forEach(v => hash.update(v));
	const hashCode = hash.digest('hex');
	if (hashCode === signature) return echostr;
	return '';
}
