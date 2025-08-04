const ResponseHandler = require('../utils/ResponseHandler');
const axios = require('axios');
const logger = require('../logger');
const config = require('../config');

class CardifyController {
    constructor() {
        this.responseHandler = new ResponseHandler();
        this.apiBaseUrl = config.apiBaseUrl;
        this.endpoints = {
            login: '/auth/login',
            register: '/auth/register',
            create: '/create',
            event: '/events ',
            getAll: '/content',
            messages: '/messages',
        }
    }

    async makeApiRequest(method, endpoint, data = null) {
        const config = {
            method,
            url: `${this.apiBaseUrl}${endpoint}`,
        };
        logger.info(`url: ${JSON.stringify(config.url)}`);
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

}

module.exports = CardifyController;