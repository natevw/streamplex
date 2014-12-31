var test = require('tap').test,
    util = require('util'),
    stream = require('stream'),
    streamplex = require("../");

test("Basic API", function (t) {
  t.equal(typeof streamplex, 'function', "Module exports a function.");
  
  var tunnel = streamplex(streamplex.A_SIDE);
  t.ok(tunnel instanceof stream.Duplex, "Function creates a tunnel instance.");
  t.equal(typeof tunnel.createStream, 'function', "Tunnel has a `.createStream()` method.");
  
  var substream = tunnel.createStream();
  t.ok(substream instanceof stream.Duplex, "Create method returns a duplex stream.");
  
  t.end();
});


test("Stream creation", function (t) {
  var tun1 = streamplex(streamplex.A_SIDE),
      tun2 = streamplex(streamplex.B_SIDE);
  tun1.pipe(tun2).pipe(tun1);
  
  t.plan(4);
  
  tun1.on('stream', function (substream, id) {
      t.ok(substream instanceof stream.Duplex);
      t.equal(id, 'first');
  });
  tun2.createStream('first');
  
  tun2.on('stream', function (substream, id) {
      t.ok(substream instanceof stream.Duplex);
      t.equal(id, 'second');
  });
  tun1.createStream('second');
});

test("Message sending", function (t) {
  var tun1 = streamplex(streamplex.A_SIDE),
      tun2 = streamplex(streamplex.B_SIDE);
  tun1.pipe(tun2).pipe(tun1);
  
  t.plan(2);
  
  tun1.on('message', function (d) {
      t.equal(typeof d, 'object');
      t.equal(d.key, "value");
  });
  tun2.sendMessage({key:"value"});
});

test("Substream usage", function (t) {
  var tun1 = streamplex(streamplex.A_SIDE),
      tun2 = streamplex(streamplex.B_SIDE);
  
  t.plan(4);
  
  var streamA = tun2.createStream('a'),
      streamB = tun2.createStream('b');
  streamA.write("Hello, ");
  streamB.write("The quick brown");
  streamA.end("world!");
  streamB.end(" fox, what does it say?");
  streamA.remoteEmit('some_event', "thing1", {thing:2});
  tun1.pipe(tun2).pipe(tun1);
  
  var data = {a:'', b:''},
      want = {a:"Hello, world!", b:"The quick brown fox, what does it say?"};
  tun1.on('stream', function (substream, id) {
      substream.on('data', function (d) {
          data[id] += d.toString();
      });
      substream.on('end', function () {
          t.equal(data[id], want[id]);
      });
      substream.on('some_event', function (a, b) {
          t.equal(a, "thing1");
          t.equal(b.thing, 2);
      });
  });
});

test("Custom subclasses", function (t) {
  function Custom() {
      stream.Duplex.call(this);
  }
  util.inherits(Custom, stream.Duplex);
  
  var tunnel = streamplex(streamplex.A_SIDE, {subclass:Custom});
  
  var substream = tunnel.createStream();
  t.ok(substream instanceof Custom, "Create method returns custom instance.");
  t.equal(typeof substream._write, 'function', "stream.Duplex _write provided for custom instance.");
  t.equal(typeof substream._read, 'function', "stream.Duplex _read provided for custom instance.");
  
  t.end();
});

