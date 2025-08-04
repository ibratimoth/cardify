const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const verifyToken = require('../middleware/verifyToken');
const cardifyController = require('../controller/cardifyController');
const eventController = require('../controller/enventsController');
const CardifyController = new cardifyController();
const EventController = new eventController();

const upload = multer({
    dest: 'uploads/', // folder to store temporary uploads
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const filetypes = /xlsx|xls/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (extname) {
            return cb(null, true);
        }
        cb(new Error('Only Excel files (.xlsx or .xls) are allowed.'));
    }
});

router.post('/register', CardifyController.register.bind(CardifyController));
router.post('/login', CardifyController.login.bind(CardifyController));
router.post('/event', verifyToken, EventController.createEvents.bind(EventController));
router.post('/:event_id/guests', verifyToken, EventController.addGuestsManually.bind(EventController));
router.post(
    '/:event_id/guests/upload',
    upload.single('file'), // field name in your <input type="file" name="file" />
    verifyToken, EventController.uploadGuestsFromExcel.bind(EventController)
);

router.get('/home', verifyToken, (req, res) => {
    return res.render('index')
});
router.get('/events', verifyToken, (req, res) => {
    return res.render('events')
});
router.get('/create', verifyToken, (req, res) => {
    const formData = req.session.initialInfo || {};
    const guests = req.session.guests || {};
    return res.render('create', { formData , guests})
});
router.post('/request', verifyToken, (req, res) => {

    req.session.initialInfo = req.body;
    res.send('success');
});
module.exports = router;