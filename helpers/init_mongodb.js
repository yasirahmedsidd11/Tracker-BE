const mongoose = require("mongoose")

mongoose.connect(`mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOSTNAME}/`, {
    dbName: process.env.MONGO_DB_NAME,

}).then(() => {
    console.log("mongodb connected");
}).catch(err => {
    console.error(err.message)
})

mongoose.connection.on("connected", () => {
    console.log("mongodb connected to db");
})
mongoose.connection.on("error", (err) => {
    console.log(err.message);
})
mongoose.connection.on("disconnected", () => {
    console.log("mongodb connected is disconnected");
})
process.on("SIGINT", async () => {
    await mongoose.connection.close()
    process.exit(0)
})