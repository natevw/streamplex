var util = require('util'),
    stream = require('stream');

function Substream(messenger, n, name) {
    stream.Duplex.call(this);
    
    this.meta = name;     // multiplex compatibility
    
    this.sendJSON = function (obj, cb) {
        return messenger.sendJSON(n, obj, cb);
    };
    this.sendData = function (buf, cb) {
        return messenger.sendData(n, buf, cb);
    };
    
    var self = this;
    self.on('finish', function () {
        self.sendJSON({event:'end'});
    });
    self.on('error', function (e) {
        self.sendJSON({event:'error', message:e.message});
    });
    messenger.on('data:'+n, function (data) {
        self.push(data);
    });
    messenger.on('json:'+n, function (d) {
        if (d.event === 'error') {
            var e = new Error(d.message);
            self.emit('error', d);
        } else if (d.event === 'end') {
            self.push(null);
        }
        // TODO: handle backpressure messages
    });
}
util.inherits(Substream, stream.Duplex);

Substream.prototype._read = function (size) {
    this.sendJSON({read:size});
};
Substream.prototype._write = function (buf, enc, cb) {
    this.sendData(buf, cb);
};

module.exports = Substream;
