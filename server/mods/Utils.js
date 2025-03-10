const fs = require('fs');
const path = require('path');

const pitches = ['C','C#/Db','D','D#/Eb','E','F','F#/Gb','G','G#/Ab','A','A#,Bb','B'];

const scales = {
    major: [0, 2, 4, 5, 7, 9, 11],
    naturalMinor: [0, 2, 3, 5, 7, 8, 10],
    harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
    melodicMinor: [0, 2, 3, 5, 7, 9, 11],
};

const midiEventTypes = {
    // Channel Events (0x8-0xE)
    8: "Note Off",
    9: "Note On",
    10: "Polyphonic Key Pressure (Aftertouch)",
    11: "Control Change",
    12: "Program Change",
    13: "Channel Pressure (Aftertouch)",
    14: "Pitch Bend",

    // Meta Events (0x00-0x7F, triggered by 0xFF prefix)
    0: "Sequence Number",
    1: "Text Event",
    2: "Copyright Notice",
    3: "Track Name",
    4: "Instrument Name",
    5: "Lyric Text",
    6: "Marker",
    7: "Cue Point",
    32: "MIDI Channel Prefix",
    33: "MIDI Port (Obsolete)",
    47: "End of Track",
    81: "Tempo Change",
    84: "SMPTE Offset",
    88: "Time Signature",
    89: "Key Signature",
    127: "Sequencer-Specific Meta Event"
};

const midiToPitchName = (midiNote, showOctave=false) => {    
    let pitchIndex = midiNote % 12;

    noteName = pitches[pitchIndex];
    if (showOctave) {
        noteName += Math.floor(midiNote / 12).toString();
    }

    return noteName;
}

function getMidiFiles(directory) {
    return fs.readdirSync(directory)
        .filter(file => (file.toLowerCase().endsWith('.mid') || file.toLowerCase().endsWith('.midi')))
        .map(file => path.join(directory, file));
}



module.exports = {
    pitches, scales, midiEventTypes,
    midiToPitchName,
    getMidiFiles
}
