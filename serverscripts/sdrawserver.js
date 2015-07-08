
//FOR MINGO: SERVER: 12 (INTIALIZATION + CALLBACK ERROR HANDLER REG) BUT REQUIRES MINGO SERVER PACKAGE
// GROUP COORDINATION: 1 (INITIALIZATION)
//TOTAL: 30
var http = require("http"),
    io = require('socket.io'),
	querystring = require('querystring'),
	midas = require('./midas'),
    _ = require("underscore");

//hold the rooms
var roomsarr = [], count = 0, 	PORT = 8000;


function start(route, handle){
	// Handle non-socket.io requests
	var server  = http.createServer(function(request,response){
		//console.log("received request: " + request.url);
				
		route(handle, request, response, roomsarr);	
		
		//new room request
		var params = querystring.parse(request.url);		
		if (request.url.indexOf("room=new") !== -1){
			
			//check if room is there already - keep the order of connection to imply layout of extended canvas
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

	//the rooms channel
	var rooms = io
	  .of('/rooms')
	  //a device has connected to rooms 'channel'..
	  .on('connection', function (socket) {
		//var to keep room of socket
		var socketRoom = '';
        var socketNo = count++;
		//leader can multicast to everyone who connected
		rooms.emit('device connected', {
			msg: 'Device of id:' +socket.id+ 'connected to room'
		});
		socket.on('join_room',function(msg, cb){
			//device joins room
			socket.join(msg.rname);
			socketRoom = msg.rname;
			console.log('Device joined room '+msg.rname);
			//set room for socket
			socket.set('roomname', msg.rname, function () {
				socket.emit('joined',{ msg: "you've joined " + socketRoom });
			});
            socket.set('deviceno', msg.rname, function () {
                socket.emit('device_no',{ msg: "your device number: " + socketNo});
            });

            cb(null, {devno: socketNo, room: socketRoom});
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
                socket.broadcast.json.to(name).send('room_receive',{data: data, orientation: socketNo}); //no implies the layout
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

            socket.on('register_sequence', function (collabrulename, rule, returnfn) {

            midas.createCollabRule(collabrulename, rule, function(invokes){
                //seqcallback: at this point midas has identified a cb sequence
                //get room name, then send to ppl in room
                socket.get('roomname', function (err, name) {
                    //append correct rule to invokes
                    invokes.forEach(function(invoke){
                        if (invoke) {
                            invoke.rulename = collabrulename;
                            //console.dir(invoke);
                        }
                    });
                    //now send to devices in room
                    //socket.broadcast.json.to(name).emit('sequence_callback',invokes);

                    //leader.in(data.session).socket.emit('test', "Test message" + count++);
                    _.forEach(leader.in(name).sockets, function(socket){
                        //if (data.device === socket.id) { return; }
                        socket.emit('sequence_callback', invokes);

                    });
                });

            });
            //finished registering sequence
            returnfn({msg: 'Registered sequence successfully'});
        });

        socket.on('fn_invoked', function (data, returnfn) {

            midas.publishInvoke(data,socket.id, function(data){
                    //return the result to client
                    returnfn(null, data);
                });
        });


        socket.on('assert_event', function (eventname, eventobj, returnfn) {

            midas.assertEvent(eventname, eventobj, socket.id, function(err, data){
                //call acknowledgement fn
                returnfn(err, data);
            });
        });

        socket.on('reg_replicate_event', function (eventname, eventobj, returnfn) {

            midas.replicateEvent(eventname, eventobj, socket.id, function(err, data){
                //return the result to client
                returnfn(err, data);
            });
        });

    });
	//start socket connection to midas

    // when midas receives replicated event, it waill call this function
	midas.start(function(success){
        if (success)
            console.log("Mingo server started successfully.. ");

        var count = 0;
        //set replicated fn
        midas.setReplicateFn(function(data){
            //console.log(" Replicated action called " + data.name);
            //now send to devices in room

            //leader.in(data.session).socket.emit('test', "Test message" + count++);
            _.forEach(leader.in(data.session).sockets, function(socket){
                if (data.device === socket.id) { return; }
                socket.emit('receive_replicated_event', data);

            });
        });
    });
}

exports.start = start;