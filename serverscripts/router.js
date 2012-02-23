
function route(handle, request, response, rms) {
  
   var pathname = request.url; 
   //console.log("About to route a request for " + pathname);
  if (pathname.indexOf("ajax") !==  -1) {
	handle["ajax"](response,request, rms);
  } else {	
	handle["servefile"](response,pathname);
	 /*
    console.log("No request handler found for " + pathname);
    response.writeHead(404, {"Content-Type": "text/plain"});
    response.write("404 Not found");
    response.end();
	*/
  }

}
exports.route = route;