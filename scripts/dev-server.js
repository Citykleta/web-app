const koa = require('koa');
const static = require('koa-static');
const {createReadStream} = require('fs');
const logger = require('koa-logger');
const app = new koa();
const {resolve} = require('path');

app.use(logger());
app.use(static(resolve(process.cwd(),'./dist/')));
app.use(async (ctx, next) => {
    if (!ctx.body && ctx.path !== '/favicon.ico') {
        ctx.type = 'text/html; charset=utf-8';
        ctx.body = createReadStream('./dist/index.html');
    }
});

app.listen(3001);
