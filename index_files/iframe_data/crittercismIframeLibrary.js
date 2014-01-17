/* crittercismServerLibrary.js
 * Resides inside the iframe served by crittercism.com to enable cross-domain communication.
 * Try to make this as stateless and lightweight as possible -- it's purpose-built for communication,
 * not keeping track of how many exceptions we've handled, etc.
 */

var CrittercismIframe = (function() {
	var messageTallies = { };
	
	var tallyEvent = function(eventType) {
		messageTallies[eventType] = messageTallies[eventType] || 0;
		++messageTallies[eventType];
	}; 
	
	// makePOSTRequest is a lightweight version of jQuery.post. 
	// If url or parameters is empty, we don't do anything.
	var makePOSTRequest = function(url, entityBody, contentType) {
		if(url && entityBody) {
	    var http_request = false;
	    if (window.XMLHttpRequest) { // Mozilla, Safari,...
	      http_request = new XMLHttpRequest();
	      if (http_request.overrideMimeType) {
	        http_request.overrideMimeType(contentType);
	      }
	    } else if (window.ActiveXObject) { // IE
	        try {
	          http_request = new ActiveXObject("Msxml2.XMLHTTP");
	        } catch (e) {
	        	try {
	        		http_request = new ActiveXObject("Microsoft.XMLHTTP");
	        } catch (e) {}
	      }
	    }
	    
	    if (!http_request) {
	      return false;
	    }
	   
	    http_request.onreadystatechange = function() {
	  		if (http_request.readyState == 4) {
	  			if (http_request.status == 200) {
	  				try {
	  					var result = JSON.parse(http_request.responseText);
	  					
	  					if(result.did) {
	  						window.parent.postMessage({type: 'setDeviceId', contents: {
	  							deviceId: result.did
	  							}
	  						}, '*');	
	  					}
	  	      } catch(err) {
	  	      	
	  	      }

	  	      return false;
	  			} else {
	  				// we experienced an error while sending...the error
	  	    }
	  	  }
	  	};
	  	
	    http_request.open('POST', url, true);
	    http_request.setRequestHeader("Content-type", contentType);
	    http_request.send(entityBody);
		}
	};
	
	// Converts Javascript object to application/x-www-form-urlencoded
	// http://stackoverflow.com/questions/1096670/support-for-encoding-query-string-or-post-data-in-yui
	var toQueryString = function(o) {
    if(typeof o !== 'object') {
        return false;
    }
    var _p, _qs = [];
    for(_p in o) {
        _qs.push(encodeURIComponent(_p) + '=' + encodeURIComponent(o[_p]));
    }
    return _qs.join('&');
	};
	
	var messageHandler = function(event) {
		// UDP-like stateless communication -- just need to bounce SYNs back, not save sender
		// Explicitly disregard origin here because we want to accept messages from anywhere.
  	if(event.data.type)	{					// Ignore if there's no type
  		tallyEvent(event.data.type);
  		
  		// All the pure html5 endpoints use pure json; metadata uses a bastard
  		// JSON-inside-application/x-www-form-urlencoded **rage**
			switch(event.data.type) {
				case 'clientSyn':
					event.source.postMessage({type: 'iframeSynAck' }, '*');
					break;
				 
				case 'clientSynAck':
					event.source.postMessage({type: 'iframeAck'}, '*');
					break;
				 
				case 'clientAck':
					break;
					
				case 'appLoad':
					var url = '/app_loads';
					
					var entityBody	= JSON.stringify(event.data.contents);
					var contentType = 'application/json;charset=UTF-8';
					
				  makePOSTRequest(url, entityBody, contentType);
					break;
		      
				case 'handled_exception':
					var url = '/errors';
					
					var entityBody 	= JSON.stringify(event.data.contents);
					var contentType = 'application/json;charset=UTF-8';
					
				  makePOSTRequest(url, entityBody, contentType);
					break;
				
				case 'crash':
					var url = '/crashes';
					
					var entityBody 	= JSON.stringify(event.data.contents);
					var contentType = 'application/json;charset=UTF-8';
					
				  makePOSTRequest(url, entityBody, contentType);
					break;
					
				case 'metadata':
					var url = '/feedback/update_user_metadata';
					
					var entityBody 	= JSON.stringify(event.data.contents);
					var contentType = 'application/x-www-form-urlencoded;charset=UTF-8';
					
					var entityBody = toQueryString({
							app_id: event.data.contents.app_id,
							device_id: event.data.contents.device_id,
							device_name: event.data.contents.device_name,
							library_version: event.data.contents.library_version,
							metadata: JSON.stringify(event.data.contents.metadata),
					});
					
				  makePOSTRequest(url, entityBody, contentType);
					break;
			}

		  if (event.preventDefault) {
		  	event.preventDefault();
		  	// otherwise set the returnValue property of the original event to false (IE)
		  } else {
		  	event.returnValue = false;
		  }
  	}
  };
  
  /* Set up postMessage handler and notify client that we're ready */
  window.addEventListener("message", messageHandler, false);
  window.parent.postMessage({type: 'iframeSyn'}, '*');
  
  return {
	  _dumpState: function() {
	  	return {
	  		messageTallies: messageTallies
	  	}
	  },
	  
	  // Tests synchronous message reception
	  _syncMessageReceive: function(message) {
	  	return messageHandler({ data: message });
	  }
	};
})();

