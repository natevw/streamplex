var util = require('util'),
    stream = require('stream');

function factory(SuperClass) {        // (SuperClass is expected to inherit from stream.Duplex)
    function Substream(messenger, n, opts) {
        SuperClass.call(this, opts);
        
        this.meta = opts && opts.name;     // multiplex compatibility
        
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
            } else if (d.event === 'custom') {
                Substream.prototype.emit.apply(self, d.emitArgs);
            }
            // TODO: handle backpressure messages
        });
    }
    util.inherits(Substream, SuperClass);
    
    Substream.prototype._read = function (size) {
        //this.sendJSON({read:size});
    };
    Substream.prototype._write = function (buf, enc, cb) {
        this.sendData(buf, cb);
    };
    
    Substream.prototype.remoteEmit = function (eventName) {
        if (typeof eventName !== 'string') throw Error("Cannot emit remotely without a valid event name.");
        var args = Array.prototype.slice.call(arguments);
        this.sendJSON({event:'custom', emitArgs:args});
    };
    
    return Substream;
}

var DefaultSubstream = factory(stream.Duplex);
DefaultSubstream.customClass = factory;
module.exports = DefaultSubstream;
