const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');

const config = require('./config');
const admin = require('firebase-admin');
const serviceAccount = require("./key/key.json");

function init(){
    app.use(bodyParser());
    app.use(cors());
    app.use(require('./middleware/log'));
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://routino-app.firebaseio.com"
    });
    // Assign routers zone
    app.use("/v1/users",require('./routers/v1/users'));
    app.use("/v1/tasks",require('./routers/v1/task'));
    // End of routers zone

    app.listen(8080,"127.0.0.1",()=>{
        console.log("Server is running");
    });
}

init();



