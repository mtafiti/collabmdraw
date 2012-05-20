//decode get request var
function getQueryString(name){
   if(name=(new RegExp('[?&]'+encodeURIComponent(name)+'=([^&]*)')).exec(location.search))
	  return decodeURIComponent(name[1]);
}

function getFunctionParams(fn){
	var reg = /\(([\s\S]*?)\)/;
	var params = reg.exec(fn);
	if (params) 
		 return params[1].split(',');
	else
		return [];	
}