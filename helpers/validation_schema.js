const Joi = require("@hapi/joi")

const authSchema = Joi.object({
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().min(6).max(32).required(),
    userType: Joi.string().valid('admin', 'company')
})

module.exports = { authSchema }