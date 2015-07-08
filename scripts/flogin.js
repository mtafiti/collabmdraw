
function remoteCall(url, args, responseCallback) {
	http = new XMLHttpRequest();
	http.open("GET", url + "?" + args, true);
	http.onreadystatechange = function() {
		if (http.readyState === 4) {
			 if (http.status === 200) {  
				var response = JSON.parse(http.responseText);
				responseCallback(response);  
			} else {  
			  console.log("Error", http.statusText);  
			} 
			
		};
	};
	http.send(null);
};

//remote call for rooms
remoteCall("ajax","request=loadrooms",function (reply) { 
	var dd = document.getElementById('room');
	var rms = reply;
	
	if (!rms)
		return;
	rms.map(function(val){			
		dd.add(new Option(val.name, val.name),null);
	});

 });
 
 function selectRoom(val){
	if (val === 'new'){		
		document.getElementById('roomname-div').style.display = "block";
		document.getElementById('rname').value = "";
	}else{
		document.getElementById('roomname-div').style.display = "none";
		document.getElementById('rname').value = document.getElementById('room').value;
	}
 }