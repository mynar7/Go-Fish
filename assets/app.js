// Initialize Firebase
var config = {
    apiKey: "AIzaSyBBflwDizYQNO2MpD9EpXzrgWUo1fmctCQ",
    authDomain: "go-fish-yourself.firebaseapp.com",
    databaseURL: "https://go-fish-yourself.firebaseio.com",
    projectId: "go-fish-yourself",
    storageBucket: "",
    messagingSenderId: "219349623457"
  };
firebase.initializeApp(config);
//make a database variable
let db = firebase.database();
//declare variables
let userName;
let oppName;
let userId;
let dataRef;
let userRef;
let opponentId;
let lobbyRef;
let winCount;
let lossCount;
let drawCount;
let myTurn = false;

let deckId;
let myHand;
let oppHand;
let deckEmpty;
let myPoints;
let oppPoints;

let nameColor = "yellow";
let chatTxtColor = "yellow";

//grab the firebase connections reference
let userCons = db.ref('.info/connected');
//make a reference for my lobbies folder on the database
let lobbies = db.ref('/lobbies');
userCons.on("value", function(userList){
    if(userList.val()) {
        //see how many lobbies there are or if there's any
        lobbies.once("value").then(function(lobbiesSnap){
            //if no lobbies, make the first lobby
            if(lobbiesSnap.numChildren() === 0) {
                makeLobby();
            } else {
                let lobbied = false;
                //if there's a lobby already with an empty slot, join it!
                lobbiesSnap.forEach(function(lobbyUsers){
                    if (lobbyUsers.numChildren() === 1) {
                        //add to here, then return true to break forEach
                        let con = lobbyUsers.ref.push(true);
                        lobbyRef = db.ref('/lobbies/' + con.path.n[1]);
                        //assign reference for this user's data
                        userRef = db.ref('/lobbies/' + con.path.n[1] + '/' + con.path.n[2]);
                        //assign a username based off key generated by firebase for userdata folder in lobby
                        userName = con.path.n[2].slice(14)
                        userId = userName;
                        //add default player name
                        changeName(userName);
                        assignNameListen();
                        //assign ref for data for this lobby
                        dataRef = db.ref('/lobbyData/dataFor' + con.path.n[1]);
                        let dataCon = dataRef.child('players').push(true);  
                        dataCon.onDisconnect().remove();
                        let playerData = dataRef.child('players').child(dataCon.path.n[3]);
                        playerData.update({
                            Id: userId,
                        });
                        //remove this user from lobby when disconnect
                        con.onDisconnect().remove();
                        //clear all lobby data when this user disconnects
                        dataRef.child('chat').onDisconnect().remove();
                        // dataRef.child('players/' + userName).onDisconnect().remove();                        
                        assignChat();
                        //initialScore();
                        //assignScore();
                        lobbied = true;
                        chatPrint(userName, "Joined Lobby");
                        //go fish stuff
                        assignDeckListen();
                        makeDeck();
                        assignHandListen();
                        assignPointListen();
                        assignGameOver();

                        changeTurn();
                        //grab opponent reference
                        dataRef.child('players').once("value", function(playerSnap){
                            playerSnap.forEach(function(refSnap){
                                opponentId = refSnap.val().Id;
                                return true;
                            });
                        });
                        assignTurn();
                        return true;
                    }
                });
                //create new lobby
                if(!lobbied) {
                    makeLobby();                             
                }//end if lobbied
            }//end else
        }); //end lobbies.once
    
    } //end if userList.val
}); //end userCons call

