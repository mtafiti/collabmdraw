var http = require("http"),	
    io = require('socket.io'),
	querystring = require('querystring'),
	test_midas = require('./midas');

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
	io.set('transports', [
		'flashsocket'
		, 'htmlfile'
		, 'xhr-polling'
		, 'jsonp-polling'
	]);
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
				//console.log(socket.id+' about to broadcast '+data.eventType+ ' data to room: ' + socketRoom);
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
		socket.on('register_sequence', function (data, seqname, returnfn) {	  
				
			test_midas.publishSequenceConfig(data, seqname, function(invokes, eventType){
				//at this point midas has identified a cb sequence				
				//get room name, then send to ppl in room
				
				socket.get('roomname', function (err, name) {										
					//now send to devices in room	
					console.log('sending dist evt notice to clients..');
					socket.broadcast.json.to(name).emit('distr_callback',invokes, eventType);
					//console.log("Sequence callback called. data: ");
					//console.dir(invokes);					
				});	
				
			});
			//finished registering sequence
			returnfn({msg: 'Registered sequence successfully'});
		  });
		  socket.on('fn_invoked', function (data, returnfn) {	  
				
				test_midas.publishTouchEvent(data,socket.id, function(data){
							//return the result to client
							returnfn(data);
						});			
		  });
	  });
	  
	//start socket connection to midas
	test_midas.start();
}

exports.start = start;