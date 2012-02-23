//decode get request var
function getQueryString(name){
   if(name=(new RegExp('[?&]'+encodeURIComponent(name)+'=([^&]*)')).exec(location.search))
	  return decodeURIComponent(name[1]);
}
