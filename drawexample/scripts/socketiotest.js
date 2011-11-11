var io = require('socket.io').listen(8000);
io.set('log level', 1); //reduce logging messages

var chat = io
  .of('/draw2/clients')
  .on('connection', function (socket) {
	//console.log(">>>>>>> Someone connected to the draw2 feed at: "+ new Date());
	socket.on('edit', function(data) {
		//console.log(">>>>>>> edit data received:"+data);
		socket.broadcast.emit('edit', data);	//send to everyone except the actual socket.
	});
  });
  

var news = io
  .of('/draw2/news')
	.on('connection', function (socket) {
	//console.log(">>>>>> Someone connected to the news feed" + new Date());
    socket.emit('news', { news: 'item' });
  });