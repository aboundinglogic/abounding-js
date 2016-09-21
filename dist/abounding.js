Number.prototype.formatCurrency = function() {
	var is_negative = (this < 0);
	var num_abs = Math.abs(this);
	var str_num = num_abs.toFixed(2);
	var str_array = str_num.split('.');
	var str_dollars = str_array[0];
	var str_cents = str_array[1];
	var str_out = '';
	var str_count = 0;
	for(var i = str_dollars.length - 1; i >= 0; i--) {
		str_count++;
		if(str_count == 4) {
			str_out = ',' + str_out;
			str_count = 1;
		}
		str_out = str_dollars[i] + str_out;
	}
	str_out = str_out + '.' + str_cents;
	if(is_negative) str_out = '-' + str_out;
	return str_out;
}


// make sure we have the sendAsBinary method on all browsers
XMLHttpRequest.prototype.mySendAsBinary = function(text)
{
	var data = new ArrayBuffer(text.length);
	var ui8a = new Uint8Array(data, 0);
	for (var i = 0; i < text.length; i++) ui8a[i] = (text.charCodeAt(i) & 0xff);

	if(typeof window.Blob == "function")
	{
		var blob = new Blob([data]);
	}

	else {
		var bb = new (window.MozBlobBuilder || window.WebKitBlobBuilder || window.BlobBuilder)();
		bb.append(data);
		var blob = bb.getBlob();
	}

	this.send(blob);
}


