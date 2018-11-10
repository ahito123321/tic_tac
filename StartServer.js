const app = require("./app");
const database = require("./database");


database().then(info => {
    console.log(`Connected to ${info.host}:${info.port}/${info.name}`);
    app.listen(80, () => {
        console.log("Server is working....");
    })
}).catch(() => {
    console.error("Unable to connect to database");
    process.exit(1);
})

