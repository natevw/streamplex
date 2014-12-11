var util = require('util'),
    stream = require('stream');

var framing = require("./framing.js");

function Messenger(opts) {
    stream.Duplex.call(this);
    
    this._inbox = new framing.FrameReader();      // user writes data into this, we consume
    this._outbox = new framing.FrameWriter();     // we write data into this, user forwards
    
    var self = this;
    self.on('finish', function () {
console.log("messenger finish");
        self._inbox.end();
    });
    
    self._inbox.on('data', function (d) {
console.log("inbox data");
        var chan = d.readUInt16BE(0),
            type = d.readUInt8(2),
            data = d.slice(3);
        if (type === 0x01) {
            var json = JSON.parse(data.toString());   // TODO: try/catch
            self.emit('json:'+chan, json);
        } else {
            self.emit('data:'+chan, data);
        }
        // NOTE: we could emit more general events too if desirable
        //self.emit('message', chan, data);
        //self.emit('message:'+chan, data);
    });
    self._inbox.on('end', function () {
console.log("inbox end");
        self.emit('done');
    });
    self._inbox.on('error', bail);
    
    self._outbox.on('data', function (d) {
console.log("outbox data");
        var more = self.push(d);
        if (!more) self._outbox.pause();
    });
    self._outbox.on('end', function () {
console.log("outbox end");
        self.push(null);
    });
    self._outbox.on('error', bail);
    
    function bail(e) {
        // TODO: what inbox/outbox shutdown?
        self.emit(e);
    }
}
util.inherits(Messenger, stream.Duplex);

Messenger.prototype._read = function (size) {
    this._outbox.resume();
};

Messenger.prototype._write = function (buf, enc, cb) {
    return this._inbox.write(buf, enc, cb);
};


Messenger.prototype._send = function (chan, type, data, cb) {
    var frame = new Buffer(2+1+data.length);
    frame.writeUInt16BE(chan, 0);
    frame.writeUInt8(type, 2);
    data.copy(frame, 3);
    this._outbox.write(frame, cb);      // (ergo, send cb is optional)
};

Messenger.prototype.sendData = function (chan, data, cb) {
    this._send(chan, 0x00, data, cb);
};

Messenger.prototype.sendJSON = function (chan, obj, cb) {
    var data = new Buffer(JSON.stringify(obj));
    this._send(chan, 0x01, data, cb);
};

Messenger.prototype.sendNoMore = function () {
    this._outbox.end();
};


module.exports = Messenger;
