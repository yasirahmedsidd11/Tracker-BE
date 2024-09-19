const createError = require("http-errors")
const User = require("../Models/User.model")
const { authSchema } = require("../helpers/validation_schema")
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../helpers/jwt_helper")
const client = require("../helpers/init_redis")



module.exports = {
    register: async (req, res, next) => {
        try {
            // Validate input data
            const { email, password, userType } = await authSchema.validateAsync(req.body);

            // Check if the user already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                throw createError.Conflict(`User with email ${email} already registered`);
            }

            // Create and save the new user
            const newUser = new User({ email, password, userType });
            const savedUser = await newUser.save();

            // Generate tokens
            const accessToken = await signAccessToken(savedUser.id, { email: savedUser?.email, userType: savedUser?.userType });
            const refreshToken = await signRefreshToken(savedUser.id);

            // Set refresh token in HTTP-only cookie
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
                sameSite: 'Strict',
                maxAge: 1 * 24 * 60 * 60 * 1000 // 1 day
            });

            // Send access token to the client
            res.status(201).json({ accessToken });

            // const result = await authSchema.validateAsync(req.body)

            // const doesExists = await User.findOne({ email: result.email })
            // if (doesExists) throw createError.Conflict(`${result.email} is already been registered`)

            // const user = new User(result)
            // const savedUser = await user.save()
            // const accessToken = await signAccessToken(savedUser.id)
            // const refreshToken = await signRefreshToken(savedUser.id)
            // res.send({ accessToken, refreshToken })

        } catch (error) {
            if (error.isJoi) error.status = 422
            next(error)
        }
    },
    login: async (req, res, next) => {
        try {
            const result = await authSchema.validateAsync(req.body);

            const user = await User.findOne({ email: result.email });
            if (!user) throw createError.NotFound("User not registered");

            const isMatched = await user.isValidPassword(result.password);
            if (!isMatched) throw createError.Unauthorized("Username or Password not valid");

            // Generate tokens
            const accessToken = await signAccessToken(user.id, { email: user?.email, userType: user?.userType });
            const refreshToken = await signRefreshToken(user.id);

            // Set refresh token in an HTTP-only cookie
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Set to true in production
                sameSite: 'Strict',
                maxAge: 1 * 24 * 60 * 60 * 1000 // 1 day
            });

            // Send access token to the client
            res.json({ accessToken, twoFactorRequired: true });


        } catch (error) {
            if (error.isJoi) return next(createError.BadRequest("Invalid Username or Password"))
            next(error)
        }
    },
    refreshToken: async (req, res, next) => {
        try {
            // Extract refresh token from cookies
            const { refreshToken } = req.cookies;
            if (!refreshToken) throw createError.BadRequest("No refresh token provided");

            // Verify the refresh token and extract user ID
            const userId = await verifyRefreshToken(refreshToken);

            // Get user based on this id
            const user = await User.findById(userId); // Assuming you are using a User model
            if (!user) throw createError.NotFound("User not found");

            // Generate new access and refresh tokens
            const accessToken = await signAccessToken(userId, { email: user?.email, userType: user?.userType });
            const newRefreshToken = await signRefreshToken(userId);

            // Set new refresh token in HTTP-only cookie
            res.cookie('refreshToken', newRefreshToken, {
                httpOnly: !true,
                secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
                sameSite: 'Strict',
                maxAge: 1 * 24 * 60 * 60 * 1000 // 1 day
            });

            // Send new access token to the client
            res.json({ accessToken, twoFactorRequired: true });


        } catch (error) {
            next(error)
        }
    },
    logout: async (req, res, next) => {
        try {

            // Extract refresh token from cookies
            const { refreshToken } = req.cookies;

            if (!refreshToken) {
                throw createError.BadRequest();
            }

            // Verify the refresh token and get the user ID
            const userId = await verifyRefreshToken(refreshToken);
            // console.log(userId);

            // Delete the refresh token from Redis
            client.DEL(userId)
                .then(() => {
                    res.clearCookie('refreshToken', {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
                        sameSite: 'Strict'
                    });
                    res.sendStatus(204);
                })
                .catch((err) => {
                    console.error("Redis Error:", err.message);
                    return next(createError.InternalServerError());
                })
        } catch (error) {
            next(error)
        }
    }
}