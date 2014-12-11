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
    
    this._counter = ('n' in opts) ? opts.n - 1 : 0;
    this._step = ('of' in opts) ? opts.of : 2;
    
    var self = this;
    self._messenger = new Messenger();
    self._messenger.on('json:0', function (d) {
        if (d.type === 'stream') {
            var stream = new Substream(this, d.sock);
            self.emit('stream', stream, d.name);
        } else {
            console.warn("Unknown control message:", d);
        }
    });
    self._messenger.on('data', function (d) {
        var more = self.push(d);
        if (!more) self._messenger.pause();
    });
    
}
util.inherits(Tunnel, stream.Duplex);

// TODO: inherit from Messenger instead?
Tunnel.prototype._read = function (size) {
    this._messenger.resume();
};
Tunnel.prototype._write = function (buf, enc, cb) {
    return this._messenger.write(buf, enc, cb);
};

Tunnel.prototype.createStream = function (name) {
    var sock = this._counter;
    this._counter += this._step;
    this._messenger.sendJSON(0, {
        type: 'stream',
        sock: sock,
        name: name
    });
    return new Substream(this._messenger, sock);
};

module.exports = Tunnel;
