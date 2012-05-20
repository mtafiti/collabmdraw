var net = require('net');	

//the socket
var socket;
//midas host
var midasHost = "127.0.0.1", midasPort = 4337, inboundName = '', 
	file='G:/Masters/Second Year/Thesis/Work/Project/draw/serverscripts/templates.clp';

function connect(host, port, name, callback){

	//create socket connection to midas engine
	midasPort = port || midasPort;
	midasHost =	host || midasHost;
	inboundName = name || inboundName;
	
	socket = net.createConnection(midasPort,midasHost);	
	socket.setNoDelay();	//send msgs immediately, no waiting
	socket.setEncoding('utf8');	//handle strings, not buffers
	
	socket.on('connect', function() {
		console.log('Inbound "'+inboundName+'" socket to midas created on '+midasHost+ ':'+midasPort);
		
		register();
		reset();
		
		//load file
		loadFile();
		
		if (callback && typeof callback === 'function'){
			callback();
		}
	});
	socket.on('data', function(data) {
	  // Log the response from the HTTP server.
	  console.log("M>> "+'INBOUND RESPONSE: ' + data);
	  
	});
	socket.on('error', function(err) {
	  console.log("M>> "+'Error encountered: ');
	  console.dir(err);
	});
	socket.on('end', function() {
	  console.log("M>> "+'[Note] Midas Connection closed.');
	});
}
//add and send code to midas
function addCode(sExpressionCode){
	var str = ["s-expression",sExpressionCode];	
	str = JSON.stringify(str);	
	//console.log("M>> "+str);	
	send(str);
}
//add and send string (not code) to midas
function add(obj){
	var str = JSON.stringify(obj);	
	//console.log("M>> "+str);	
	send(str);
}
//helper function to send
function send(data){
	socket.write(data);
	socket.write("\0");
	//socket.write("\u0000");
}
function register(){
	var input = ["register-input",{'name': inboundName}];	
	str = JSON.stringify(input);	
	//console.log("M>> "+str);
	
	send(str);
}
//disconnect this end of the channel
function disconnect(){
	if (socket.end)
		socket.end();
	
}
//start
function start(){
	addCode("(start-midas) ");
}
//reset
function reset(){
	addCode("(reset-midas) ");
}
//stop
function stop(){
	addCode("(stop-midas) ");
}
function loadFile(theFile){
	addCode('(load "'+(theFile || file)+'")');
}

exports.loadFile = loadFile;
exports.addCode = addCode;
exports.add = add;
exports.reset = reset;
exports.register = register;
exports.connect = connect;