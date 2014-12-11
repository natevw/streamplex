var test = require('tap').test,
    stream = require('stream'),
    streamplex = require("../");

test("Basic API", function (t) {
  t.equal(typeof streamplex, 'function', "Module exports a function.");
  
  var tunnel = streamplex();
  t.ok(tunnel instanceof stream.Duplex, "Function creates a tunnel instance.");
  t.equal(typeof tunnel.createStream, 'function', "Tunnel has a `.createStream()` method.");
  
  var substream = tunnel.createStream();
  t.ok(substream instanceof stream.Duplex, "Create method returns a duplex stream.");
  
  t.end();
});


test("Stream creation", function (t) {
  var tun1 = streamplex(),
      tun2 = streamplex();
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


test("Substream usage", function (t) {
  var tun1 = streamplex(),
      tun2 = streamplex();
  tun1.pipe(tun2).pipe(tun1);
  
  t.plan(2);
  
  var data = {a:'', b:''};
  tun1.on('stream', function (substream, id) {
      substream.on('data', function (d) {
          data[id] += d.toString();
          console.log("# %j", data);
      });
      substream.on('end', function () {
          if (id === 'a') t.equal(data['a'], "Hello, world!");
          else if (id === 'b') t.equal(data['a'], "The quick brown fox, what does it say?");
          else t.fail("Bad stream id: "+id);
      });
  });
  var streamA = tun2.createStream('a'),
      streamB = tun2.createStream('b');
  streamA.write("Hello, ");
  streamB.write("The quick brown");
  streamA.end("world!");
  streamB.end(" fox, what does it say?");
});
