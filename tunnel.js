var util = require('util'),
    stream = require('stream');

var Messenger = require("./messenger.js"),
    Substream = require("./substream.js");

var _tmp = 1;     // HACK: compatibility w/'multiplex' test suite

function Tunnel(side, opts) {
    side || (side = {n:_tmp++, of:0xFF});     // HACK: 'multiplex' test suite compat, DO NOT RELY!
    opts || (opts = {});
    stream.Duplex.call(this, {
        //highWaterMark: 0,
        // NOTE: settings below are node defaults, but important. (do not allow override!)
        objectMode: false,
        decodeStrings: true,
        encoding: null
    });
    
    this._counter = side.n;
    this._step = side.of;
    
    var self = this;
    self._messenger = new Messenger();
    self._messenger.on('json:0', function (d) {
        if (d.type === 'stream') {
            var stream = new Substream(this, d.sock, d.name);
            self.emit('stream', stream, d.name);
        } else {
            console.warn("Unknown control message:", d);
        }
    });
    self._messenger.on('data', function (d) {
        var more = self.push(d);
        if (!more) self._messenger.pause();
    });
    self._messenger.on('end', function () {
        self.push(null);
    });
    self._messenger.on('error', function (e) {
        self.emit('error', e);
    });
    self.on('finish', function () {
        self._messenger.sendNoMore();
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
    return new Substream(this._messenger, sock, name);
};

module.exports = Tunnel;