function makeLobby() {
    //make a lobby and push to it to create a user
    let con = db.ref('/lobbies/lobby' + Date.now()).push(true);
    //assign reference for this lobby
    lobbyRef = db.ref('/lobbies/' + con.path.n[1]);
    //assign reference for this user's data
    userRef = db.ref('/lobbies/' + con.path.n[1] + '/' + con.path.n[2]);
    //assign a username based off key generated by firebase for userdata folder in lobby
    userName = con.path.n[2].slice(14)
    userId = userName;
    //add default player name
    changeName(userName);
    assignNameListen();
    //assign ref for data for this lobby
    dataRef = db.ref('/lobbyData/dataFor' + con.path.n[1]);
    let dataCon = dataRef.child('players').push(true);  
    dataCon.onDisconnect().remove();
    let playerData = dataRef.child('players').child(dataCon.path.n[3]);
    playerData.update({
        Id: userId,
    });
    //remove this user from lobby when disconnect
    con.onDisconnect().remove();
    //clear all lobby data when this user disconnects
    dataRef.child('chat').onDisconnect().remove();
    //initialScore();
    //assignScore();
    assignChat();
    chatPrint(userName, "Started Lobby");
    assignTurn();
    //go fish fxs
    assignDeckListen();
    assignHandListen();
    assignPointListen();
    assignGameOver();
}

//name listener
function assignNameListen() {
    lobbyRef.on("value", function(snap){
        snap.forEach(function(snap2){
            if(snap2.val().name !== userName){
                oppName = snap2.val().name;
            }
        });
    });
}

//turn listener assignment
function assignTurn() {
    dataRef.child('data/turns/turn').on("value", function(snap){
        //when move made, take snap data to get turn data,
        //compare to this client's userRef
        let x = snap.val();
        if(x === userId) {
            //if this client's userId, set var myTurn true, else false
            myTurn = true;
            $('#status').empty();
            $('<li>').html("It's your turn.").appendTo("#status");
        } else {
            myTurn = false;
            opponentId = x;
        }
        //run function to enable/disable RPS buttons based on myTurn boolean
        toggleButtons(myTurn);
    });
    dataRef.child('data/turns').onDisconnect().remove();
}

//change turn fx
function changeTurn () {
    let x;
    if (opponentId) {
        x = opponentId;
    } else {
        x = userId;
    }
    dataRef.child('data/turns').update({
        turn: x,
    });
}


//this fx toggles the client's RPS buttons on/off
function toggleButtons(bool) {
    if(bool) {
        var x = document.getElementById("btnGrp").querySelectorAll('button');
        for (i = 0; i < x.length; i++) {
            x[i].removeAttribute("disabled");
        }
    } else {
        if(opponentId) {
            $('#status').empty();
            $('<li>').html("Waiting for Opponent.").appendTo("#status");                    
        }
        var x = document.getElementById("btnGrp").querySelectorAll('button');
        for (i = 0; i < x.length; i++) {
            x[i].setAttribute("disabled", "true");
        }
    }
}
//button listener
$('#btnGrp').on("click", 'button', function(){
    changeTurn();        
}); //end listener fx

/*
//initialize score
function initialScore() {
    winCount = 0;
    lossCount = 0;
    drawCount = 0;
    dataRef.child('data/scores/' + userId).update({
        wins: 0,
        losses: 0,
        draws: 0
    });
    dataRef.child('data/scores/' + userId).onDisconnect().remove();
}
*/

//chat submit button event listener function
$('#enter').on("click", function(event){
    event.preventDefault();
    let str = $('#textInput').val().trim();
    chatPrint(userName, str);
    $('#textInput').val("");
});

//fx to change username
function changeName(str) {
    userName = str;
    userRef.update({
        name: userName
    });
}

