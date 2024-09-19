const jwt = require("jsonwebtoken")
const createError = require("http-errors")
const client = require("./init_redis")
const permissions = require("./permissions")
console.log("🚀 ~ permissions :", permissions)
module.exports = {
    signAccessToken: (userId, user) => {
        return new Promise((resolve, reject) => {
            const payload = { permissions: [...permissions], user }
            const secret = process.env.ACCESS_TOKEN_SECRET
            const options = {
                expiresIn: "15m",
                issuer: "test.com",
                audience: userId
            }
            jwt.sign(payload, secret, options, ((err, token) => {
                if (err) {
                    console.log(err.message);
                    reject(createError.InternalServerError())
                    // return reject(err)
                }
                resolve(token)
            }))
        })
    },
    signRefreshToken: (userId, user) => {
        return new Promise((resolve, reject) => {
            const payload = { user }
            const secret = process.env.REFRESH_TOKEN_SECRET
            const options = {
                expiresIn: "1h",
                issuer: "test.com",
                audience: userId
            }
            jwt.sign(payload, secret, options, ((err, token) => {
                if (err) {
                    console.log(err.message);
                    reject(createError.InternalServerError())
                    // return reject(err)
                }

                client.SET(userId, token, { EX: 365 * 24 * 60 * 60 })
                    .then(reply => resolve(token))
                    .catch(err => {
                        console.error(err.message)
                        reject(createError.InternalServerError())
                    })



            }))
        })
    },
    verifyAccessToken: (req, res, next) => {
        if (!req.headers['authorization']) return next(createError.Unauthorized())
        const authHeader = req.headers['authorization']
        const bearerToken = authHeader.split(" ")[1]
        jwt.verify(bearerToken, process.env.ACCESS_TOKEN_SECRET, ((err, payload) => {
            if (err) {
                const message = err.name === "JsonWebTokenError" ? "Unauthorized" : err.message
                return next(createError.Unauthorized(message))

            }
            // console.log(payload, req.payload);
            req.payload = payload
            next()
        }))
    },
    verifyRefreshToken: (refreshToken) => {
        return new Promise((resolve, reject) => {
            jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, ((err, payload) => {
                if (err) { return reject(createError.Unauthorized()) }
                const userId = payload.aud
                client.GET(userId).then((result) => {
                    if (refreshToken === result) {
                        return resolve(userId)
                    } else {
                        return reject(createError.Unauthorized())
                    }
                }).catch((err) => {
                    console.error(err.message)
                    reject(createError.InternalServerError())
                })
                // resolve(userId)
            }))

        })

    }
}