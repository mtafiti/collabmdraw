/**
 * Created by kk.
 */

/**
 * TOTAL: 71 + 1167 = 1178 (+ 242 IN OTHER SHAPE TYPE CODES) = 1360
 * ON GROUP COMM: 16
 * ON CEP RULES: 60 (-1)
 */
//collabdraw.js: CLIENT: 12 in collabdraw.js (SESSION INTIALIZATION + CALLBACK ERROR HANDLER REG) BUT REQUIRES MINGO CLIENT LIBRARY
//               GROUP COORDINATION: 1 (INITIALIZATION)
//               TOTAL: 71

//requires a socket.io connection

var HOST = '134.184.43.189'; // add the ip of the mingo server
var constants = {
    JOIN_ROOM: 'join_room'
};

var roomsocket = io.connect('http://'+HOST+'/rooms'),
    leadersocket = io.connect('http://'+HOST+'/leader');    //separate socket for leader, but not a must, can have only one

var rname = utils.getQueryString('rname');
var nickname = utils.getQueryString('nick');

var editor, mingolib;

function init(){
    editor = new DrawingEditor('canv1', canvas.width, canvas.height);
    //load the session, if any
    editor.loadSession(rname);

    mingolib = new Mingo(rname, leadersocket);

    //add canvas as grpid
    var editorgrp = mingolib.GroupObject(editor, {}, "CANVAS-1");

    //replicate add shape action - because this creates a new object, add third param
    editorgrp.replicateAction('addShape', null, true);

}

//join the room
roomsocket.emit(constants.JOIN_ROOM, {'rname':rname}, function() {
    console.info("Joined room "+ rname);
});

roomsocket.on('device connected', function (reply) {
    console.info(reply.msg);
});

roomsocket.on('device_no', function (reply) {
    console.info(reply);
});
roomsocket.on('msg', function (msg) {
    console.info(msg);
});

//message from device in room received
roomsocket.on('room_receive', function(data) {
    // handle published data
    processDistData(data);
});

/* ----------- replicate  fns -------------- */


/**
 * Sends an action to replicate
 * @param action
 * @param data
 */
function publishChange(action, data){
    data.rname = rname;
   // roomsocket.emit('room_send',data);
    console("Pulblish change called, but not defined");
}

function publishGesture(msg){
    //leadersocket.emit('event raised',msg);
}

function setNames(roomname, nickname){
    rname = roomname||''; nick = nickname||'';
}
