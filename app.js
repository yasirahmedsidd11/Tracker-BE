const express = require("express")
const morgan = require("morgan")
const cookieParser = require('cookie-parser');
const cors = require('cors')
const createError = require("http-errors")
const AuthRoute = require("./Routes/Auth.route")
const { verifyAccessToken } = require("./helpers/jwt_helper")
require("dotenv").config()
require("./helpers/init_mongodb")
require("./helpers/init_redis")

const app = express()

const allowedOrigins = ['http://localhost:3001', 'http://localhost:3000']; // Add all your allowed origins here

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true); // Origin is allowed
        } else {
            callback(new Error('Not allowed by CORS')); // Origin is not allowed
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true // Allow cookies to be sent
}));
app.use(morgan("dev"))
app.use(express.json())
app.use(cookieParser())
app.use(express.urlencoded({ extended: true }))

app.get("/", verifyAccessToken, async (req, res, next) => {
    res.json({ hello: "world" })
})

app.use('/auth', AuthRoute)

app.use(async (req, res, next) => {
    next(createError.NotFound())
})

app.use((err, req, res, next) => {
    res.status(err.status || 500)
    res.send({
        error: {
            status: err.status || 500,
            message: err.message
        }
    })
})
const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
    console.log(`Server running on PORT ${PORT}`);
})