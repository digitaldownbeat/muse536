
const midiReader = require('./MidiFileReader'); 

const Utils = require('./Utils');
const { MidiFileAnalyzer } = require('./MidiFileAnalyzer');

const midiFiles = Utils.getMidiFiles('../datasets/GiantMIDI-PIano_v1.0/midis');
//const midiFiles = Utils.getMidiFiles('midi');

const analyzeRandomFile = (req, res) => {
    const currentMidiFile = midiFiles[Math.floor(Math.random() * midiFiles.length)];
    midiReader.loadFile(currentMidiFile);
    analyzeFile(req, res);
}

const analyzeFile = (req, res) => {
    const midiData = midiReader.getMidiData();

    let html = `<html><head>
<title>MIDI Events</title>
<link rel="stylesheet" href="/styles/index.css">
</head><body>`;
    
html += `<h1>MIDI File Events for: ${ midiReader.filepath }</h1>`;
    
    // Show Header Information
    html += `
        <h2>Header</h2>
        <p>Format: ${midiData.header.format}</p>
        <p>Number of Tracks: ${midiData.header.numTracks}</p>
        <p>Division: ${midiData.header.division}</p>
    `;

    // Show each track's events
    midiData.tracks.forEach((track, index) => {
        html += `<h2>Track ${index + 1}</h2>`;
        
        // skip the first track analysis on Midi Format 1
        if (!(midiReader.header.format == 1 && index == 0)) {
            // adjust index for format
            let i = midiReader.header.format == 1 ? index - 1 : index;
            html += midiReader.analyzers[i].resultsToHtml();
        }

        html += midiReader.trackToHtml(track);
    });

    html += `</body></html>`;
    res.send(html);
}

module.exports = { analyzeRandomFile, analyzeFile };