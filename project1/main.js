// launch the webserver
const { app } = require('./server/Server');
const reader = require('./server/mods/MidiFileReader');

// connect to Max
//reader.loadFile('midi/Bach, Johann Sebastian, Invention in A major, BWV 783, qmorlhskYNI.mid');
//console.log(`${ reader.filepath } ${ reader.analyzers[0].keyDetected[0].transposeAmount } `);
const MaxConnector = require('./server/mods/MaxConnector');
