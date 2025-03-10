# MUS-E 536: Autonomous Music Systems Class Projects
## Author: John Best

## Project 1:
Implements a midi file reader and analyzer in node.js to determine a strong key signature candidate.
The max patch uses the data from the javascript analysis to train three Markov chains for pitch, velocity and duration. 
After the models are built, a piece can be generated using a predetermined formal structure but with generated midi events from the Markov chains.

There is also a web server implemented at localhost:8080 that allows you to view the midi file analysis in a browser.


