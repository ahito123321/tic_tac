const http = require('http'),
    fs = require('fs'),
    express = require('express'),
    brain = require('brain.js'),
    bodyParser = require("body-parser"),
    path = require("path"),
    app = express();

const urlencodedParser = bodyParser.urlencoded({extended: false});
const parserJSON = bodyParser.json();

const game = require("./model/game");
const net = new brain.NeuralNetwork();

let nowGameID;

let trainArr = [];

let trainInFile = [];
let trainInMLab;

fs.readdir(path.join(__dirname, "TRAIN_PROGRAM"), { encoding: "UTF-8" } , (err, files) => {
    if (err) console.log(err);
    console.log("*Считывание файлов JSON!");
    files.forEach((file) => {
        if (String(file).match("^([A-Za-z0-9]+).json$")) {
            let data = fs.readFileSync(path.join(__dirname, "TRAIN_PROGRAM", file))
            trainInFile.push(...(JSON.parse(data)));
        }
    });
});

/*
    0   -  ""    -  0
    0.5 -  "0"   -  0.5
    1   -  "X"   -  1
*/
app.get("/", (req, res) => {
    trainInMLab = [];

    game.find({}).exec((err, docs) => {
        if (err) console.log(err);

        console.log("*Считывание предыдущих игр из mLab!");

        docs.forEach((value, index) => {
            if (value.Train != []) {
                trainInMLab.push(...value.Train);
            }
        });

        console.log("*Ожидание USER_NAME и IS_X!"); 
        fs.readFile(__dirname + "/dist/index.html", (err, data) => {
            res.writeHead(200, {"Content-type": "text/html; charset=utf-8"})
            res.end(data);
        });
    });
});

app.post("/ticitac", parserJSON, (req, res) => {
    let AllGames;
    let BotWins;

    if (!req.body) return response.sendStatus(400);
    if (typeof(req.body.UserName) != "undefined" && typeof(req.body.Side) != "undefined"){
        console.log("***Получение информации о количество игр!");
        game.find({}, (err, docs) => {
            if (err) console.log(err);
            AllGames = docs.length;
            console.log("***Получение информации о количестве игр выигравших ботом!");
            game.find({ Result: 1 }).exec((err, docs)  => {
                
                if (err) console.log(err);
                BotWins = docs.length;
                console.log("***Получение информации о количестве тренеруемых данных!");

                res.json({
                    UserName: req.body.UserName,
                    AllGames: AllGames,
                    BotWins: BotWins,
                    TrainData: (trainInFile.length + trainInMLab.length),
                    FirstStep: Math.round(Math.random())
                });
                game.create({
                    UserName: req.body.UserName,
                    Result: "-1",
                    Train: []
                }).then((game) => {
                    nowGameID = game._id;
                    console.log(`Document ${game._id} created`);
                });
            });
        });
    }
    else {
        console.log("FATAL ERROR!");
        res.sendStatus(400);
    }
});

app.get("/tictac/train", (req, res) => {
    console.log("**Начало обучения!");
    console.log("Количество тренеруемых данных: " + (trainInFile.length + trainInMLab.length));

    net.train(new Array(...trainInFile, ...trainInMLab), {
        log: true
    });

    console.log("**Конец обучения!");
    res.sendStatus(200);
});

app.post("/tictac/step", parserJSON, (req, res) => {
    console.log("*Начало хода!");
    if (req.body.Train.output != undefined) {
        game.updateOne({ _id: nowGameID }, { $push: { Train: req.body.Train } })
            .then(() => {
                console.log("*Произошла запись обучащей информации!");
            });
    }
    let result = net.run(req.body.TableForStep);
    res.json({
        res: result
    });
    console.log(result);
    console.log("*Конец хода!");
});

app.post("/tictac/end", parserJSON, (req, res) => {
    console.log("*Конец игры!");
    game.updateOne({ _id: nowGameID }, { Result: req.body.Result })
        .then(() => {
            console.log("*Произошла запись об окончании игры!");
        });
    
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