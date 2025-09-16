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
router.post('/invite/:event_id', verifyToken, EventController.sendInvites.bind(EventController));
router.get('/event/:event_id', verifyToken, EventController.getAllEventById.bind(EventController));
router.post('/security', verifyToken, EventController.registerSecurity.bind(EventController));
router.post('/security/login', CardifyController.loginSecurity.bind(CardifyController));
router.post('/scan', verifyToken, EventController.scan.bind(EventController));
router.post('/logout', verifyToken, CardifyController.logout.bind(CardifyController));
router.post(
    '/:event_id/guests/upload',
    upload.single('file'), // field name in your <input type="file" name="file" />
    verifyToken, EventController.uploadGuestsFromExcel.bind(EventController)
);

router.get('/home', verifyToken, (req, res) => {
    const email = req.session.email;
    const role = req.session.role;
    return res.render('index', { email, role });
});
router.get('/security', verifyToken, (req, res) => {
    const email = req.session.email;
    const role = req.session.role;
    return res.render('security', { email, role });
});
router.get('/scan', verifyToken, (req, res) => {
    const email = req.session.email;
    const role = req.session.role;
    return res.render('security2', { email, role });
});

router.get('/events', verifyToken, EventController.getAllEvents.bind(EventController));

router.delete('/event/:id', verifyToken, EventController.deleteEvent.bind(EventController));

router.get('/guests/:event_id', verifyToken, EventController.getAllGuestsByEventId.bind(EventController));

router.get('/create', verifyToken, (req, res) => {
    const formData = req.session.initialInfo || {};
    const guests = req.session.guests || {};
    const email = req.session.email;
    const role = req.session.role;
    return res.render('create', { formData, guests, email, role })
});
router.post('/request', verifyToken, (req, res) => {

    req.session.initialInfo = req.body;
    res.send('success');
});
module.exports = router;