//clear chat fx
$('#clear').on("click", function(event){
    event.preventDefault();
    $('#chat').empty();
});
/*
//assign a listener to DB scores
function assignScore() {
    dataRef.child('data/scores').on("value", function(snap){
        $('#status').empty();
        snap.forEach(function(snapChild){
            if(snapChild.key == userId) {
                let wins = snapChild.val().wins;
                let losses = snapChild.val().losses;
                let draws = snapChild.val().draws;
                $('#wins').html("Wins: " + wins);
                $('#losses').html("Losses: " + losses);
                $('#draws').html("Draws: " + draws);
                if(winCount !== wins) {
                    $('<li>').html("You won!").appendTo("#status");
                    turnNotice();
                }
                if(lossCount !== losses) {
                    $('<li>').html("You lost!").appendTo("#status");
                    turnNotice();
                }
                if(drawCount !== draws) {
                    $('<li>').html("It was a draw!").appendTo("#status");
                    turnNotice();
                }
                winCount = wins;
                lossCount = losses;
                drawCount = draws;
            }
        });
    });
}
*/
function turnNotice() {
    if(myTurn) {
        $('<li>').html("It's your turn.").appendTo("#status");                    
    } else {
        $('<li>').html("Waiting for Opponent.").appendTo("#status");                    
    }
}

//assign a listener to DB chat message, then pass the most recent data to fx that prints to each user's window
function assignChat() {
    dataRef.child('chat').on("value", function(snap){
        //if statement removes opponent DC console error
        if(snap.val()) {
            chatUpdate(snap.val().msgBy, snap.val().lastMsg);
        } else {
            //use that null error to print a disconnect
            chatUpdate("System", "<span id='sysMsg'>player disconnected</span>");
        }
    });
}

//parse for commands, if not command, send to database to be read
function chatPrint(name, str) {
    str = parseInput(str);
    if(str !== false) {
        dataRef.child('chat').update({
            lastMsg: str,
            msgBy: name
        });
    }//end if
}

//take input and add it to the chat window
function chatUpdate(name, str) {
    let chatBox = $('#chat');
    // chatBox.append('<p>' + name + ': ' + str + '</p>');
    $('<li>').html('<span class="chatName" style="color:' + nameColor + ';">' + name + ': </span>' + '<span class="chatText" style="color:' + chatTxtColor + ';">' + str + '</span>').prependTo(chatBox);
}

//this fx returns a random number from 1 - sides, if no arg, sides = 20
function roll(num) {
    let sides = 20;
    if(arguments.length == 1) {
        sides = num;
    }
    return Math.floor(Math.random() * sides) + 1;
}

//this function handles user chat input by calling fx based on if the user entered a string that starts with /
function parseInput(str) {
    if(str.startsWith('/')) {
        let index = str.indexOf(" ");
        let command;
        if(index == -1) {
            command = str.slice(1);
        } else {
            command = str.slice(1, index)
        }
        command = command.trim().toLowerCase();
        let helpText = "<span id='sysMsg'><br>Commands:<br>/help : get list of commands<br>/name -new name- : change user name<br>/roll # : rolls a # sided die (if # omitted, # is 20)</span>";
        switch(command) {
            case "name":
                let newName = str.slice(index + 1);
                if(index == -1) {
                    chatUpdate("System", "<span id='sysMsg'>Usage: /name -new name- : change user name</span>");
                    return false;
                } else {
                    changeName(newName);
                    return "<span id='sysMsg'>name changed to " + newName + "</span>";
                }
            break;
            case "roll":
                if(index == -1) {
                    return "<span id='sysMsg'>Rolled a 20 sided die! Result: " + roll() + "</span>";
                } else {
                    let int = parseInt(str.slice(index + 1));
                    if(isNaN(int)) {
                        chatUpdate("System", "<span id='sysMsg'>Usage: /roll # : rolls a # sided die</span>");
                        return false;
                    } else {
                        return "<span id='sysMsg'>Rolled a " + int + " sided die! Result: " + roll(int) + "</span>";                        
                    }
                }
            break;
            case "help":
                chatUpdate("System", helpText);
                return false;
            break;
            case "color":
                let str2 = str.slice(index + 1)
                str2 = str2.trim();
                if(str2 !== '/color') {
                    let space = str2.indexOf(' ');
                    if(space !== -1) {
                        let colorTarget = str2.slice(0, space);
                        let color = str2.slice(space);
                        switch(colorTarget.toLowerCase()){
                            case 'name':
                                nameColor = color;
                                $('.chatName').css("color", color);
                            break;
                            case 'text':
                                chatTxtColor = color;
                                $('.chatText').css("color", color);
                            break;
                            case 'bg':
                                $('#chat').css("backgroundColor", color);
                            break;
                        }
                    } else {
                        let color = str2
                        nameColor = color;
                        $('.chatName').css("color", color);
                        chatTxtColor = color;
                        $('.chatText').css("color", color);
                    }

                } else {
                    chatUpdate("System", "<span id='sysMsg'>Usage: /color 'color' : changes font color<br>/color bg 'color' : changes chat bg color<br>/color name 'color' : changes name color only<br>/color text 'color' : changes text color only</span>");
                }
                return false;
            break;
            default:
                chatUpdate("System", "<span id='sysMsg'>try /help for commands</span>");
                return false;
            break;
        }
    } else {
        return str;
    }
}

