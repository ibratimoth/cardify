const ResponseHandler = require('../utils/ResponseHandler');
const axios = require('axios');
const logger = require('../logger');
const config = require('../config');
const fs = require('fs');
const FormData = require('form-data');

class EventController {
    constructor() {
        this.responseHandler = new ResponseHandler();
        this.apiBaseUrl = config.apiBaseUrl;
        this.endpoints = {
            login: '/auth/login',
            register: '/auth/register',
            security: '/security/register',
            create: '/create',
            events: '/events/user/all ',
            getAll: '/content',
            messages: '/messages',
            guest: 'events/event_id/guests',
            event: '/events'
        }
    }

    // Helper Methods
    getAuthHeaders(token) {
        return {
            Authorization: `Bearer ${token}`
        };
    }

    async makeApiRequest(method, endpoint, token, data = null) {
        const config = {
            method,
            url: `${this.apiBaseUrl}${endpoint}`,
            headers: this.getAuthHeaders(token)
        };
        logger.info(`url: ${JSON.stringify(config.url)}`);
        logger.info(`Payload: ${JSON.stringify(data)}`);
        if (data) {
            config.data = data;
        }

        try {
            const response = await axios(config);
            return this.validateApiResponse(response);
        } catch (error) {
            throw this.handleApiError(error);
        }
    }

    validateApiResponse(response) {
        if (response.data || response.data.success) {
            console.log('statusCode:', response.data.statusCode)
            return response.data;
        }
        throw {
            status: response.status || 500,
            message: response.data?.message || 'API request failed'
        };
    }

    handleApiError(error) {
        if (axios.isAxiosError(error)) {
            if (error.response) {
                console.log(error.response)
                return {
                    status: error.response.status,
                    message: error.response.data?.message || 'API request failed'
                };
            }
            return {
                status: 500,
                message: `API request failed: ${error.message}`
            };
        }
        return {
            status: 500,
            message: 'An unexpected error occurred'
        };
    }

    async register(req, res) {
        try {
            const { firstname, lastname, phone, email, password } = req.body;

            if (!firstname || !lastname || !phone || !email || !password) {
                return this.responseHandler.sendResponse(
                    res,
                    400,
                    false,
                    'All fields are required'
                );
            }

            const data = {
                first_name: firstname,
                last_name: lastname,
                phone,
                email,
                password // In real apps, hash this!
            };
            //users.push(newUser);
            const result = await this.makeApiRequest(
                'post',
                this.endpoints.register,
                data
            );

            logger.info(`User registered: ${JSON.stringify(result)}`);

            return this.responseHandler.sendResponse(
                res,
                201,
                true,
                'User registered successfully.',
                result
            );
        } catch (error) {
            logger.error('Register error:', error);
            return this.responseHandler.sendResponse(
                res,
                error.status || 500,
                false,
                error.message || 'Internal server error'
            );
        }
    }

    async login(req, res) {
        try {
            const { phone, password } = req.body;

            if (!phone || !password) {
                return this.responseHandler.sendResponse(
                    res,
                    400,
                    false,
                    'phone and password are required'
                );
            }


            const data = {
                phone,
                password // In real apps, hash this!
            };
            //users.push(newUser);
            const result = await this.makeApiRequest(
                'post',
                this.endpoints.login,
                data
            );

            logger.info(`User registered: ${JSON.stringify(result)}`);
            req.session.firstname = result.data.first_name
            req.session.email = result.data.email
            req.session.userId = result.data.id
            req.session.role = result.data.role
            const isProduction = process.env.NODE_ENV === 'production';

            res.cookie('accessToken', result.token, {
                httpOnly: true,
                secure: isProduction,
                sameSite: 'strict',
                maxAge: 15 * 60 * 1000,
            });

            return this.responseHandler.sendResponse(
                res,
                201,
                true,
                'User registered successfully.',
                result
            );
        } catch (error) {
            logger.error('Login error:', error);
            return this.responseHandler.sendResponse(
                res,
                error.status || 500,
                false,
                error.message || 'Internal server error'
            );
        }
    }

