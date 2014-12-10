var util = require('util'),
    stream = require('stream');


var framing = require("./framing.js");


function Tunnel(opts) {
    opts || (opts = {});
    stream.Duplex.call(this, {
        highWaterMark: 0,
        // NOTE: settings below are node defaults, but important. (do not allow override!)
        objectMode: false,
        decodeStrings: true,
        encoding: null
    });
}
util.inherits(Tunnel, stream.Duplex);

Tunnel.prototype.createStream = function (id) {
    return new stream.PassThrough();
};

Tunnel.prototype._read = function (size) {
    // this.push(chunk);
};

Tunnel.prototype._write = function (buf, enc, cb) {
    cb();
};

module.exports = function (opts, cb) {
    if (typeof opts === 'function') {
        cb = opts;
        opts = null;
    }
    
    var tunnel = new Tunnel(opts);
    if (cb) tunnel.on('stream', cb);
    return tunnel;
};
