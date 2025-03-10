const Utils = require('./Utils');

class MidiFileAnalyzer {
    constructor(track) {
        this.keyDetected = [];
        this.noteOccurences = {};
        this.occurencesAnyOctave = Object.fromEntries(Utils.pitches.map(pitch => [pitch, new NoteData()]));
        this.ranked = [];
        
        this.markov = {
            pitch: [],
            velocity: [],
            duration: []
        }

        this.parseNotes(track);
    }

    getNoteData(midiNote) {
        if (!(midiNote in this.noteOccurences)) {
            this.noteOccurences[midiNote] = new NoteData();
        }
        return this.noteOccurences[midiNote];
    }

    parseNotes(track) {
        if (track == null || track == undefined) return;

        track.forEach( midiEvent => {
            switch (midiEvent.number) {
                // note off
                case 8:
                // note on
                case 9:
                    let noteData = this.getNoteData(midiEvent.param1);
                    noteData.addData(midiEvent);

                    if (noteData.velocity !== 0) {
                        this.markov.pitch.push(noteData.pitch);
                        this.markov.velocity.push(noteData.velocity);
                    } else {
                        this.markov.duration.push(parseInt(noteData.duration * 1000));
                    }
                    break;
            }
        });

        this.combineOctaves();
        
        // this.keyDetected.push(this.determineTonality());
        let tonality = this.determineTonality2();

        this.keyDetected.push(tonality);
        console.log(this.keyDetected);
    }

    combineOctaves(){
        Object.keys(this.noteOccurences).forEach( key => {
            let occurence = this.noteOccurences[key].occurence;
            let velocity = this.noteOccurences[key].totalVelocity;
            let duration = this.noteOccurences[key].totalDuration;

            let midiNote = parseInt(key) % 12;
            let noteData = this.occurencesAnyOctave[Utils.pitches[midiNote]];
            noteData.occurence += occurence;
            noteData.totalVelocity += velocity;
            noteData.totalDuration += duration;
        });

        // sort and slice the chromatic list
        // Convert to array, sort by occurence (descending), convert back to object
        this.ranked = Object.entries(this.occurencesAnyOctave).sort(([, a], [, b]) => b.occurence - a.occurence);
    }

    determineTonality() {        
        const topPitches = this.ranked.slice(0, 7).map(x=>x[0]); // Get the top 7 pitches.
        let bestMatchScore = -1;
        let bestRoot = null;
        let classification = 'Unknown';

        topPitches.forEach(rootName => {
            const root = Utils.pitches.indexOf(rootName);
            const candidateScale = {
                major: Utils.scales.major.map(step => (root + step) % 12),
                minor: Utils.scales.harmonicMinor.map(step => (root + step) % 12)
            }

            // console.log(JSON.stringify(candidateScale.major));
            // console.log(JSON.stringify(candidateScale.minor));

            let matchScore = { major: 0, minor: 0 };
    
            for (const pitch of candidateScale.major) {
                const targetPitch = Utils.pitches[pitch];
                if (topPitches.includes(targetPitch)) {
                    matchScore.major++;
                }
            }

            for (const pitch of candidateScale.minor) {
                const targetPitch = Utils.pitches[pitch];
                if (topPitches.includes(targetPitch)) {
                    matchScore.minor++;
                }
            }
    
            let maxMatchScore = Math.max(matchScore.major, matchScore.minor);
            if ( maxMatchScore > bestMatchScore) {
                bestMatchScore = maxMatchScore;
                bestRoot = root;
                classification = matchScore.major >= matchScore.minor ? "Major" : "Minor";
                // console.log(`Best Root: ${ rootName } [${root}] | Class: ${ classification } | Score: ${ bestMatchScore }`);
            }
        });
    
        return {
            root: Utils.pitches[bestRoot],
            classification,
            score: `${ (bestMatchScore * 100 / topPitches.length).toFixed(1) } %`,
        };
    }