//begin Go Fish stuff

//initialize and get a new deck of cards
function makeDeck() {
    let query = "https://deckofcardsapi.com/api/deck/new/shuffle/?cards=AS,2S,KS,AD,2D,KD,AC,2C,KC,AH,2H,KH"
    //let query = "https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1";
    $.ajax({
        url: query,
        method: 'GET'
    }).then(function(resp){
        deckId = resp.deck_id;
        dataRef.child('data/goFish').update({
            deck_id: deckId
        });
    });//end then
}

//draw cards and update firebase
function drawCard(num) {
    let query = "https://deckofcardsapi.com/api/deck/" + deckId + "/draw/?count=" + num;
    if(deckEmpty) {
        return 'error';
    }
    $.ajax({
        url: query,
        method: 'GET'
    }).then(function(resp){
        if(resp.success) {
            if(resp.remaining === 0) {
                deckEmpty = true;
            }
        addToHand(resp.cards);
        } else {
            deckEmpty = true;
            if(resp.cards.length > 0){
                addToHand(resp.cards);
            }
        }//end else
    }); //end ajax
}

//takes an array of objects, adds array to user's hand of cards
function addToHand (arr) {
    dataRef.child('data/goFish/hands').once("value", function(snap){
        if(!snap.hasChild(userId) || snap.val().length === 0) {
            dataRef.child('data/goFish/hands').update({
                [userId]: arr
            });
        } else {
            // console.log("add: ", snap.val().hand);
            dataRef.child('data/goFish/hands').update({
                [userId]: snap.child(userId).val().concat(arr)
            });
        }
    });
}

function goFish (card) {
    let cardName =  "Got any " + card.value + "'s?";
    chatPrint(userName, cardName);
    let index;
    index = oppHand.findIndex(x => {return x.value === card.value});
    if(index === -1) {
        getInsult();
        drawCard(1);
        changeTurn();
    } else {
        oppHand.splice(index, 1);
        let myCardIndex = myHand.findIndex(x => {return x.code === card.code});
        myHand.splice(myCardIndex, 1);
        addPoint();
    }
    updateHands();
}

function updateHands () {
    dataRef.child('data/goFish/hands').update({
        [userId]: myHand,
        [opponentId]: oppHand
    });
}

//captures deck ID to share between users
function assignDeckListen() {
    dataRef.child('data/goFish').child('deck_id').on("value", function(snap){
        if(snap.val()) {
            deckId = snap.val();
            drawCard(5);
        }
        //console.log(deckId);
    });
    dataRef.child('data/goFish').onDisconnect().remove();    
}

