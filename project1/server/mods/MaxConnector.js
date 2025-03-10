const Max = require('max-api');
const midiReader = require('./MidiFileReader');
const Utils = require('./Utils');

let fileIndex = 0;
let fileList = [];
let midiPath = 'midi';

// Receive messages from Max/MSP
Max.addHandler('setMidiPath', (path) => {
    midiPath = path;
    fileList = Utils.getMidiFiles(midiPath);
    console.log(midiPath);
});

Max.addHandler('keydetect', () => {
    if (fileList.length < 1) {
        fileList = Utils.getMidiFiles(midiPath);
        console.log(`Read files ${ fileList.length }`);
    }

    let max = fileList.length;

    fileIndex = Math.floor(Math.random() * (max + 1));
    if (fileIndex > fileList.length) fileIndex = 0;

    let filename = fileList[fileIndex];

    console.log(filename);
    midiReader.loadFile(fileList[fileIndex++]);

    if (fileIndex > fileList.length) fileIndex = 0;
    let { root, transposeAmount, classification, score } = midiReader.analyzers[0].keyDetected[0];
    let key = `${ root } ${ classification }`; 

    let trainingData = {
        pitch: midiReader.analyzers[0].markov.pitch.map(x => x + transposeAmount).join(' '),
        velocity: midiReader.analyzers[0].markov.velocity.join(' '),
        duration: midiReader.analyzers[0].markov.duration.join(' ')
    }

    console.log(trainingData);


    sendPost(`${ midiReader.filepath } ${ transposeAmount } `);
    Max.outlet(
        score, 
        transposeAmount, 
        key, 
        midiReader.filepath.split('/').pop(),
        trainingData.pitch,
        trainingData.velocity,
        trainingData.duration
    );
});

// generic catch-all if already prepped
const sendOutlet = msg => Max.outlet(msg);
const sendPost = msg => Max.post(msg);

const sendNote = data => {
    let { channel = 1, note, velocity, duration, timestamp = 0 } = data;
    
    // Send to Max
    Max.post(`Time: ${ (timestamp/1000).toFixed(4) } | Note: ${ note } ${ velocity } ${ duration}`);
    Max.outlet(['play', channel, note, velocity, duration]);
}

// Send messages to Max/MSP
module.exports = {
    sendOutlet,
    sendPost,
    sendNote
}