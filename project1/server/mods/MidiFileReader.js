const fs = require('fs');
const Utils = require('./Utils');
const MidiFileAnalyzer = require('./MidiFileAnalyzer');

class MidiFileReader {
    constructor() {
        if (MidiFileReader.instance) {
            return MidiFileReader.instance;
        }
        
        MidiFileReader.instance = this;

        this.filepath = '';
        this.buffer = null;
        this.offset = 0;
        this.tracks = [];
        this.analyzers = [];
        this.header = {};
        this.tempo = 0;
        this.microsecs = 0;
        this.transpoisition = 0;
    }

    loadFile(filepath) {
        this.filepath = filepath;
        this.buffer = fs.readFileSync(filepath);
        this.offset = 0;
        this.tracks = [];
        this.analyzers = [];
        this.header = {};
        this.tempo = 0;
        this.microsecs = 0;

        // deserialize the file
        this.deserialize();
    }

    readUint8() {
        return this.buffer[this.offset++];
    }

    readUint16() {
        const value = (this.buffer[this.offset] << 8) | this.buffer[this.offset + 1];
        this.offset += 2;
        return value;
    }

    // there isn't a Uint24 but this is a 24-bit binary number representation
    readUint24() {
        const value = (this.buffer[this.offset] << 16) | (this.buffer[this.offset + 1] << 8) | this.buffer[this.offset + 2];
        this.offset += 3;
        return value;
    }

    readUint32() {
        const value =
            (this.buffer[this.offset] << 24) |
            (this.buffer[this.offset + 1] << 16) |
            (this.buffer[this.offset + 2] << 8) |
            this.buffer[this.offset + 3];
        this.offset += 4;
        return value >>> 0;
    }

    readLength(length) {
        let val;
        switch(length) {
            case 1:
                val = this.readUint8();
                break;
            case 2:
                val = this.readUint16();
                break;
            case 3:
                val = this.readUint24();
                break;
            case 4:
                val = this.readUint32();
                break;
            default:
                val = this.buffer.slice(this.offset, this.offset + length);
                this.offset += length;
                break;
        }
        return val;
    }

    readVariableLength() {
        let value = 0;
        while (true) {
            let byte = this.readUint8();
            value = (value << 7) | (byte & 0x7F);
            if (!(byte & 0x80)) break;
        }
        return value;
    }

    readString(length) {
        const str = this.buffer.toString('utf-8', this.offset, this.offset + length);
        this.offset += length;
        return str;
    }

    computeTime(ticks) {
        // time = ticks * (microsecs per quarter) / (ticks per quarter * 1E6)
        return (ticks * this.microsecs) / (this.header.division * 1E6);
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        const millis = Math.floor((seconds % 1) * 1000);
    
        return `${String(minutes).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
    }

    setTempo(microsecs) {
        this.microsecs = microsecs;
        this.tempo = `${(6E7 / microsecs).toFixed(3)} BPM`; 
        return this.tempo;
    }

    parseHeader() {
        const chunkType = this.readString(4);
        if (chunkType !== 'MThd') throw new Error('Invalid MIDI file: Missing MThd header');

        const chunkLength = this.readUint32();
        if (chunkLength !== 6) throw new Error('Invalid header length');

        this.header.format = this.readUint16();
        this.header.numTracks = this.readUint16();
        this.header.division = this.readUint16();
    }

    parseTrack() {
        const chunkType = this.readString(4);
        if (chunkType !== "MTrk") throw new Error("Invalid track chunk");
    
        const chunkLength = this.readUint32();
        const trackEnd = this.offset + chunkLength;
        const events = [];
    
        let elapsedTime = 0;
        let runningStatus = null;
    
        while (this.offset < trackEnd) {
            let deltaTime = this.readVariableLength();
            elapsedTime += this.computeTime(deltaTime);
            let statusByte = this.readUint8();
    
            if (statusByte >= 0x80) {
                runningStatus = statusByte;
            } else if (runningStatus) {
                statusByte = runningStatus;
                this.offset--;
            } else {
                console.error(`Invalid MIDI state at offset ${this.offset.toString(16)}`);
                break;
            }
    
            if (statusByte >= 0x80 && statusByte <= 0xEF) {
                let number = (statusByte & 0xF0) >> 4;
                let name = this.getEventTypeName(number);
                let channel = (statusByte & 0x0F) + 1;
                let param1 = this.readUint8();
                let param2 = (number !== 12 && number !== 13) ? this.readUint8() : null;
                events.push({ elapsedTime, name, number, channel, param1, param2 });
            } else if (statusByte === 0xFF || statusByte === 0xF0 || statusByte === 0xF7) {
                let number = this.readUint8();
                let name = this.getEventTypeName(number);
                let length = this.readVariableLength();
                let data = this.readLength(length);
    
                if (number === 81) data = this.setTempo(data);
    
                events.push({ elapsedTime, name, number, data });
            } else {
                console.error(`Unknown status byte: ${statusByte.toString(16)}`);
            }
        }
    
        return events;
    }
    
    deserialize() {
        if (! (this.filepath.length > 0 && this.filepath.includes('.mid'))) return;

        this.parseHeader();

        for (let i = 0; i < this.header.numTracks; i++) {
            let track = this.parseTrack();
            this.tracks.push(track);

            // skip the first track analysis on Midi Format 1
            if (!(this.header.format == 1 && i == 0)) {
                this.analyzers.push(new MidiFileAnalyzer(track));
            }
        }

        
    }

    getMidiData() {
        return { header: this.header, tracks: this.tracks };
    }

    // Function to convert a MIDI track to an HTML table
    trackToHtml(track) {
        let html = `
        <p>Midi Events</p>
        <table border="1">
            <tr>
                <th>Elapsed Time</th>
                <th>Event Type</th>
                <th>Value</th>
                <th>Param 1</th>
                <th>Param 2</th>
            </tr>`;

        track.forEach(event => {
            let {
                elapsedTime,
                name,
                channel,
                data = '-',
                param1 = '-',
                param2 = '-'
            } = event;
            html += `
            <tr>
                <td>${this.formatTime(elapsedTime)}</td>
                <td>${name}</td>
                <td>${channel || data || "-"}</td>
                <td>${param1}</td>
                <td>${param2}</td>
            </tr>`;
        });

        html += "</table>";
        return html;
    }

    getEventTypeName(eventType) {
        return Utils.midiEventTypes[eventType] || `Unknown Event (${eventType})`;
    }
}

//create and export the singleton
MidiFileReader.instance = new MidiFileReader();
module.exports = MidiFileReader.instance;