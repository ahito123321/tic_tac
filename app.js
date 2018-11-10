const http = require('http'),
    fs = require('fs'),
    express = require('express'),
    brain = require('brain.js'),
    bodyParser = require("body-parser"),
    path = require("path");
    app = express();

const urlencodedParser = bodyParser.urlencoded({extended: false});
const parserJSON = bodyParser.json();

const game = require("./model/game");
const net = new brain.NeuralNetwork();

let trainArr = [];
let filesTrain;
/*
    0 0  -  ""  -  0
    0 1  -  1   -  1
    1 0  -  0   -  0.5
*/
app.get("/", (req, res) => {
    fs.readdir(path.join(__dirname, "TRAIN_PROGRAM"), { encoding: "UTF-8" } , (err, files) => {
        if (err) console.log(err);
        files.forEach((file) => {
            if (String(file).match("^([A-Za-z0-9]+).json$")) {
                let data = fs.readFileSync(path.join(__dirname, "TRAIN_PROGRAM", file))
                trainArr.push(...(JSON.parse(data)));
            }
        });
        filesTrain = trainArr.length;
        game.find({}, (err, docs) => {
            if (err) console.log(err);
            docs.forEach((value, index) => {
                trainArr.push(...value.Train);
            });
            fs.readFile(__dirname + "/dist/index.html", (err, data) => {
                res.writeHead(200, {"Content-type": "text/html; charset=utf-8"})
                res.end(data);
            });
        });
    }); 
});

app.post("/ticitac", parserJSON, (req, res) => {
    let AllGames;
    let BotWins;
    let TrainData = 0;

    if (!req.body) return response.sendStatus(400);
    if (typeof(req.body.UserName) != "undefined" && typeof(req.body.Side) != "undefined"){
        console.log("***Получение информации о количество игр!");
        game.find({}, (err, docs) => {
            if (err) console.log(err);
            AllGames = docs.length;
            console.log("***Получение информации о количестве игр выигравших ботом!");
            game.find({result: 0}, (err, docs)  => {
                if (err) console.log(err);
                BotWins = docs.length;
                console.log("***Получение информации о количестве тренеруемых данных!");
                game.find({}, (err, docs) => {
                    if (err) console.log(err);
                    docs.forEach((value, index) => {
                        TrainData += value.Train.length;
                    })
                    res.json({
                        UserName: req.body.UserName,
                        AllGames: AllGames,
                        BotWins: BotWins,
                        TrainData: TrainData + filesTrain,
                        FirstStep: Math.round(Math.random())
                    });
                    game.create({
                        UserName: req.body.UserName,
                        Result: "-1",
                        Train: []
                    }).then((game) => {
                        console.log(`Document ${game._id} created`);
                    });
                })
            })  
        });
    }
    else {
        console.log("FATAL ERROR!");
        res.sendStatus(400);
    }
});

app.get("/tictac/train", (req, res) => {
    console.log("**Начало обучения!");
    net.train(trainArr, {
        log: true
    });
    console.log("**Конец обучения!");
    res.sendStatus(200);
});

app.post("/tictac/step", parserJSON, (req, res) => {
    console.log("*Начало хода!");
    let result = net.run(req.body.TableForStep);
    res.json({
        res: result
    });
    console.log(result);
    console.log("*Конец хода!");
});

app.get("/css/style.css", (req, res) => {
    fs.readFile(__dirname + "/dist/css/style.css", (err, data) => {
        res.writeHead(200, {"Content-type": "text/css; charset=utf-8"})
        res.end(data);
    });
});
app.get("/js/scripts.js", (req, res) => {
    fs.readFile(__dirname + "/dist/js/scripts.js", (err, data) => {
        res.writeHead(200, {"Content-type": "text/javascript; charset=utf-8"})
        res.end(data);
    });
});

module.exports = app;