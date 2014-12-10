var util = require('util'),
    stream = require('stream');

function Framing() {
    stream.Transform.call(this, {objectMode:true});
    
    this._expected = 0;
    this._chunks = [];
    this._chunks.byteLen = 0;
}
util.inherits(Framing, stream.Transform);

Framing.prototype._transform = function(buf, enc, cb) {
    this._chunks.push(buf);
    this._chunks.byteLen += buf.length;
    
    var lenNeeded = (this._expected) ? this._expected : 4;
    if (this._chunks.byteLen < lenNeeded) cb();
    else {
        var buffer = Buffer.concat(this._chunks, this._chunks.byteLen);
        this._chunks.length = this._chunks.byteLen = 0;
        if (!this._expected) {
            this._expected = buffer.readUInt32BE(0);
            buffer = buffer.slice(4);
        }
        if (buffer.length >= this._expected) {
            var frame = buffer.slice(0, this._expected);
            this._expected = 0;
            this.push(frame);
            buffer = buffer.slice(frame.length);
        }
        var self = this;
        if (!buffer.length) cb();
        else setImmediate(function () {
            // recurse (without blowing stack) for remaining data
            self._transform(buffer, null, cb);
        });
    }
};

Framing.prototype._flush = function (cb) {
    if (this._chunks.byteLen) cb(new Error("Unconsumed partial frame"));
    else cb();
};

module.exports = Framing;
