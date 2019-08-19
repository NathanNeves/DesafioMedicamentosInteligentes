const serverless = require('serverless-http');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const Router = require('./Routes/Rotas');
const app = express();
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true, strict: false }));
app.use(cors());
app.use(Router);


module.exports.handler = serverless(app);

