//var streamplex = require('streamplex'),
var streamplex = require("../");

function node1(incoming, outgoing) {
    var plex1 = streamplex(streamplex.A_SIDE);
    incoming.pipe(plex1).pipe(outgoing);        // often, `incoming === outgoing` (duplex connection)
    
    plex1.on('stream', function (stream, name) {
        console.log("# REMOTE SIDE CREATED A DUPLEX STREAM, NAMED [OPTIONALLY]:", name || '');
        
        // it's Writable
        stream.write("I BID YOU ");
        stream.end("GOOD DAY, SIR.");
        
        // and Readable
        stream.on('data', function (d) {
            console.log("# DATA:", d.toString());
        });
        stream.on('end', function () {
            console.log("# DONE");
        });
        
        // and also passes custom events back and forth
        stream.on('some_custom_event', function (val) {
            console.log("# OUR EVENT FIRED");
            stream.remoteEmit('LOUDER', val.toUpperCase().replace("?","!"));
        });
    });
    
    // streamplex tunnels can also send/receive arbitrary JSON
    plex1.sendMessage(42);
    plex1.on('message', function (obj) {
        console.log("# …tunnel-level", obj.note);
    });
}

function node2(incoming, outgoing) {
    var plex2 = streamplex(streamplex.B_SIDE);
    incoming.pipe(plex2).pipe(outgoing);
    
    var namedStream = plex2.createStream("inigo montoya");
    namedStream.on('data', function (d) {
        console.log("# data:", d.toString());
    });
    namedStream.on('end', function () {
        console.log("# done");
        namedStream.write("should auld acquaintance be forgot");
        
        var anonStream = plex2.createStream();
        anonStream.remoteEmit('some_custom_event', "any jsonifiable arguments?");
        anonStream.on('LOUDER', function (response) {
            console.log("# substream-level custom events with:", response);
            anonStream.write("huzzah!");
        });
        
        plex2.sendMessage({note:"JSON messages too!"});
    });
}


// simulate each node's end of a duplex connection
var connectionHalfA = require('stream').PassThrough(),
    connectionHalfB = require('stream').PassThrough();
node1(connectionHalfA, connectionHalfB);
node2(connectionHalfB, connectionHalfA);