function assignHandListen() {
    dataRef.child('data/goFish/hands').on('value', function(snap){
        
        /*
        if(!snap.hasChild(userId) && deckId !== null) {
            drawCard(5);
        }
        */
        myHand = snap.child(userId).val();
        oppHand = snap.child(opponentId).val();

        if(myHand && snap.val()){
            checkPairs();
            displayCards();
        }
        if(!myHand || !oppHand){
            $('#btnGrp').empty();
            //console.log("yo");
            //$('#btnGrp').html("Game Over"); 
        }
        //console.log("myHand: ", JSON.stringify(myHand));
        //console.log("oppHand: ", JSON.stringify(oppHand));        
    });
}
function assignGameOver() {
    dataRef.child('data/goFish/hands').on('child_removed', function(snap){
        console.log("success");
        myHand = snap.child(userId).val();
        oppHand = snap.child(opponentId).val();

        if(!myHand || !oppHand){
            $('#btnGrp').empty();
            console.log("Game Over");
            dataRef.child('data/goFish/points').once('value', function(snap) {
                myPoints = snap.child(userId).val();
                oppPoints = snap.child(opponentId).val();
                if(myPoints > oppPoints) {
                    $('#status li').html("You win");
                } else if (myPoints < oppPoints){
                    $('#status li').html("You lose");            
                } else {
                    $('#status li').html("You tied");                            
                }
            });//end dataref
        }
    });
}

function assignPointListen() {
    dataRef.child('data/goFish/points').on('value', function(snap){
        myPoints = snap.child(userId).val();
        oppPoints = snap.child(opponentId).val();
        if(snap.child(userId).val()) {
            $('#points').html("My pairs:" +myPoints);
        } else {
            $('#points').html('');            
        }

        if(snap.child(opponentId).val()) {
            $('#oppPoints').html(oppName + "'s pairs: " + oppPoints);
        } else {
            $('#oppPoints').html('');            
        }
    });
}

function addPoint () {
    dataRef.child('data/goFish/points').once("value", function(snap){
        if(!snap.hasChild(userId)) {
            dataRef.child('data/goFish/points').update({
                [userId]: 1
            });
        } else {
            // console.log("add: ", snap.val().hand);
            dataRef.child('data/goFish/points').update({
                [userId]: snap.child(userId).val() + 1
            });
        }
    });
}

//function to display hand
/*
this function should take myHand and iterate over it, making an <img> for each cardObject in myHand array
src should be attached from the card object image url
the index of that card in the myHand array should be stored as a data-attribute, eg, $('<img>').attr("data-index", index);
those img should then be appended to the targetted div, I would suggest btn group
*/
function displayCards() {
    $('#btnGrp').empty();
    //if img 
    if(myHand) {
        for(let i = 0; i < myHand.length; i++) {
            $('<img>').attr("src", myHand[i].images.png).attr("data-index", i).prependTo('#btnGrp');
        }   
    }
}
$('#btnGrp').on("click", "img", function(){
    if(myTurn) {
        let index = this.getAttribute("data-index");
        goFish(myHand[index]);
    }
});

//function to compare cards in player's own hand and remove duplicates, then add points
function checkPairs() {
    if(myHand) {
        for (let index = 0; index < myHand.length; index++) {
            let arr = myHand.slice();
            let searchCard = arr.splice(index, 1);
            //console.log("card: ", JSON.stringify(searchCard));
            //console.log("value: ", searchCard[0].value);
            //console.log("hand: ", JSON.stringify(arr));
            let match = arr.findIndex(x => {return x.value === searchCard[0].value});
            
            if(match > -1) {
                //console.log("match!!");
                arr.splice(match, 1);
                myHand = arr;
                updateHands();
                addPoint();
            }
        }//end for
    } //end if myHand
}

function getInsult() {
    var cors = 'https://cors-anywhere.herokuapp.com/'
    var queryURL = "https://insult.mattbas.org/api/insult.json?template=Go Fish, you <adjective min=1 max=3 id=adj1> <amount> of <adjective min=1 max=3> <animal> <animal_part>";
    $.ajax({
        url: cors + queryURL,
        method: "GET"
    })
    .then(function(response) {
        if(response) {
            chatPrint(oppName, response.insult);
        }
    })
 
 }