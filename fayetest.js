var http = require("http"),
	fs = require("fs"),
	path = require('path'),
    faye = require('faye');

var bayeux = new faye.NodeAdapter({mount: '/faye', timeout: 45});

// Handle remote non-Bayeux requests

var server  = http.createServer(function(request,response){
	//console.log("received request: " + request.url);
	
	//manual routing of requests, will clean this later
	// may need to add a static file routing library of nodejs
	
	// ---- linux --------
	//var filePath = '.' + request.url;
	//if (filePath == './')
	//	filePath = './drawexample/socketiodraw.html';
	
	// ---- windows -------
	var filePath =  request.url;
	if (filePath === '/')
		filePath = __dirname + '/drawexample/fayedraw.html';
	else if (filePath.indexOf("faye.js") === -1)
		filePath =  __dirname + '/drawexample' +  request.url;
	
	//console.log("filepath: " + filePath);	
	
	var extname = path.extname(filePath);
	
	var contentType = 'text/html';
	switch (extname) {
		case '.js':
			contentType = 'text/javascript';
			break;
		case '.css':
			contentType = 'text/css';
			break;
		case '.jpg':
			contentType = 'image/jpeg';
			break;
		case '.ico':
			contentType = 'image/x-icon';
			break;
	}
	
	path.exists(filePath, function(exists) {
	
		if (exists) {
			//console.log("file exists!");
			fs.readFile(filePath, function(error, content) {
				if (error) {
					response.writeHead(500);
					response.end(content);
				}
				else {
					response.writeHead(200, { 'Content-Type': contentType });
					response.end(content, 'utf-8');
				}
			});
		}
		else {
			console.log("file not found! "+request.url);
			response.writeHead(200);
			response.end();
		}
	});
});
//attach pub sub server
bayeux.getClient().subscribe('/faye/draw/clients', function(data) {
	bayeux.getClient().publish('/faye/draw/edits', data);
});

bayeux.attach(server);
server.listen(80);