    // Main Controller Methods
    async getAllEvents(req, res) {
        try {
            const email = req.session.email;
            const role = req.session.role;

            const result = await this.makeApiRequest(
                'get',
                this.endpoints.events,
                req.cookies.accessToken
            );

            logger.info(`Content fetched: \n${JSON.stringify(result, null, 2)}`);

            return res.render('events', { email, role, events: result.data || [] });

        } catch (error) {
            logger.error('Error retrieving terms:', error);
            if (error === 'Invalid or expired token') {
                return res.redirect('/')
            }
            return this.responseHandler.sendResponse(
                res,
                error.status,
                false,
                error.message
            );
        }
    }

    async getAllEventById(req, res) {
        try {
            const email = req.session.email;
            const role = req.session.role;
            const { event_id } = req.params;

            if (!event_id) {
                return this.responseHandler.sendResponse(
                    res,
                    400,
                    false,
                    'Event ID is required.'
                );
            }

            logger.info(`Sending Invitation: ${event_id}`);

            const result = await this.makeApiRequest(
                'get',
                `/events/${event_id}`,
                req.cookies.accessToken,
            );

            logger.info(`Content fetched: \n${JSON.stringify(result, null, 2)}`);

            return res.render('view', { email, role, event: result.data || {} });

        } catch (error) {
            logger.error('Error retrieving terms:', error);
            if (error === 'Invalid or expired token') {
                return res.redirect('/')
            }
            return this.responseHandler.sendResponse(
                res,
                error.status,
                false,
                error.message
            );
        }
    }

    async createEvents(req, res) {
        try {
            const { event_name, description, location, event_date, start_time, end_time } = req.body;

            if (!event_name || !description || !location || !event_date || !start_time || !end_time) {
                return this.responseHandler.sendResponse(
                    res,
                    400,
                    false,
                    'All fields are required'
                );
            }

            const data = {
                event_name,
                description,
                location,
                event_date,
                start_time,
                end_time
            }

            logger.info(`Request body: ${JSON.stringify(data)}`);

            const result = await this.makeApiRequest(
                'post',
                this.endpoints.event,
                req.cookies.accessToken,
                data
            );

            logger.info(`created event: \n${JSON.stringify(result, null, 2)}`);

            return this.responseHandler.sendResponse(
                res,
                200,
                true,
                'first stage sent successfully.',
                result.data
            );
        } catch (error) {
            logger.error('Error during event creation:', error);
            return this.responseHandler.sendResponse(
                res,
                error.status,
                false,
                error.message
            );
        }

    }

    async addGuestsManually(req, res) {
        try {
            const { event_id } = req.params;
            const { guests } = req.body;

            if (!event_id || !guests || !Array.isArray(guests) || guests.length === 0) {
                return this.responseHandler.sendResponse(
                    res,
                    400,
                    false,
                    'Event ID and guests array are required.'
                );
            }

            logger.info(`Adding manual guests for event: ${event_id}`);
            logger.info(`Guests: ${JSON.stringify(guests)}`);

            const result = await this.makeApiRequest(
                'post',
                `/events/${event_id}/guests`,
                req.cookies.accessToken,
                guests
            );

            logger.info(`Manual guest addition result:\n${JSON.stringify(result, null, 2)}`);
            req.session.guests = result.data;
            return this.responseHandler.sendResponse(
                res,
                200,
                true,
                'Guests added successfully.',
                result.data
            );
        } catch (error) {
            logger.error('Error during manual guest addition:', error);
            return this.responseHandler.sendResponse(
                res,
                error.status || 500,
                false,
                error.message || 'Failed to add guests.'
            );
        }
    }