// jQuery
$(document).ready(function() {

	// Element blocking
	$.datepickerOptions = {
		todayBtn: 'linked',
		forceParse: false,
		todayHighlight: true,
		autoclose: true,
		format: {
			toDisplay: function(date)
			{
				return (date.getUTCMonth() + 1) + '/' + date.getUTCDate() + '/' + date.getUTCFullYear();
			},
			toValue: function(date, format, language)
			{
				return date;
			}
		}
	}

	$('.datepicker').datepicker($.datepickerOptions);

	// Element blocking
	$.blockOptions = {
        message: '<i id="blockui-spinner" class="fa fa-gear"></i>',
        fadeIn: 0,
        fadeOut: 0,
        ignoreIfBlocked: true,
        css: {
            backgroundColor: 'transparent',
            border: 'none'
        },
		overlayCSS: {
			backgroundColor: '#FFF'
		}
    }

    $.ajaxOptions = {
		type: 'POST',
		dataType: 'json',
		error: function(jqXHR, textStatus, errorThrown) {
			if(jqXHR && jqXHR.responseText) {
				var responseText = jQuery.parseJSON(jqXHR.responseText);
				alert(responseText.error.message);
				if(!APP_DEBUG) window.location.reload(true);
			}
		}
    }

    // Post JSON function
    $.postJSON = function(url, options, block) {
    	var defaults = {
    		beforeSend: function() {
    			if(block === true) $.blockui();
    			else if(block) $(block).blockElem();
    		},
    		complete: function() {
				if(block === true) $.unblockUI();
				else if(block) $(block).unblock();
			},
    	}

    	var settings = $.extend({}, $.ajaxOptions, defaults, options);
        $.ajax(url, settings);
    };

    $.blockui = function(options) {
		var settings = $.extend({}, $.blockOptions, options);
		$.blockUI(settings);
    }

    $.showModal = function(id, url) {

    	if( $('#' + id).length ) {
    		
    		$('#' + id).modal('show');
    	}

		else {

			$.blockui();

			$.ajax(url, {

				dataType: 'html',

				success: function(html, textStatus, xhr) {
					$('#content').append(html);
					$.unblockUI();
					$('#' + id).modal('show');
				},

				error: function(xhr, textStatus, error) {
					if(xhr.status == 403) {
						window.location.href = '/login';
					}

					else {
						alert(textStatus);
						window.location.reload(true);
					}
				}
			});
		}
    }

    // Need to attempt to unblock when page unloads
    $(window).unload(function() {
		$.unblockUI();
	});

    $.fn.postFile = function(options) {
    	var $self = this;

    	var defaults = {
    		url: undefined,
    		type: "POST",
			onBeforeSendAll: function($elem, files) {},
			onBeforeSend: function($elem, file, xhr, file_id) {},
			onProgress: function($elem, file, xhr, file_id, position, total, percentage) {},
			onSuccess: function(data, $elem, file, xhr, file_id) {},
			onError: function($elem, file, xhr, file_id) {}
    	}

    	var settings = $.extend({}, defaults, options);

	    $self.on('change', function() {

			var files = $self[0].files;

			// Trigger event before sending all files
	    	if(settings.onBeforeSendAll.call(null, $self, files) === false) return false;

			for(var i = 0; i < files.length; i++) {

				var file_id = 'file-' + randomId(32);

				var file = files[i];
				var reader = new FileReader();
				(!IS_IE) ? reader.readAsBinaryString(file) : reader.readAsDataURL(file);

				reader.onloadend = function(evt)
				{
					// create XHR instance
					xhr = new XMLHttpRequest();

					// send the file through POST
					xhr.open(settings.type, settings.url, true);
					xhr.setRequestHeader("X-File-Name", file.name);
					xhr.setRequestHeader("X-File-Size", file.size);
					xhr.setRequestHeader("X-File-Type", file.type);

					// let's track upload progress
					var eventSource = xhr.upload || xhr;
					eventSource.addEventListener("progress", function(e)
					{
						// get percentage of how much of the current file has been sent
						var position = e.position || e.loaded;
						var total = e.totalSize || e.total;
						var percentage = Math.round((position/total)*100);

						// here you should write your own code how you wish to proces this
						settings.onProgress.call(null, $self, file, xhr, file_id, position, total, percentage);
					});

					// state change observer - we need to know when and if the file was successfully uploaded
					xhr.onreadystatechange = function()
					{
						if(xhr.readyState == 4)
						{
							if(xhr.status == 200)
							{
								// Trigger successful function
								settings.onSuccess.call(null, JSON.parse(xhr.response), $self, file, xhr, file_id);

							} else {
								// Trigger error function
								settings.onError.call(null, $self, file, xhr, file_id);
							}
						}
					};

					// start sending
					if(settings.onBeforeSend.call(null, $self, file, xhr, file_id) === false) return false;
					(!IS_IE) ? xhr.send(window.btoa(evt.target.result)) : xhr.send(evt.target.result);
				};
			}
		});
    }

    $.fn.blockElem = function(options) {
    	var settings = $.extend({}, $.blockOptions, options);
        $(this).block(settings);
    }

    $.fn.serializeForm = function(additional_data) {
        var serializeArray = $(this).serializeArray();
        var index, field, form_data = new Array();

        for(index in serializeArray) {
            field = serializeArray[index];
            form_data[field.name] = field.value;
        }

        return $.extend({}, form_data, additional_data);
    }

    $.fn.validateForm = function(options) {
        var $self = $(this);

        var defaults = {
            onfocusout: false,
            onkeyup: false,
            onclick: false,
            ignore: [],
            showErrors: function(errorMap, errorList) {
                // Reset errors
                $self.find('.form-group').removeClass('has-error');

                var index, error, $elem;

                if(errorList instanceof Array) {
                    for(index in errorList) {
                        error = errorList[index];
                        $elem = $(error.element);
                        $elem.closest('.form-group').addClass('has-error');
                        $elem.not(':input[type="radio"]').tooltip({
                            'title': error.message,
                            'trigger': 'hover'
                        });
                    }
                }
            }
        }

        var settings = $.extend({}, defaults, options);
        
        return $(this).validate(settings);
    }

    $.fn.jsonForm = function(validateOptions, ajaxFormOptions, block, reload) {

    	var $self = $(this);

		var ajaxFormDefaults = {

    		beforeSend: function() {

    			if(block === true) $.blockui();
    			else if(block) $(block).blockElem();
    		},

    		complete: function() {

				if(block === true) $.unblockUI();
				else if(block) $(block).unblock();
			},
    	}

    	var ajaxFormSettings = $.extend({}, $.ajaxOptions, ajaxFormDefaults, ajaxFormOptions);

    	var validateDefaults = {

			submitHandler: function(form) {

				$(form).ajaxSubmit(ajaxFormSettings);
			}
		}

		var validateSettings = $.extend({}, validateDefaults, validateOptions);

		return $self.validateForm(validateSettings);
    }
	
});

// Generate a random id
function randomId(length)
{
	length = length || 5;

	var text = "";
	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

	for( var i=0; i < length; i++ )
		text += possible.charAt(Math.floor(Math.random() * possible.length));

	return text;
}

function getURIParameters()
{
	var queries = {};

	var search = window.location.search;

	if(search)
	{
	  search.substr(1).split('&').forEach(function(param)
	  {
	    var i = param.split('=');

	    queries[i[0]] = decodeURIComponent(i[1]);
	  });
	}

	return queries;
}
