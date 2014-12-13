// demo from https://github.com/maxogden/multiplex#example (plus custom event)

//var streamplex = require('streamplex');
var streamplex = require("../");

var plex1 = streamplex(streamplex.A_SIDE),
    stream1 = plex1.createStream(),
    stream2 = plex1.createStream("$stream_two");

var plex2 = streamplex(streamplex.B_SIDE, function onstream(stream, id) {
  stream.on('data', function (c) {
    console.log('# data', id || "<anonymous>", c.toString());
  });
  stream.on('some_event', function (val, obj) {
      console.log('# event', id, val, obj);
  });
});

plex1.pipe(plex2);

stream1.write(new Buffer('stream one!'));
stream2.write(new Buffer('stream two!'));
stream2.remoteEmit('some_event', "arg1", {json:true});