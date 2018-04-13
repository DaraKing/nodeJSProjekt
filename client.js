var socket = io('http://localhost:8011');

window.onload = function (ev) {
    //nothing
};

socket.on('welcome', function (data) {
    console.log(data);
});

/*
        GET A USERNAME AND SEND IT TO SERVER
 */
$('#userSubmit').on('click',function () {
    var user = $('#username').val();

    socket.emit('login', user);
});

/*
        GET RESPONSE IF USERNAME ALREADY EXISTS IN DATABASE
 */

socket.on('usernameError', function (data) {
    alert(data);
});

/*
        IF WAITING ROOM IS 2 SEND ME MESSAGE WHERE TO GO
 */

socket.on('create', function (data) {
    socket.emit('join', data);
    console.log("You'l be joined in another room!");
    $('#loginForm').css("display", "none");
    $('.answerContent').css("display","block");
});

/*
        GET QUESTION
 */

socket.on('getQuestion', function (data) {
    socket.removeListener('getQuestion');
    $('.question').html(data["question"]);
    for(var i=1; i<5; i++){
        $('#answers'+i).html(data["answers"+i]);
    }

    $('.answer').on('click', function (e) {
        console.log($(e.target).text());
        var userAnswer = $(e.target).text();
        $('.answer').off('click');
        var question = data.question;
        var correctAnswer = data.correctAnswer;
        var answerData = {question: question, userAnswer: userAnswer, correctAnswer: correctAnswer};
        socket.emit('sendAnswer', answerData);
    });
});

/*
        SEND RESULTS!
 */

socket.on('userResult', function (data) {
    alert(data);
});