var server = require("./fdrawserver"),
	router = require("./router"),
	requestHandlers = require("./requestHandler");

//create handler functions indexes
var handle = {}
//handle["/"] = requestHandlers.start;
handle["start"] = requestHandlers.start;
handle["upload"] = requestHandlers.upload;
handle["servefile"] = requestHandlers.servefile;
handle["ajax"] = requestHandlers.ajax;
handle["roomExists"] = requestHandlers.roomExists;

//start the server, pass handlers	
server.start(router.route,handle);