    async sendInvites(req, res) {
        try {
            const { event_id } = req.params;

            if (!event_id) {
                return this.responseHandler.sendResponse(
                    res,
                    400,
                    false,
                    'Event ID is required.'
                );
            }

            logger.info(`Sending Invitation: ${event_id}`);

            const result = await this.makeApiRequest(
                'post',
                `/events/${event_id}/send-invites`,
                req.cookies.accessToken,
            );

            logger.info(`Sending Invitation:\n${JSON.stringify(result, null, 2)}`);
            req.session.guests = null;
            return this.responseHandler.sendResponse(
                res,
                200,
                true,
                'Inviations sent successfully.',
                result
            );
        } catch (error) {
            logger.error('Error during sending invitations:', error);
            return this.responseHandler.sendResponse(
                res,
                error.status || 500,
                false,
                error.message || 'Failed to send invitations.'
            );
        }
    }

    async scan(req, res) {
        try {
            const { qr } = req.body;

            if (!qr) {
                return this.responseHandler.sendResponse(
                    res,
                    400,
                    false,
                    'qr code is required.'
                );
            }

            logger.info(`verify card: ${qr}`);

            const data = {
                qr
            }
            const result = await this.makeApiRequest(
                'post',
                `/events/scan`,
                req.cookies.accessToken,
                data
            );

            logger.info(`verifying card:\n${JSON.stringify(result, null, 2)}`);

            return this.responseHandler.sendResponse(
                res,
                200,
                true,
                'Card is valid and verified.',
                result
            );
        } catch (error) {
            logger.error('Error during verifyng card:', error);
            return this.responseHandler.sendResponse(
                res,
                error.status || 500,
                false,
                error.message || 'Failed to verify card.'
            );
        }
    }

    async uploadGuestsFromExcel(req, res) {
        try {
            const { event_id } = req.params;
            const file = req.file;

            if (!event_id || !file) {
                return this.responseHandler.sendResponse(
                    res,
                    400,
                    false,
                    'Event ID and Excel file are required.'
                );
            }

            logger.info(`Uploading Excel guests for event: ${event_id}`);
            logger.info(`File received: ${file.originalname}`);

            // Create FormData and attach file
            const formData = new FormData();
            formData.append('file', fs.createReadStream(file.path), file.originalname);

            const result = await this.makeApiRequest(
                'post',
                `/events/${event_id}/guests/upload`,
                req.cookies.accessToken,
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                    },
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                }
            );

            logger.info(`Excel guest upload result:\n${JSON.stringify(result.data, null, 2)}`);
            req.session.guest = result.data[0].guest;
            return this.responseHandler.sendResponse(
                res,
                200,
                true,
                'Excel uploaded and guests added successfully.',
                result.data
            );
        } catch (error) {
            logger.error('Error during Excel guest upload:', error);
            return this.responseHandler.sendResponse(
                res,
                error.status || 500,
                false,
                error.message || 'Failed to upload guests.'
            );
        }
    }

    async registerSecurity(req, res) {
        try {
            const { firstname, lastname, phone, email, password, event_id } = req.body;

            if (!firstname || !lastname || !phone || !email || !password || !event_id) {
                return this.responseHandler.sendResponse(
                    res,
                    400,
                    false,
                    'All fields are required'
                );
            }

            const data = {
                first_name: firstname,
                last_name: lastname,
                phone,
                email,
                password, // In real apps, hash this!
                event_id
            };
            //users.push(newUser);
            const result = await this.makeApiRequest(
                'post',
                this.endpoints.security,
                req.cookies.accessToken,
                data
            );

            logger.info(`Security registered: ${JSON.stringify(result)}`);

            return this.responseHandler.sendResponse(
                res,
                201,
                true,
                'User registered successfully.',
                result
            );
        } catch (error) {
            logger.error('Register error:', error);
            return this.responseHandler.sendResponse(
                res,
                error.status || 500,
                false,
                error.message || 'Internal server error'
            );
        }
    }


}

module.exports = EventController;