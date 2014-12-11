var util = require('util'),
    stream = require('stream');

var Messenger = require("./messenger.js"),
    Substream = require("./substream.js");

function Tunnel(opts) {
    opts || (opts = {});
    stream.Duplex.call(this, {
        highWaterMark: 0,
        // NOTE: settings below are node defaults, but important. (do not allow override!)
        objectMode: false,
        decodeStrings: true,
        encoding: null
    });
    
    this._messenger = new Messenger();
    this._messenger.on('json:0', function (d) {
        if (d.type === 'stream') {
            var stream = new Substream(this, d.sock);
            this.emit('stream', stream, d.name);
        } else {
            console.warn("Unknown control message:", d);
        }
    });
}
util.inherits(Tunnel, stream.Duplex);

// TODO: inherit from Messenger instead?
Tunnel.prototype._read = function (size) {
    return this._messenger.read(size);
};
Tunnel.prototype._write = function (buf, enc, cb) {
    return this._messenger.write(buf, enc, cb);
};

Tunnel.prototype.createStream = function (name) {
    var sock = 42;     // TODO
    this._messenger.sendJSON(0, {
        type: 'stream',
        sock: sock,
        name: name
    });
    return new Substream(this._messenger, sock);
};

module.exports = Tunnel;
