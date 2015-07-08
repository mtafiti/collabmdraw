var fs = require("fs"),
	querystring = require('querystring'),
	path = require('path');
	
function start(response) {
  console.log("Request handler 'start' was called.");
}

function upload(response) {
  console.log("Request handler 'upload' was called.");
  response.writeHead(200, {"Content-Type": "text/plain"});
  response.write("Hello Upload");
  response.end();
}
function servefile(response,filePath){
	 //console.log("Request handler 'fileserver' was called.");
	 
	 //var filePath =  request.url;
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
		case '.png':
			contentType = 'image/png';
			break;
		case '.gif':
			contentType = 'image/gif';
			break;
	}
	
	if (filePath.indexOf('?') !== -1)
	{
		filePath = filePath.substring(0,filePath.indexOf('?'));
	}
	
	if (filePath === '/')
		filePath = __dirname + '/../../index-test.html';
	else 
		filePath =  __dirname +'/../../' +filePath;

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
			console.log("file not found! "+filePath);
			response.writeHead(200);
			response.end();
		}
	});
		
}
function ajax(response,request, rooms){
	//clean get request
	var pathname = request.url;
	var content = '';	
	
	if (request.method === 'POST') {
		console.log("[200] " + request.method + " to " + request.url);
		 var fullparams = '';
		request.on('data', function(chunk) {
			
		  fullparams += chunk;		 		  
		});
		
		//finished getting post data.. now serve params		
		request.on('end', function(){
			
			var postparams = querystring.parse(fullparams);
			//console.log("postparams:");console.dir(postparams);
			
			switch (postparams.request){
				case 'savesession':
					//add data to rooms object	
					content = JSON.stringify({success: false, msg: 'Problem occurred when saving. Room may not exist.'});								
					rooms.map(function(room){
						if (room.name === postparams.rname){
							room.data = postparams.data;
							content = JSON.stringify({success: true, msg: 'Session saved successfully'});
						}
					});	
					console.log(rooms);				
																		
					break;
				case 'loadsession':
					
					
					//get room session
					rooms.map(function(rm){
						if (rm.name === postparams.rname){
							content = JSON.stringify({data: rm.data, success: true});
						}
					});									
					break;
				default:
					break;
			}
			
			response.writeHead(200, { 'Content-Type': "application/json" });
			response.end(content, 'utf-8');	
		});
		
	}else {
	
		//GET Ajax request
		if (pathname.indexOf('?') !== -1)
		{
			pathname = pathname.substring(pathname.indexOf('?')+1,pathname.length);
		}
		//console.log("Request handler 'ajax' was called. pathname:"+pathname);
		
		//split multiple parameters
		var params = querystring.parse(pathname);					
		
		//console.log(params.request);
		
		switch (params.request){
			case 'loadrooms':
				console.dir(rooms);
				content = JSON.stringify(rooms);
				break;		
		}		
		response.writeHead(200, { 'Content-Type': "application/json" });
		response.end(content, 'utf-8');	
	}	
	
}
// helper function to check if room exists
function roomExists(rname,rooms){
	for (var i=0, l = rooms.length; i < l; i++){
		if (rooms[i].name === rname)
			return true;
	}
	return false;
}
//------------ utility functions -------------------

//--------------------------------------------------
exports.start = start;
exports.upload = upload;
exports.servefile = servefile;
exports.ajax = ajax;
exports.roomExists = roomExists;