    determineTonality2() {
        let bestMatchScore = -1;
        let bestRoot = null;
        let classification = 'Unknown';

        const totals = Object.values(this.occurencesAnyOctave).reduce((acc, obj) => {
            acc.occurence += obj.occurence;
            acc.duration += obj.totalDuration;
            return acc;
        }, { occurence: 0, duration: 0 });

        //let rankedObj = Object.fromEntries(this.ranked);
        for (let root = 0; root < Utils.pitches.length; root++) {
            let rootName =  Utils.pitches[root];

            let matchScores = {};

            Object.keys(Utils.scales).forEach((type) => {
                let candidate = Utils.scales[type].map(step => (root + step) % 12);
                let fifthName = Utils.pitches[(candidate[4]) % 12];
                let fourthName = Utils.pitches[(candidate[3]) % 12];
                let secondName = Utils.pitches[(candidate[1]) % 12];
                // console.log(`Root: ${ rootName }, 2nd: ${ secondName }, 4th: ${ fourthName }, 5th: ${ fifthName }`);

                let rankKeys = Object.fromEntries(this.ranked);
                let ranks = {
                    I: rankKeys[rootName].occurence * 0.5,
                    V: rankKeys[fifthName].occurence * 0.25,
                    IV: rankKeys[fourthName].occurence * 0.15,
                    ii: rankKeys[secondName].occurence * 0.10
                };
                let avgRank = Object.values(ranks).reduce((sum, rank) => sum + rank, 0) / totals.occurence;

                //console.log(`Ranks are:  ${ JSON.stringify(ranks) }`);

                matchScores[type] = this.calculateMatchScore(candidate, totals, avgRank);
            });

            //console.log(`Match Scores: ` + JSON.stringify(matchScores));
    
            //let maxMatchScore = Math.max(matchScore.major, matchScore.minor);
            const maxKey = Object.entries(matchScores).reduce((max, entry) => 
                entry[1] > matchScores[max] ? entry[0] : max, Object.keys(matchScores)[0]);
            let maxMatchScore = matchScores[maxKey];

            if ( maxMatchScore > bestMatchScore) {
                bestMatchScore = maxMatchScore;
                bestRoot = root;
                classification = maxKey;
                console.log(`Best Root: ${ rootName } [${root}] | Class: ${ classification } | Score: ${ bestMatchScore }`);
            }
        }
    
        return {
            root: Utils.pitches[bestRoot],
            transposeAmount: bestRoot > 6 ? (bestRoot - 12) * -1 : bestRoot * -1,
            classification,
            score: `Match Score: ${ (bestMatchScore * 100).toFixed(2) }`,
        };
    }

    calculateMatchScore(candidate, totals, avgRank) {
        let score = { occurence:0, duration: 0};

        for (const pitchIndex of candidate) {
            let targetPitch = Utils.pitches[pitchIndex];
            //console.log(targetPitch);
            const noteData = this.occurencesAnyOctave[targetPitch];
            score.occurence += noteData.occurence;
            score.duration += noteData.totalDuration;
        }
        score.occurence /= totals.occurence;
        score.duration /= totals.duration;
        
        // averaging occurence and duration, scaling by average of ranks
        return (score.occurence  + score.duration / 2) * avgRank;
    }

    makeTable(title, noteList, convertToPitch=false) {
        let html = `
        <h1><p>${title}</p></h1>
        <table border="1">
            <tr>
                <th>Note</th>
                <th>occurence</th>
                <th>Avg Velocity</th>
                <th>Avg Duration</th>
                <th>Total Duration</th>
            </tr>`;

        Object.keys(noteList).forEach(midiNote => {
            let data = noteList[midiNote];

            html += `
            <tr>
                <td>${ convertToPitch ? Utils.midiToPitchName(midiNote, true) : midiNote }</td>
                <td>${data.occurence}</td>
                <td>${data.avgVelocity().toFixed(0)}</td>
                <td>${data.avgDuration().toFixed(3)}</td>
                <td>${data.totalDuration.toFixed(3)}</td>
            </tr>`;
        });
        html += '</table>';

        return html;
    }

     // Function to convert a MIDI track to an HTML table
     resultsToHtml() {
        let html = '';
        this.keyDetected.forEach(detection => {
            html += `<p><h2>Key Detected: ${ detection.root} ${ detection.classification }, Confidence: ${ detection.score }</h2></p>`;
            html += `<p>Transpose amount: ${ detection.transposeAmount }</p>`;
        }); 
        
        html += this.makeTable('Greatest to Least Occurence', Object.fromEntries(this.ranked), false);
        html += this.makeTable('Chromatic Occurence', this.occurencesAnyOctave, false);
        html += this.makeTable('Midi Note Analysis', this.noteOccurences, true);

                

        return html;
    }
}

class NoteData {
    constructor() {
        this.lastOn = 0;
        this.pitch = 0;
        this.velocity = 0;
        this.duration = 0;
        this.totalDuration = 0;
        this.totalVelocity = 0;
        this.occurence = 0;
    }

    avgVelocity() {
        if (this.occurence == 0) return 0; 
        return this.totalVelocity / this.occurence;
    }

    avgDuration() {
        if (this.occurence == 0) return 0; 
        return this.totalDuration / this.occurence;
    }

    // adds data from a note on or off event
    addData(noteEvent) {
        // deconstruct and rename param2
        let { 
            param1: pitch,
            param2: velocity,
            number, 
            elapsedTime
        } = noteEvent;
        
        // we need to handle the case when a note off is actually a note on with velocity 0 (in MIDI Format 1)
        
        if (number == 9 && velocity == 0 ) number = 8;

        switch (number) {
            // note off
            case 8:
                this.velocity = 0;
                let duration = elapsedTime - this.lastOn;
                this.duration = duration;
                this.totalDuration += duration;  
                break;
                
                // note on
                case 9:
                    this.occurence++;
                    this.totalVelocity += velocity;
                    this.pitch = pitch;
                    this.velocity = velocity;
                    this.duration = 0;
                    this.lastOn = elapsedTime;
                    break;
        }
    }
}

//create and export the singleton
module.exports = MidiFileAnalyzer;