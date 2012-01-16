var net = require('net'),
	utilities = require('./utilities');

//the socket
var socket;
//midas host
var midasHost = "127.0.0.1", midasPort = 4337, outboundName = '';
//event listeners
var subscribedListeners = [];

function connect(host, port, name, callback){

	//create socket connection to midas engine
	midasPort = port || midasPort;
	midasHost =	host || midasHost;
	outboundName = name || outboundName;
	
	socket = net.createConnection(midasPort,midasHost);	
	socket.setNoDelay();	//send msgs immediately, no waiting
	socket.setEncoding('utf8');	//handle strings, not buffers
	
	socket.on('connect', function() {		
		//register 
		register();	
		console.log('Outbound  "'+outboundName+'"  socket to midas created on '+midasHost+ ':'+midasPort);
		
		if (callback && typeof callback === 'function'){
				callback();
		}		
	});
	
	socket.on('data', receiveData);
	
	socket.on('error', function(err) {
	  console.log('Error encountered: ');
	  console.dir(err);
	});
	socket.on('end', function() {
	  console.log('DONE. Connection closed.');
	});
}

function register(){
	var output = ["register-output",{'name': outboundName}];	
	str = JSON.stringify(output);	
	console.log(str);
	
	send(str);
}
//disconnect this end of the channel
function disconnect(){
	if (socket.end)
		socket.end();
	
}

function addCode(sExpressionCode){
	var str = ["s-expression",sExpressionCode];	
	str = JSON.stringify(str);	
	console.log(str);
	
	send(str);
}
function addListener(event, callbk){
	subscribedListeners.push({eventType: event, callback:callbk});
	console.info("subscribed for events from type "+event);
	//console.dir(subscribedListeners);
}
function removeListener(event){
	subscribedListeners = subscribedListeners.filter(function(l){
		if (l.eventType === event){		
			return false;
		}
		else{
		
			return true;
		}
	});	
	console.info("unsubscribed for events from type "+eventType);
	console.dir(subscribedListeners);
}
function getListener(event){
	for (var i = 0, l = subscribedListeners.length; i < l; i++){
		var lstnr = subscribedListeners[i];
		if (lstnr.eventType === event){
			return lstnr;
		}
	}
	return null;
}
//receive data from Midas
function receiveData(data) {
	// Log the response from midas.
	//may need to json decode
	
	//clean the output
	data = data.replace(/(\r\n|[\r\n\u0000])/g, '');
	//take care of multiple outputs at a time from midas		
	//console.dir(utilities);
	var dataArr = utilities.split2(data,"}");		
	
	//call callback for event type
	dataArr.forEach(function(item){
		try{ var jsonData = JSON.parse(item);
		var listener = getListener(jsonData.type);
		if (listener){
			listener.callback(jsonData);
		}		
		}catch(err){
			console.log('ERROR: unable to parse output from midas as Json: '+ typeof data);
			console.dir(data);
		}
	});	
}
//helper function to send
function send(data){
	socket.write(data);
	socket.write("\0");
}
function getName(){
	return outboundName;
}

exports.connect = connect;
exports.getName = getName;
exports.addListener = addListener;
exports.removeListener = removeListener;
exports.getListener = getListener;