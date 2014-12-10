var test = require('tap').test,
    Framing = require("../framing.js");

test("Framing", function (t) {
    var stream = new Framing();
    
    stream.write(Buffer([0x00, 0x00, 0x00, 0x01, 0xFF]));
    stream.write(Buffer([0x00, 0x00]));
    stream.write(Buffer([0x00, 0x05]));
    stream.write(Buffer([0x55, 0x54]));
    stream.write(Buffer([0x53, 0x52]));
    stream.write(Buffer([0x51, 0x00]));
    stream.write(Buffer([0x00, 0x00]));
    stream.write(Buffer([0x01, 0x00]));
    stream.end();
    
    var frames = [];
    stream.on('data', function (frame) {
        frames.push(frame);
    });
    stream.on('end', function () {
        t.equal(frames.length, 3);
        t.equal(frames[0].length, 1);
        t.equal(frames[0][0], 0xFF);
        t.equal(frames[1].length, 5);
        t.equal(frames[1][4], 0x51);
        t.equal(frames[2].length, 1);
        t.equal(frames[2][0], 0);
        t.end();
    });
});