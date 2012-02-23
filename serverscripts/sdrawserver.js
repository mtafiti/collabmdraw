var http = require("http"),	
    io = require('socket.io'),
	querystring = require('querystring'),
	midas = require('./midas');

//hold the rooms
var roomsarr = [], 	PORT = 8000;


function start(route, handle){
	// Handle non-socket.io requests
	var server  = http.createServer(function(request,response){
		//console.log("received request: " + request.url);
				
		route(handle, request, response, roomsarr);	
		
		//new room request
		var params = querystring.parse(request.url);		
		if (request.url.indexOf("room=new") !== -1){
			
			//check if room is there already
			if (handle["roomExists"](params.rname,roomsarr) === false){
				roomsarr.push({name: params.rname, data: ''});
			}
		}				
	});	
	io = io.listen(server);	//socket.io
	server.listen(PORT);
	
	console.log("Draw server listening on port "+PORT+".");
	
	//reduce debug messages of io
	io.set('log level', 1);
	//io.set('transports', ['websocket','flashsocket']);	// enable some transports
	
	//the rooms channel
	var rooms = io
	  .of('/rooms')
	  //a device has connected to rooms 'channel'..
	  .on('connection', function (socket) {
		//var to keep room of socket
		var socketRoom = '';			
		//leader can multicast to everyone who connected
		rooms.emit('device connected', {
			msg: 'Device connected to room'
		});
		socket.on('join room',function(msg){
			//device joins room
			socket.join(msg.rname);
			socketRoom = msg.rname;
			console.log('Device joined room '+msg.rname);
			//set room for socket
			socket.set('roomname', msg.rname, function () {
				socket.emit('joined',{ msg: "you've joined " + socketRoom });
			});
			//OR io.sockets.in('some other room').emit('hi');						
		});
		//msg sent to devices in room
		socket.on('room_send',function(data){
			//get the room for the socket
			/* removed - good performance, but has bugs with
				long polling reconnection
			if (!socketRoom){
				 socket.emit('msg',"You have not joined a room.");	
				 return;
			}
			console.log(socket.id+' about to broadcast data to room: ' + socketRoom);
			socket.broadcast.json.to(socketRoom).send(data);
			//io.sockets.in(socketRoom).emit('room_send', data);
			*/
			
			socket.get('roomname', function (err, name) {
				if (err){
					socket.send({msg: 'You are not registered to a room'});
					return;
				}
				//now send to devices in room
				console.log(socket.id+' about to broadcast data to room: ' + socketRoom);
				socket.broadcast.json.to(name).send(data);
			});			
		});
	 });
	
	//the leader channel
	var leader = io
	  .of('/leader')
	  //a device has connected to leader 'channel'..
	  .on('connection', function (socket) {
		socket.emit('connection successful', {
			msg: 'Connected to leader successfully'
		});
		/*leader can multicast to everyone who connected
		/leader.emit('device connected', {
			msg: 'Device connected to leader'
		});
		*/
		socket.on('register_sequence', function (data, cbname, returnfn) {	  
		
			//TODO: cliend id needed?
			midas.publish(data);	
			console.log("registering a sequence..");
			console.dir(data);
			midas.subscribe(cbname, function(data){
				//at this point midas has identified a cb sequence
				//TODO: need to send data back to clients
				console.log("Event raised in midas: ");
				console.dir(data);
				returnfn(data);
			});
			//wait for feedback, or timeout??
			
		  })
		  socket.on('fn_invoked', function (data, returnfn) {	  
				
				//TODO: cliend id needed?
				midas.publish({type: 'Invoke','name': data.fn, args: data.args, reciever:  data.rec});
				
				//wait for feedback, or timeout
				//TODO: how to connect this to the callback above
				
				//then call the fn
				returnfn('functionality incomplete');
		  });
	  });	  
	  
	//start socket connection to midas
	midas.start();
}

exports.start = start;