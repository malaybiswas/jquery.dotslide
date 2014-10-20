(function($) {
	$(document).ready(function() {
		// Initialize demo controls
		$('.demo-controls > .control-section').accordion();
		
		/** Initialize init section **/
		$('#init-slides, #init-layout, #init-autoplay, #init-transition-always, #init-events').buttonset();
	
		Object.keys(DotSlide.transitions).forEach(function(transition, index) {
			$('#init-transition').append($('<input></input>').attr('type','radio').attr('id', 'rt-' + index).attr('name','rt').attr('value',transition))
									.append($('<label></label>').addClass('init-transition').attr('for', 'rt-' + index).text(transition));
		});
		$('#init-transition').buttonset();
		
		$('#init-delay, #init-transit-time').spinner({
			min: 1,
			max: 5,
			step: 1,
			page: 5,
			numberFormat: 'n'
		});
		
		$('#init-dotslide').button();
		
		$('.init-slide, .init-layout:eq(0), .init-transition:eq(0), .init-event').trigger('click');
		$('#init-delay').spinner('value', 4);
		$('#init-transit-time').spinner('value', 1);
		
		$('#init-dotslide').on('click tap', function(event) {
			var options = {};
			options.slides = [];
			
			$('#init-slides > input').each(function() {
				if ($(this).prop('checked')) {
					var slide = {};
					slide.url = $(this).attr('data-url');
					slide.caption = $(this).attr('data-caption');
					slide.layout = $(this).attr('data-layout');
					options.slides.push(slide);
				};
			});
			
			options.layout = $('#init-layout > input[name=rl]:checked').val();
			options.transition = $('#init-transition > input[name=rt]:checked').val();
			options.autoplay = $('#autoplay').prop('checked');
			options.transitionAlways = $('#transition-always').prop('checked');
			$('#init-events > input:checked').each(function() {
				switch($(this).val()) {
				case 'destroy':
					options.onDestroy = function() {
						$('.event-log').prepend($('<div></div>').html((new Date()).toLocaleString('en-US') + ': DotSlide destroyed.'));
					};
					break;
				case 'load':
					options.onLoad = function() {
						$('.event-log').prepend($('<div></div>').html((new Date()).toLocaleString('en-US') + ': DotSlide loaded.'));
					};
					break;
				case 'pause':
					options.onPause = function() {
					$('.event-log').prepend($('<div></div>').html((new Date()).toLocaleString('en-US') + ': Paused DotSlide.'));
					};
					break;
				case 'play':
					options.onPlay = function() {
						$('.event-log').prepend($('<div></div>').html((new Date()).toLocaleString('en-US') + ': Starting DotSlide play.'));
					};
					break;
				case 'changeStart':
					options.onSlideChangeStart = function(fromIndex) {
						$('.event-log').prepend($('<div></div>').html((new Date()).toLocaleString('en-US') + ': Starting to change from slide # ' + (fromIndex + 1) + '...'));
					};
					break;
				case 'changeEnd':
					options.onSlideChangeComplete = function(toIndex) {
						$('.event-log').prepend($('<div></div>').html((new Date()).toLocaleString('en-US') + ': Changed to slide # ' + (toIndex + 1) + '.'));
					};
					break;
				case 'update':
					options.onUpdate = function(updateType) {
						switch(updateType) {
						case 'slideAdd': //other arguments available are index and slide object
								$('.event-log').prepend($('<div></div>').html((new Date()).toLocaleString('en-US') + ': Slides ' + JSON.stringify(arguments[2]) + ' added at position ' + (arguments[1] + 1) + '.'));
							break;
						}
					};
					break;
				}
			});
			options.delay = $('#init-delay').spinner('value')*1000;
			options.transitTime = $('#init-transit-time').spinner('value')*1000;
			
			try {
				$('.slideshow-container').resizable('destroy');
			} catch(e) {}
			$('.slideshow-container').dotslide('destroy')
										.dotslide(options)
										.resizable({
											containment: 'parent'
										});
			$(event.currentTarget).val('Reload');
			$('.event-log').html('');
		});
		
		//initialize event log clear button
		$('#clear-event-log').button()
								.on('click tap', function(event) {
									$('.event-log').html('');
								});
		
		// Initialize slideshow
		$('#init-dotslide').trigger('click');
		
		//Initialize API controls
		$('.controls.api').accordion({
			heightStyle: 'content'
		});
		
		$('#api-play-pause').buttonset();
		$('.api-play-pause:eq(1)').trigger('click');
		$('.api-play-pause').on('click tap', function(event) {
			$('.slideshow-container').dotslide($('#' + $(event.currentTarget).attr('for')).val());
		});
		
		$('#add-slides').buttonset();
		$('#add-slide-index').spinner({
			min: 0,
			step: 1,
			page: 10,
			numberFormat: 'n'
		});
		$('#api-add-slide').button()
							.on('click tap', function(event) {
								var slides = [];
								
								$('#add-slides > input').each(function() {
									if ($(this).prop('checked')) {
										var slide = {};
										slide.url = $(this).attr('data-url');
										slide.caption = $(this).attr('data-caption');
										slide.layout = $(this).attr('data-layout');
										slides.push(slide);
									};
								});
								
								var index;
								if (slides.length > 0) {
									try {
										index = parseInt($('#add-slide-index').spinner('value'));
									} catch(e) {}
									$('.slideshow-container').dotslide('addSlides', slides, index);
								}
							});
		
		$('#api-slide-count').button()
							.on('click tap', function(event) {
								$('#slide-count').text($('.slideshow-container').dotslide(true) ? $('.slideshow-container').dotslide(true).slideCount() : 'DotSlide not initialized.');
							});
		
		$('#api-current-slide').button({
									icons: {
								        primary: "ui-icon-newwin"
								      }
								}).on('click tap', function(event) {
									$('<div></div>').attr('title', 'Current Slide Information')
													.append($('<p></p>').text($('.slideshow-container').dotslide(true) ? JSON.stringify($('.slideshow-container').dotslide(true).currentSlide() || 'None') : 'DotSlide not initialized.'))
													.dialog({
														modal: true,
														closeOnEscape: true,
														minWidth: 600,
														minHeight: 400,
														buttons: {
															Ok: function() {
																$(this).dialog('close');
															}
														}
													});
								});
		
		$('#api-slide-list').button({
									icons: {
								        primary: "ui-icon-newwin"
								      }
								}).on('click tap', function(event) {
									var dialog = $('<div></div>').attr('title', 'All Slide Information');
									var ds = $('.slideshow-container').dotslide(true);
									if (!ds) {
										dialog.append($('<p></p>').text('DotSlide not initialized.'));
									} else {
										var slides = ds.slides();
										if (slides.length == 0) {
											dialog.append($('<p></p>').text('No slides in slideshow.'));
										} else {
											slides.forEach(function(slide) {
												dialog.append($('<p></p>').text(JSON.stringify(slide)));
											});
										}
									}
									dialog.dialog({
										modal: true,
										closeOnEscape: true,
										minWidth: 600,
										minHeight: 400,
										buttons: {
											Ok: function() {
												$(this).dialog('close');
											}
										}
									});
								});
						
		$('#api-destroy').button()
							.on('click tap', function(event) {
								$('.slideshow-container').dotslide('destroy');
								$('#init-dotslide').val('Initialize');
							});
	});
})(jQuery);