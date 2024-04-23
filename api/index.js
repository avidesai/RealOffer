var Express = require("express");
var Mongoclient = require("mongodb").MongoClient;
var cors = require("cors");
const multer = require("multer");

var app = Express();
app.use(cors());

var password = encodeURIComponent("/Donutopolis1/");
var CONNECTION_STRING = "mongodb+srv://realofferadmin:" + password + "@cluster0.fphr5am.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
var DATABASE_NAME = "RealOffer";
var database;

app.listen(5038, () => {
    Mongoclient.connect(CONNECTION_STRING, (error, client) => {
        database = client.db(DATABASE_NAME);
        console.log("Connected to database");
    });
});

app.get('/api/RealOffer/GetNotes', (request, response) => {
    database.collection("RealOfferUsers").find({}).toArray((error, result) => {
        response.send(result);
    })
})  