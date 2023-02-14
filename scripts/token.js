/**
 * 生成指定位数的token
 * @param {Number} n 位数
 * @returns 
 */
function generateToken(n) {
	let token = '';
	const pool = getSelectionPool();
	const poolSize = pool.length;
	while(token.length < n) {
		token += pool[Math.round(Math.random() * poolSize)];
	}
	return token;
}

function getSelectionPool() {
	const result = [];
	const letterSize = 26;
	const upLetterStartAt = 65;
	const lowLetterStartAt = 97;
	for (let i = upLetterStartAt, end = upLetterStartAt + letterSize; i < end; i ++) {
		result.push(String.fromCharCode(i));
	}
	for (let i = lowLetterStartAt, end = lowLetterStartAt + letterSize; i < end; i ++) {
		result.push(String.fromCharCode(i));
	}
	for (let i = 0; i <= 9; i++) {
		result.push('' + i);
	}
	return result;
}

console.log(generateToken(30));