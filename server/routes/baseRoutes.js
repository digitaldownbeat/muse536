const express = require('express');
const router = express.Router();
const { analyzeRandomFile, analyzeFile } = require('../mods/WebServices');

router.get('/', analyzeFile);
router.get('/random', analyzeRandomFile);

module.exports = router;