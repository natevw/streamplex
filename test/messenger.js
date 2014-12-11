var test = require('tap').test,
    Messenger = require("../messenger.js");

test("Messenger", function (t) {
    var streamA = new Messenger(),
        streamB = new Messenger();
    streamA.pipe(streamB);
    
    streamA.sendJSON(42, {thing:1});
    streamA.sendJSON(86, {nope:null});
    streamA.sendData(42, new Buffer("hello"));
    streamA.sendJSON(42, {thing:2});
    streamA.sendData(86, new Buffer("wrong"));
    streamA.sendData(42, new Buffer("world"));
    
    var objs = [], bufs = [];
    streamB.on('json:42', function (obj) { objs.push(obj); });
    streamB.on('data:42', function (buf) { bufs.push(buf); });
    streamB.on('end', function () {
        t.equal(objs.length, 2);
        t.equal(objs[0].thing, 1);
        t.equal(objs[1].thing, 2);
        t.equal(bufs.length, 2);
        t.equal(buffs[0].toString(), "hello");
        t.equal(buffs[0].toString(), "world");
        t.end();
    });
});
