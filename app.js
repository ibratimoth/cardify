const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const path = require('path');
const cookieparser = require('cookie-parser');
const configureSession = require('./middleware/sessionMiddleware');
const logger = require('./logger');
const userRoutes = require('./routes/cardifyRoutes')
dotenv.config();

const app = express();

app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use(cookieparser());
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs');
configureSession(app);

app.get('/', (req, res) => {
    return res.render('login')
});
app.get('/home', (req, res) => {
    return res.render('index')
});
app.get('/register', (req, res) => {
    return res.render('register')
});
app.get('/events', (req, res) => {
    return res.render('events')
});
app.get('/create', (req, res) => {
    return res.render('create')
});
app.get('/session-data', (req, res) => {
    res.json(req.session);
});

app.get('/cookie-data', (req, res) => {
    res.json(req.cookies);
});

app.get('/security', (req, res) => {
    return res.render('securityLogin')
});

app.use('/user', userRoutes);
const PORT = process.env.PORT || 3003;

const server = app.listen(PORT, () => {
    logger.info(`Successfully connected to the server url http://localhost:${PORT}`);
});

module.exports = server;