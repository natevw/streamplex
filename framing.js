var util = require('util'),
    stream = require('stream');

function ReadFrames() {
    stream.Transform.call(this, {objectMode:true});
    
    this._expected = 0;
    this._chunks = [];
    this._chunks.byteLen = 0;
}
util.inherits(ReadFrames, stream.Transform);

ReadFrames.prototype._transform = function (buf, _, cb) {
    this._chunks.push(buf);
    this._chunks.byteLen += buf.length;
    
    var lenNeeded = (this._expected) ? this._expected : 2;
    if (this._chunks.byteLen < lenNeeded) cb();
    else {
        var buffer = Buffer.concat(this._chunks, this._chunks.byteLen);
        this._chunks.length = this._chunks.byteLen = 0;
        if (!this._expected) {
            this._expected = buffer.readUInt16BE(0);
            buffer = buffer.slice(2);
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

ReadFrames.prototype._flush = function (cb) {
    if (this._chunks.byteLen) cb(new Error("Frame reader finished with unconsumed data!"));
    else cb();
};

function WriteFrames() {
    stream.Transform.call(this, {objectMode:true});
}
util.inherits(WriteFrames, stream.Transform);

WriteFrames.prototype._transform = function (buf, _, cb) {
    if (buf.length > 0xFFFF) cb(new Error("Frames must be 64KB or less!"));
    var frame = Buffer(2+buf.length);
    frame.writeUInt16BE(buf.length, 0);
    buf.copy(frame, 2);   // TRADEOFF: do this copy, or push twice :-/
    this.push(frame);
    cb();
};

exports.ReadFrames = ReadFrames;
exports.WriteFrames = WriteFrames;

