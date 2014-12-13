# streamplex

Tunnel multiple duplex streams through a single duplex connection. You can remotely emit custom events on tunneled substreams, Per-substream backpressure events are [TODO…](https://github.com/natevw/streamplex/issues/1) handled automatically for you as well!

## Example

Streamplex is designed for distributed use (e.g. across a `net.Socket`), but you can simply pipe two streamplex instances directly together:

```
var streamplex = require('streamplex');

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
```


## Relationship to 'multiplex'

The example above may look [eerily familiar](https://github.com/maxogden/multiplex/blob/9a2cc9b4d33096bd90e4c2094fdd44536ac880fc/readme.md#example) — streamplex is directly inspired by [multiplex](https://github.com/maxogden/multiplex)'s clean API. At present, it even has some internal hacks [which you should not rely on!] which allow it to pass multiplex's own test suite!\*

You can think of streamplex as "multiplex with extra features". In fact, the initial plan was to contribute the needed features on multiplex itself. Unfortunately, a fundamental [compatibility issue](https://github.com/mafintosh/protocol-buffers/issues/18) with one of its dependencies meant it was simpler to just start fresh.

\* Even though the basic APIs are mostly compatible, there are some important differences:

* The **underlying protocol is incompatible**. Sorry, you cannot use streamplex at one end of a tunnel, and multiplex at the other!
* For concurrency reasons, [unless you are the multiplex test suite] you must initialize each streamplex endpoint with alternate `A_SIDE` vs. `B_SIDE` configuration (consult API reference)


## API

* `tunnel = streamplex(side, [options,] [callback])` — this module exports a single function, which returns one end of a tunnel. This local "tunnel" instance is a duplex stream that inputs and outputs its internal protocol as an opaque flow of bytes. Connect the local instance to another streamplex instance, typically over some other duplex transport: `socket.pipe(tunnel).pipe(socket)` on each end. Pass `streamplex.A_SIDE` or `streamplex.B_SIDE` such that the local instance considers itself on the opposite `side` of the remote instance — by convention you could assign side A to the centralized "server" or peer-to-peer "initiator" and side B to the "client"/"receiver", just make sure both sides aren't using the same value. (See "channel numbering" internals to learn why.) If you provide a `callback` it will be registered as a `'stream'` event listener as a convenience. Any `options` argument is currently ignored.
* `tunnel.on('stream', handler)` — event emitted as `handler(substream, name)` after the remote side has created a stream. `substream` is a [stream.Duplex](http://nodejs.org/api/stream.html#stream_class_stream_duplex_1) instance and `name` is the name if one was provided.
* `substream = tunnel.createStream([name])` — returns a [stream.Duplex](http://nodejs.org/api/stream.html#stream_class_stream_duplex_1) instance ready for use. Data piped in to this substream will be read from its remote counterpart; data written remotely will flow out of this substream. `name` is optional, and need not be unique — it is simply a string that can be provided to the `'stream'` event handler.
* `substream.remoteEmit(name, …)` — the remote counterpart of this substream is an [events.EventEmitter](http://nodejs.org/api/events.html#events_class_events_eventemitter), and calling this method locally causes the `name`d event to fire there with any provided arguments. Note that all additional arguments passed in `…` must be JSON-serializable.

That's pretty much it. Substreams (and the tunnel itself) should emit all the usual stream events — note that any `'error'` is fatal within its context — replace any substream that errors, or connect a new pair of tunnel instances if one of them should error.


custom events  [priority data](http://www.slideshare.net/engineerrd/tcp-immediate-data-transfer)–like ability to push custom events on a stream.




## Internals

Divided into three layers:

* read/write transforms of raw payload-like "frames"
* conversion of frames to channel-associated json/blob "messages"
* finally the tunnel coordinates how channels are allocated as "substreams"

So really this "should" be split into three separate [tiny and very hungry](http://en.wikipedia.org/wiki/The_Very_Hungry_Caterpillar) npm package-pillars but ain't nobody got time for that…

Please ignore these [early protocol notes](https://gist.github.com/natevw/f7934b0f0ef49d8254b6) which I am linking to from here for my own convenience — that document may or may not match what is currently/eventually ever implemented.

### Channel numbering

The `side` argument is an internal detail which which I've opted to leave exposed, for the sake of implementation simplicity. It avoids a concurrency problem with channel numbers at the messaging layer.

Internally a substream communicates with its remote counterpart by exchanging messages tagged with a 16-bit unsigned number (like the internet protocol's "port"). Channel 0 is reserved for tunnel-level control messages, and the rest can be assigned to a substream for its exclusive use.

The trouble we want to avoid, is when both ends create a substream simultaneously. This is a race condition. If they both optimistically use the next available channel number, it will conflict. The two ends would have to detect this, and subsequently renegotiate the assignment for one or both substreams. Theoretically they could use this negotiation code only once during a more pessimistic initial handshake, but we'd still need the code…

If we could simply tell which node was "primary" and which node were "secondary", we could assign them a set of unique numbers to use (like: primary uses odd-numbered, secondary uses even-numbered channels). But the streamplex instances will pretty much start getting some amount of bytes flung at them whenever they make it through the underlying channel, and so there's no particularly simple way to come to agreement.

In practice, though, while the streamplex instances have no intrisic concept of who's on first or what's on second, the "app" providing the underlying transport does. In a client/server context it's usually quite clear which is which at the app level. Even in a peer-to-peer context, one of the peers tends to be the one that initiated the underlying TCP connection, or has a lower hash value for its cryptosecretive identity, or it can fuss through electing sides, whatever. Point being, we've left the determination of "which side is which" to the app level.

And that's exactly what `streamplex.A_SIDE` and `streamplex.B_SIDE` accomplish. Each results in channels being assigned from a different unique set, and so there's no risk of conflict so long as each side is properly configured. (Theoretically, if you know that only one side will ever be creating substreams, they could safely share the same configuration — but if you do really *really* know that, you also know enough to configure the sides properly anyway…)


## License

© 2014 Nathan Vander Wilt.
Funding for this work provided by Technical Machine, Inc.

Reuse under your choice of:

* [BSD-2-Clause](http://opensource.org/licenses/BSD-2-Clause)
* [Apache 2.0](http://www.apache.org/licenses/LICENSE-2.0.html)