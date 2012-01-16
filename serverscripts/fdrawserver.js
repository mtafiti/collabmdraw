var http = require("http"),	
    faye = require('faye'),	//faye version 0.7.1. needs cookiejar
	querystring = require('querystring'),
	midas = require('./midas');

//hold the rooms
var rooms= [], 	PORT = 8000;
	
var bayeux = new faye.NodeAdapter({mount: '/faye', timeout: 45});

function start(route, handle){
	// Handle non-Bayeux requests
	var server  = http.createServer(function(request,response){
		console.log("received request: " + request.url);
		//for get requests, may need to strip						
				
		route(handle, request, response, rooms);	
		
		//new room request
		if (request.url.indexOf("room=new") !== -1){
			var params = querystring.parse(request.url);
			//check if room is there already
			if (handle["roomExists"](params.rname,rooms) === false){
				rooms.push({name: params.rname, data: ''});
			}
		}		
	});	
	
	//from faye docs: 
	/* subscribe [clientId, channel] – Triggered when a client subscribes to a channel. 
		This does not fire if a /meta/subscribe message is received for a subscription that already exists.
	*/
	bayeux.bind('subscribe', function(clientId, channel) {
	  // event listener logic
	  console.log("Client: " +clientId + "Subscribing to channel: " + channel);
		var roomname = channel.substring(channel.lastIndexOf("/"),channel.length);
		console.log("room name: " + roomname);
	})
	bayeux.bind('publish',function(clientId, channel, data){	
		//send only mouse movements on shape
		if (channel.indexOf("/faye/gestures")!== -1){
			midas.publish({x: data.x, y: data.y, state: data.type, 'clientId': clientId});
		}
	});
	bayeux.attach(server);
	server.listen(PORT);
	console.log("Draw server listening on port "+PORT+".")
	
	//connect to midas
	midas.start();
}

exports.start = start;