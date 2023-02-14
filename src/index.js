import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import Router from '@koa/router';
import { handle } from './authHandle.js';
import { handleMsg } from './handleMsg.js';

const PORT = 3000;
const app = new Koa();
const router = new Router();
app.use(bodyParser({
	enableTypes: ['json', 'form', 'xml', 'text'],
}));
router.get('/wx', async ctx => {
	ctx.body = handle(ctx.query);
});
router.post('/wx', async ctx => {
	ctx.body = await handleMsg(ctx.request.body);
});
app.use(router.routes());
app.listen(PORT, () => {
	console.log(`server running at port ${PORT}`);
});