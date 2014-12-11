var util = require('util'),
    stream = require('stream');

function Substream(messenger, n) {
    stream.Duplex.call(this);
    
    this.sendJSON = function (obj, cb) {
        return messenger.sendJSON(n, obj, cb);
    };
    this.sendData = function (buf, cb) {
        return messenger.sendData(n, buf, cb);
    };
    
    var self = this;
    self.on('finish', function () {
        self.sendJSON({type:'event', name:'end'});
    });
    messenger.on('data:'+n, function (data) {
        self.push(data);
    });
    messenger.on('json:'+n, function (d) {
        if (d.type === 'event') {
            self.emit(d.name);
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
