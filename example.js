var tunnel = require("./");


var tun1 = tunnel();
var stream1 = tun1.createStream("1");
var stream2 = tun1.createStream("2");

var tun2 = tunnel(function (stream, id) {
  stream.on('data', function (c) {
    console.log('data', id, c.toString());
  })
});

tun1.pipe(tun2);

stream1.write(new Buffer('stream one!'));
stream2.write(new Buffer('stream two!'));