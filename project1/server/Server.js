const express = require('express');

const baseRouter = require('./routes/baseRoutes'); 

// Setup Express server
const app = express();

// Serve MIDI data as an HTML page
//app.use(express.static('www'));
app.use('/styles', express.static(__dirname + '/www'));
app.use('/', baseRouter);

// Start the Express server
const PORT = 8080;
app.listen(PORT, () => {
    console.log(`MIDI parser running at http://localhost:${PORT}`);
});

module.exports = { app };