const redis = require("redis");

const client = redis.createClient();

client.connect()
    .then(() => {
        console.log("Client connected to Redis");

        client.set("test_key", "test_value")
            .then(reply => {
                console.log("Redis SET Reply:", reply); // Should print "OK"
            })
            .catch(err => {
                console.error("Redis Error:", err.message);
            });
    })
    .catch(err => {
        console.error(err.message);
    });

process.on("SIGINT", () => {
    client.quit();
});

module.exports = client;