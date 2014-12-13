var Tunnel = require("./tunnel.js");

module.exports = function (opts, cb) {
    if (typeof opts === 'function') {
        cb = opts;
        opts = null;
    }
    
    var tunnel = new Tunnel(opts);
    if (cb) tunnel.on('stream', cb);
    return tunnel;
};

exports.A_SIDE = {n:1,of:2};
exports.B_SIDE = {n:2,of:2};
