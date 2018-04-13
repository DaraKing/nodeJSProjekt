var app = require('http').createServer();
    io = require('socket.io')(app),
    MongoClient = require('mongodb').MongoClient,
    url = "mongodb://localhost:27017/multiplayerQuiz",
    roomId = 1,
    questions = [],
    rooms = [],
    onlineUsers = [];
const NUMBER_PLAYERS_IN_ROOM = 2;
app.listen(8011);

function checkIfExists(roomName){
    for(var key in rooms) {
        if(rooms[key].name === roomName){
            return true;
        }
    }
    return false;
};

/*
    I use function below to insert questions and answers to database
 */

var insertAnswers = function () {
    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db("QuizAnswers");
        data = [
            {
                question: 'In 2011, which country hosted a Formula 1 race for the first time?',
                answers1: 'Singapore',
                answers2: 'India',
                answers3: 'Great Britain',
                answers4: 'Spain',
                correctAnswer : 'India'
            },
            {
                question: 'Which sport does Constantino Rocca play?',
                answers1: 'Golf',
                answers2: 'Football',
                answers3: 'Snooker',
                answers4: 'Futsal',
                correctAnswer : 'Golf'
            },
            {
                question: 'In needlework, what does UFO refer to?',
                answers1: 'An unfinished object',
                answers2: 'Unidentified flying object',
                answers3: 'Unfolded orientation',
                answers4: 'Undefined Following Orientation',
                correctAnswer : 'An unfinished object'
            },
            {
                question: 'When was William Shakespeare born?',
                answers1: '23rd April 1564',
                answers2: '14th October 1493',
                answers3: '2nd May 1567',
                answers4: '30th January 1563',
                correctAnswer : '23rd April 1564'
            }
        ];
        dbo.collection("QuizAnswers").insertMany(data, function(err, res) {
            if (err) throw err;
            console.log('Inserted');
            db.close();
        });
    });
};

io.on('connection', function (socket) {
    
    var listAllAnswers = function () {
        MongoClient.connect(url, function(err, db) {
            if (err) throw err;
            var dbo = db.db("QuizAnswers");
            dbo.collection("QuizAnswers").find({}).toArray(function(err, result) {
                if (err) throw err;
                questions = result;
                db.close();
            });
        });
    };

    listAllAnswers();

    var insertInDB = function (data, dbName) {
        MongoClient.connect(url, function(err, db) {
            if (err) throw err;
            var dbo = db.db(dbName);
            dbo.collection(dbName).insertOne(data, function(err, res) {
                if (err) throw err;
                db.close();
            });
        });
    };

    var checkWinner = function (player1, player2) {
        var usersRoom = (player1.roomName).toString();

        if((player1.userAnswer === player1.correctAnswer) && (player2.userAnswer === player2.correctAnswer)){
            console.log("Draw");
            io.in(usersRoom).emit('userResult', "Draw");
        }

        if((player1.userAnswer === player1.correctAnswer) && (player2.userAnswer != player2.correctAnswer)){
            var message = "Winer is "+player1.username;
            console.log(message);
            io.in(usersRoom).emit('userResult', message);
        }

        if((player1.userAnswer != player1.correctAnswer) && (player2.userAnswer === player2.correctAnswer)){
            var message = "Winer is "+player2.username;
            console.log(message);
            io.in(usersRoom).emit('userResult', message);
        }

        if((player1.userAnswer != player1.correctAnswer) && (player2.userAnswer != player2.correctAnswer)){
            console.log("Draw noone give me a correct answer");
            io.in(usersRoom).emit('userResult', "Draw noone give me a correct answer");
        }
    };

    var checkUserAnswers = function (userRoomName) {
        MongoClient.connect(url, function (err,db) {
            if(err) throw err;
            var dbo = db.db("userAnswers");
            dbo.collection("userAnswers").find({roomName: userRoomName}).sort({_id:-1}).toArray(function (err, result) {
                if (err) throw err;
                console.log(result);
                if(result[0].question === result[1].question){
                    checkWinner(result[0], result[1]);
                }
            });
        });
    };

    var checkWaitingRoom = function () {
        var room = io.sockets.adapter.rooms['waiting-room'];
        if(room.length == NUMBER_PLAYERS_IN_ROOM) {
            var room = 'room'+roomId;
            io.in('waiting-room').emit('create', room );
            roomId++;
        }
    };

    var checkOnlinePlayers = function (user) {
        var status = true;
        onlineUsers.forEach(function (value) {
            if(value === user) {
                status = false;
            }
        });

        return status;
    };

    socket.emit('welcome', "Welcome user! Please login.");

    socket.on('login', function (data){
        if (checkOnlinePlayers(data)) {
            onlineUsers.push(data);
            var userObj = {username: data};
            insertInDB(userObj,"users");
            socket.username = data;
            socket.join('waiting-room');
            checkWaitingRoom();
        } else {
            socket.emit('usernameError', "User is already in waiting room");
        }

    });

    socket.on('join', function (data) {
        socket.leave('waiting-room');
        socket.join(data);
        if(!checkIfExists(data)) {
            var questionLength = questions.length;
            var randomNum = Math.floor(Math.random()*questionLength);
            var newRoom = {name: data, randNum: randomNum};
            rooms.push(newRoom);
        }

        for(var i in rooms){
            var randNum = rooms[i].randNum;
            var question = questions[randNum];
            var room = rooms[i].name;
            io.in(room).emit('getQuestion', question);
        }
    });

    socket.on('sendAnswer', function (data) {
        var roomsFnc = Object.keys(socket.rooms).filter(function(item) {
            return item !== socket.id;
        });
        userRoomName = roomsFnc.toString();
        data.username = socket.username;
        data.roomName = userRoomName;
        console.log(data);
        insertInDB(data, 'userAnswers');
        checkUserAnswers(userRoomName);
    });

    socket.on('disconnect', function() {
        console.log('Got disconnect!');

        var i = onlineUsers.indexOf(socket.username);
        onlineUsers.splice(i, 1);
    });
});