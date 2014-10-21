/*!
 * Dot Slide jQuery slideshow plugin script
 * v0.0.1
 *
 * Copyright (c) 2014 Malay Biswas
 * Released under MIT License.
 *
 * https://github.com/malaybiswas/jquery.dotslide/blob/master/LICENSE
 *
 * Date: 2014-10-20
 */
function removeProgressIndicator(target) {
	target.find('.dotslide-component.progress-bar').remove();
}

function showProgressIndicator(target) {
	target.append($('<div></div>').addClass('dotslide-component progress-bar')
									.append($('<div></div>').addClass('dotslide-component wheel').html('&#9099;')));
}

(function($) {
	window.DotSlide = function(target, options) {
		this._target = $(target);
		this._autoplay = options.autoplay;
		this._delay = options.delay;
		this._onDestroy = options.onDestroy;
		this._onLoad = options.onLoad;
		this._onPause = options.onPause;
		this._onPlay = options.onPlay;
		this._onSlideChangeStart = options.onSlideChangeStart;
		this._onSlideChangeComplete = options.onSlideChangeComplete;
		this._onUpdate = options.onUpdate;
		this._layout = options.layout;
		if (this._layout !== 'contain' && this._layout !== 'cover') {
			this._layout = 'cover';
		}
		this._transitionAlways = options.transitionAlways;
		this._transitTime = options.transitTime;
		
		this._slides = [];
		this._playing = false;
		this._transitioning = false;
		this._currentSlide = -1;
		
		var self = this;
		this._target.on('dotslide-update-event', function(event) {
						switch(arguments[1]) {
						case 'start':
							self.pause();
							self._updating = true;
							showProgressIndicator(self._target);
							self._disableControls();
							break;
						default:
							self._enableControls();
							DotSlide.prototype._callback.apply(self, Array.prototype.slice.call(arguments,1));
							removeProgressIndicator(self._target);
							self._updating = false;
						}
					}).on('dotslide-transition-event', function(event) {
						switch(arguments[1]) {
						case 'change-start':
							self._transitioning = true;
							self._disableControls();
							break;
						case 'change-complete':
							self._enableControls();
							self._transitioning = false;
							break;
						case 'pause':
							self._target.find('.dotslide-component.control-button.play-button').html('&#9654;')
							self._target.find('.dotslide-component.reel, .dotslide-component.progress > .dotslide-component.bar').finish();
							self._playing = false;
							break;
						case 'play':
							self._playing = true;
							self._target.find('.dotslide-component.reel, .dotslide-component.progress > .dotslide-component.bar').finish();
							self._target.find('.dotslide-component.control-button.play-button').html('&#10073;&nbsp;&#10073')
							break;
						}
						DotSlide.prototype._callback.apply(self, Array.prototype.slice.call(arguments,1));
					});
		
		this._buildStructure();
		
		if (options.transition && DotSlide.transitions[options.transition]) {
			self._transition = options.transition;
		} else {
			self._transition = 'fade';
		}
		this._loadInitialSlides(options.slides);
	}
	
	/*!
	 * ***************************************
	 * Public Methods
	 * ***************************************
	 */
	/*!
	 * Manually add a new slide. New slide cannot be added while initial slides are being added, or other updates are in progress. 
	 * Otherwise method will throw error.
	 * @param slide [required] - 	list of slide objects
	 * @param index [optional] - 	0 based index of the position where the slide is to be inserted. 
	 * 								Slide will be appended at the the end if omitted or provided index is >= size of current slide list
	 */
	DotSlide.prototype.addSlides = function(slides, index) {
		if (!slides || slides.length === 0) {
			return;
		}
		var self = this;
		if (self._updating) {
			throw new Error('Slide attempted to be added while DotSlide is being updated');
		}
		self.pause(function() {
			self._target.trigger('dotslide-update-event', ['start']);
			var promises = [], end;
			slides.forEach(function(slide) {
				var deferred = new $.Deferred();
				self._addSlide(slide, function(resolvedIndex) {
					end = resolvedIndex;
					deferred.resolve();
				}, index);
				promises.push(deferred.promise());
				index++;
			});
			
			$.when.apply(null, promises).done(function() {
				self._target.trigger('dotslide-update-event', ['update','slideAdd', (end - slides.length), slides]);
				self._gotoSlide(end - slides.length + 1);
			});
		});
	};
	
	/*!
	 * Returns the currently displayed slide information
	 * Returns object with 2 properties - 1) slide: slide object 2) index: 0 based index of current slide
	 */
	DotSlide.prototype.currentSlide = function() {
		if (this._currentSlide >= 0 && this._currentSlide < this._slides.length) {
			return this._slides[this._currentSlide];
		}
		return null;
	};
	
	/*!
	 * Destroy the widget
	 */
	DotSlide.prototype.destroy = function() {
		var self = this;
		$.removeData(self._target.get(0), 'dotslide');
		self._target.html('')
					.trigger('dotslide-update-event', ['destroy'])
					.off('resize-dotslide dotslide-update-event dotslide-transition-event')
					.removeClass('dotslide-container dotslide-relative');
	};
	
	/*!
	 * Programmatically go to to a slide. Has no effect if index out of range or dotslide is being updated
	 * @param index [required] - index of slide to go to
	 * @param animate [optional] - boolean whether to apply transition. Default false
	 */
	DotSlide.prototype.gotoSlide = function(index, animate) {
		var self = this;
		if (self._updating || index < 0 || index >= self._slides.length) {
			return;
		}
		self.pause(function() {
			self._gotoSlide(index, animate);
		});
	}
	
	/*!
	 * Pause playing slideshow
	 */
	DotSlide.prototype.pause = function(callback) {
		var self = this;
		if (!self._playing) {
			callback && callback();
			return;
		}
		self._target.on('dotslide-transition-event.pause', function(event) {
			if (arguments[1] === 'change-complete') {
				self._target.off('dotslide-transition-event.pause');
				callback && callback();
			}
		});
		self._target.off('dotslide-transition-event.play');
		self._target.trigger('dotslide-transition-event', ['pause']);
	};
	
	/*!
	 * Start playing slideshow. Play won't begin if method is called while initial slides are being loaded
	 * or any update is in progress.
	 */
	DotSlide.prototype.play = function() {
		var self = this;
		if (self._updating || self._playing) {
			return;
		}

		if (self._transitioning) {
			setTimeout(function() {
				self.play();
			}, self._transitTime || 10);
			return;
		}
		self._target.trigger('dotslide-transition-event', ['play']);
		function wait() {
			DotSlide._requestAnimationFrame(function() {
				self._target.find('.dotslide-component.progress').addClass('active')
																	.children('.dotslide-component.bar').animate({
																		width: '100%'
																	}, {
																		duration: self._delay,
																		always: function() {
																			$(this).width(0)
																					.parent('.dotslide-component.progress').removeClass('active');
																			if (self._playing) {
																				if (self._currentSlide === (self._slides.length - 1)) {
																					self._gotoSlide(0, true);
																				} else {
																					self._gotoSlide(self._currentSlide + 1, true);
																				}
																			}
																		}
																	});
			});
		}
		self._target.on('dotslide-transition-event.play', function(event) {
			if (arguments[1] === 'change-complete') {
				wait();
			}
		});
		wait();
	};
	
	/*!
	 * Returns the current count of slides
	 * CAUTION: Method may return incorrect count if called before all slides are loaded.
	 */
	DotSlide.prototype.slideCount = function() {
		return (this._slides ? this._slides.length : 0);
	};
	
	/*!
	 * Returns the current list of slide objects in order they exist. 
	 * CAUTION: Method may return incomplete list if called before all slides are loaded.
	 */
	DotSlide.prototype.slides = function() {
		return this._slides || [];
	};
	
	/*!
	 * ***************************************
	 * Public Static Methods
	 * ***************************************
	 */
	
	/*!
	 * Add a transition effect. Duplicate name will replace existing transition with same name. 
	 * Throws error if params are missing or invalid
	 * @param name [required] - Name of the transition effect
	 * @param transition [required] - Function that plays the transition. The function will get the current and next slide doms and a function to callback when transition is complete.
	 */
	DotSlide.addTransitionEffect = function(name, transition) {
		if (!name || name.toString().length === 0 || !transition || transition.constructor !== Function) {
			throw new Error('Invalid parameters for adding transition effect');
		}
		
		if (!DotSlide.transitions) {
			DotSlide.transitions = {};
		}
		DotSlide.transitions[name.toString()] = transition;
	};
	
	/*!
	 * Private static method
	 */
	DotSlide._requestAnimationFrame = function(callback) {
		var raf = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
		if (!raf) {
			callback();
			return;
		}
		raf(callback);
	};
	
	/*!
	 * ***************************************
	 * Private Methods
	 * ***************************************
	 */
	
	/*!
	 * Private method to add slide. _addSlide(slide, [callback, [index]])
	 */
	DotSlide.prototype._addSlide = function(slide) {
		var callback, index, self = this;
		
		//process arguments
		if (arguments[1]) {
			if ($.isFunction(arguments[1])) {
				callback = arguments[1];
				index = (arguments[2] !== null && arguments[2] !== undefined && arguments[2] >= 0 && arguments[2] < self._slides.length) ? arguments[2] : self._slides.length;
			} else if ($.type(arguments[1]) === 'number') {
				index = (arguments[1] !== null && arguments[1] !== undefined && arguments[1] >= 0 && arguments[1] < self._slides.length) ? arguments[1] : self._slides.length;
			}
		} else {
			index = self._slides.length;
		}
		
		//add main slide and thumbnail
		var thumbnail = $('<div></div>').addClass('dotslide-component thumbnail cover');
		var photo = $('<div></div>').addClass('dotslide-component slide ' + (slide.layout || self._layout)).css('z-index','-2').hide();
		
		if (index == self._slides.length) {
			self._target.find('.dotslide-component.reel').append(thumbnail);
			self._target.find('.dotslide-component.viewport').append(photo);
			self._slides.push($.extend({},slide));
		} else {
			self._target.find('.dotslide-component.thumbnail:nth-child(' + (index + 1) + ')').before(thumbnail);
			self._target.find('.dotslide-component.slide:nth-child(' + (index + 1) + ')').before(photo);
			self._slides.splice(index, 0, $.extend({},slide));
		}
		
		//reset current slide index
		if (self._currentSlide >= index) {
			self._currentSlide++;
		}
		
		//async load image
		self._loadContent(index, slide.url, callback);
	};
	
	DotSlide.prototype._buildStructure = function() {
		this._target.addClass('dotslide-container')
					.append($('<div></div>').addClass('dotslide-component viewport'))
					.append($('<div></div>').addClass('dotslide-component controls')
											.append($('<div></div>').addClass('dotslide-component reel-control')
																	.append($('<a></a>').addClass('dotslide-component control-button nav-begin').html('&laquo;'))
																	.append($('<a></a>').addClass('dotslide-component control-button nav-prev').html('&lsaquo;'))
																	.append($('<div></div>').addClass('dotslide-component reel-window')
																							.append($('<div></div>').addClass('dotslide-component reel')))
																	.append($('<a></a>').addClass('dotslide-component control-button nav-next').html('&rsaquo;'))
																	.append($('<a></a>').addClass('dotslide-component control-button nav-end').html('&raquo;')))
											.append($('<div></div>').addClass('dotslide-component control-button play-button').html('&#9654;')))
					.append($('<div></div>').addClass('dotslide-component caption'))
					.append($('<div></div>').addClass('dotslide-component progress')
											.append($('<div></div>').addClass('dotslide-component bar'))
											.append($('<div></div>').addClass('dotslide-component glow')));
		if (getComputedStyle(this._target.get(0)).position === 'static') {
			this._target.addClass('dotslide-relative');
		}
	};
	
	/*!
	 * Callback on events
	 */
	DotSlide.prototype._callback = function(eventType) {
		switch(eventType) {
		case 'change-complete':
			this._onSlideChangeComplete && this._onSlideChangeComplete(arguments[1]);
			break;
		case 'change-start':
			this._onSlideChangeStart && this._onSlideChangeStart(arguments[1]);
			break;
		case 'destroy':
			this._onDestroy && this._onDestroy();
			break;
		case 'load':
			this._onLoad && this._onLoad();
			break;
		case 'pause':
			this._onPause && this._onPause();
			break;
		case 'play':
			this._onPlay && this._onPlay();
			break;
		case 'update':
			if (this._onUpdate) {
				switch(arguments[1]) {
				case 'slideAdd':
					this._onUpdate && this._onUpdate(arguments[1], arguments[2], arguments[3]);
					break;
				}
			}
		}
	}
	
	/*!
	 * Disable control buttons
	 */
	DotSlide.prototype._disableControls = function() {
		this._target.find('.dotslide-component.control-button, .dotslide-component.thumbnail').addClass('disabled').off('click tap');
	};
	
	/*!
	 * Enable control buttons
	 */
	DotSlide.prototype._enableControls = function() {
		var self = this;
		
		self._target.find('.dotslide-component.control-button, .dotslide-component.thumbnail').removeClass('disabled').off('click tap');
		self._target.find('.control-button.nav-begin').on('click tap', function(event) {
			if (self._currentSlide > 0) {
				self.pause(function() {
					self._gotoSlide(0);
				});
			}
		});
		self._target.find('.dotslide-component.control-button.nav-prev').on('click tap', function(event) {
			self.pause(function() {
				var current = self._currentSlide;
				if (current > 0) {
					self._gotoSlide(current - 1);
				} else {
					self._gotoSlide(self._slides.length - 1);
				}
			});
		});
		self._target.find('.dotslide-component.control-button.nav-next').on('click tap', function(event) {
			var current = self._currentSlide;
			self.pause(function() {
				if (current < (self._slides.length - 1)) {
					self._gotoSlide(current + 1);
				} else {
					self._gotoSlide(0);
				}
			});
		});
		self._target.find('.dotslide-component.control-button.nav-end').on('click tap', function(event) {
			if (self._currentSlide < (self._slides.length - 1)) {
				self.pause(function() {
					self._gotoSlide(self._slides.length - 1);
				});
			}
		});
		self._target.find('.dotslide-component.control-button.play-button').on('click tap', function(event) {
			if (self._currentSlide <= (self._slides.length - 1)) {
				if (self._playing) {
					self.pause();
				} else {
					self.play();
				}
			}
		});
		self._target.find('.dotslide-component.thumbnail').on('click tap', function(event) {
			if (!$(event.currentTarget).hasClass('disabled')) {
				self.pause(function() {
					self.gotoSlide($(event.currentTarget).index());
				});
			}
		});
		
	};
	
	/*!
	 * Goto a specific slide without or without animation
	 * @param index [required] - 0 based index of the slide to go to
	 * @param animate [optional] - boolean. Default false
	 */
	DotSlide.prototype._gotoSlide = function(index, animate) {
		var self = this;
		
		if (self._transitioning) {
			setTimeout(function() {
				self._gotoSlide(index, animate);
			}, 2000);
			return;
		}
		
		if (self._currentSlide === index) {
			return;
		}
		
		if (self._transitionAlways) {
			animate = true;
		}
		self._target.trigger('dotslide-transition-event', ['change-start', self._currentSlide]);
		
		var currentSlide;
		if (self._currentSlide > -1) {
			currentSlide = self._target.find('.dotslide-component.slide:eq(' + self._currentSlide + ')');
		}
		var nextSlide = self._target.find('.dotslide-component.slide:eq(' + index + ')');
		var nextThumbnail = self._target.find('.dotslide-component.thumbnail:eq(' + index + ')');
		
		//add current class to next thumbnail
		self._target.find('.dotslide-component.thumbnail.current').removeClass('current');
		nextThumbnail.addClass('current');
		
		//move reel in opposite direction
		var reel = self._target.find('.dotslide-component.reel'),
			reelWindow = self._target.find('.dotslide-component.reel-window'),
			reelLeft;
		
		if ((reel.position().left + nextThumbnail.position().left + nextThumbnail.width()) > reelWindow.width()) {
			reelLeft = reel.position().left - (reel.position().left + nextThumbnail.position().left + nextThumbnail.width() - reelWindow.width());
		} else if ((reel.position().left + nextThumbnail.position().left) < 0) {
			reelLeft = 	reel.position().left - (reel.position().left + nextThumbnail.position().left);	
		}
		
		function went() {
			function done() {
				self._currentSlide = index;
				self._target.trigger('dotslide-transition-event', ['change-complete', self._currentSlide]);
			};
			
			nextSlide.css('z-index', '0');
			if (currentSlide && currentSlide.length > 0) {
				currentSlide.css('z-index', '-2').hide(1);
			}
			if (self._slides[index].caption) {
				if (!animate) {
					self._target.find('.dotslide-component.caption').html(self._slides[index].caption)
																	.show(1, done);
				} else {
					self._target.find('.dotslide-component.caption').html(self._slides[index].caption)
																	.fadeIn(done);
				}
			} else {
				if (self._target.find('.dotslide-component.caption').is(':visible')) {
					if (!animate) {
						self._target.find('.dotslide-component.caption').hide(1, done);
					} else {
						self._target.find('.dotslide-component.caption').fadeOut(done);
					}
				} else {
					done();
				}
			}
		};
		
		nextSlide.show(1, function() {
			nextSlide.css('z-index', '-1');
			if (!animate || !currentSlide || currentSlide.length === 0 || !DotSlide.transitions[self._transition]) {
				DotSlide._requestAnimationFrame(function() {
					reel.animate({left: reelLeft}, 1);
					went();
				});
				return;
			}
			DotSlide._requestAnimationFrame(function() {
				reel.animate({left: reelLeft}, self._transitTime);
				DotSlide._requestAnimationFrame(function() {
					DotSlide.transitions[self._transition].apply(self, [currentSlide, nextSlide, went, self._transitTime]);
				});
			});
		});
	};
	
	/*!
	 * Loads the images asynchronously
	 */
	DotSlide.prototype._loadContent = function (index, url, callback) {
		if (!url) {
			if (callback) {
				callback();
			}
			return;
		}
		var self = this;
		var img = new Image();
		img.onload = function() {
			requestAnimationFrame(function() {
   				self._target.find('.slide:eq(' + index + ')').css('background-image', 'url(' + img.src + ')');
   				self._target.find('.thumbnail:eq(' + index + ')').css('background-image', 'url(' + img.src + ')');
   				if (callback) {
   					callback(index);
   				}
			});
		};
		img.onerror = function() {
			if (callback) {
				callback(index);
			}
		};
		img.src = url;
	};
	
	/*!
	 * Preloads initial set of slides
	 */
	DotSlide.prototype._loadInitialSlides = function(slides) {
		if (!slides || slides.length == 0) {
			this._target.trigger('dotslide-update-event', ['load']);
			return;
		}

		var self = this;
		self._target.trigger('dotslide-update-event',['start']);
		
		var promises = [];
		slides.forEach(function(slide, index) {
			var deferred = new $.Deferred();
			self._addSlide(slide, function() {
				deferred.resolve();
			});
			promises.push(deferred.promise());
		});
		
		$.when.apply(null, promises).done(function() {
			self._target.trigger('dotslide-update-event', ['load']);
			self._gotoSlide(0);
			if (self._autoplay) {
				self.play();
			}
		});
	};
	
	/*!
	 * Built in transition effects
	 */
	
	/*!
	 * Bars effect
	 */
	DotSlide.addTransitionEffect('bars', function(currentSlide, nextSlide, transitionComplete, transitTime) {
		var slideNo = (Math.floor(Math.random() * 2) + 1),
			effect = (Math.floor(Math.random() * 2) + 1) === 1 ? 'wave' : 'lock',
			slide = slideNo === 1 ? currentSlide : nextSlide,
			dir;
		
		switch(effect) {
		case 'lock':
			dir = (Math.floor(Math.random() * 2) + 1);
			switch (dir) {
			case 1:
				dir = 'h';
				break;
			case 2:
				dir = 'v';
				break;
			}
			break;
		case 'wave':
			dir = (Math.floor(Math.random() * 4) + 1);
			switch (dir) {
			case 1:
				dir = 'u';
				break;
			case 2:
				dir = 'r';
				break;
			case 3:
				dir = 'd';
				break;
			case 4:
				dir = 'l';
				break;
			}
		}
		
		for(var i = 0; i < 10; i++) {
			var bar = $('<div></div>').css({
											position: 'absolute',
											overflow: 'hidden',
											opacity: 1,
											zIndex: 1,
											width: (dir === 'u' || dir === 'd' || dir === 'v') ? (slide.width()/10) : slide.width(),
											height: (dir === 'l' || dir === 'r' || dir === 'h') ? (slide.height()/10) : slide.height(),
											left: (dir === 'l' || dir === 'r' || dir === 'h') ? 0 : (i*slide.width()/10),
											top: (dir === 'u' || dir === 'd' || dir === 'v') ? 0 : (i*slide.height()/10)
										})
										.applyCSSAnimationDuration(transitTime)
										.addClass('anim')
										.append(slide.clone()
															.width(slide.width())
															.height(slide.height())
															.css({
																position: 'absolute',
																visibility: 'visible',
																left: ((dir === 'u' || dir === 'd' || dir === 'v') ? (-i*slide.width()/10) : 0),
																top: ((dir === 'l' || dir === 'r' || dir === 'h') ? (-i*slide.height()/10) : 0)
															}));
			
			switch(effect) {
			case 'lock':
				if (slideNo === 1) {
					bar.css({
						'transform': 'none',
						'-ms-transform': 'none',
						'-moz-transform': 'none',
						'-o-transform': 'none',
						'-webkit-transform': 'none'
					});
				}
				switch (dir) {
				case 'h':
					if (i%2 === 0) {
						bar.addClass('l');
						if (slideNo === 2) {
							bar.css({
								'transform': 'translateX(100%)',
								'-ms-transform': 'translateX(100%)',
								'-moz-transform': 'translateX(100%)',
								'-o-transform': 'translateX(100%)',
								'-webkit-transform': 'translateX(100%)'
							});
						}
					} else {
						bar.addClass('r');
						if (slideNo === 2) {
							bar.css({
								'transform': 'translateX(-100%)',
								'-ms-transform': 'translateX(-100%)',
								'-moz-transform': 'translateX(-100%)',
								'-o-transform': 'translateX(-100%)',
								'-webkit-transform': 'translateX(-100%)'
							});
						}
					}
					break;
				case 'v':
					if (i%2 === 0) {
						bar.addClass('u');
						if (slideNo === 2) {
							bar.css({
								'transform': 'translateY(100%)',
								'-ms-transform': 'translateY(100%)',
								'-moz-transform': 'translateY(100%)',
								'-o-transform': 'translateY(100%)',
								'-webkit-transform': 'translateY(100%)'
							});
						}
					} else {
						bar.addClass('d');
						if (slideNo === 2) {
							bar.css({
								'transform': 'translateY(-100%)',
								'-ms-transform': 'translateY(-100%)',
								'-moz-transform': 'translateY(-100%)',
								'-o-transform': 'translateY(-100%)',
								'-webkit-transform': 'translateY(-100%)'
							});
						}
					}
				}
				break;
			case 'wave':
				bar.css({
					'animation-delay': (transitTime*i/10) + 'ms',
					'-webkit-animation-delay': (transitTime*i/10) + 'ms',
					'-moz-animation-delay': (transitTime*i/10) + 'ms',
					'-o-animation-delay': (transitTime*i/10) + 'ms',
					'-ms-animation-delay': (transitTime*i/10) + 'ms'
				});
				if (slideNo === 1) {
					bar.css({
						'transform': 'none',
						'-ms-transform': 'none',
						'-moz-transform': 'none',
						'-o-transform': 'none',
						'-webkit-transform': 'none'
					});
				} else {
					switch (dir) {
					case 'l':
						bar.css({
							'transform': 'translateX(100%)',
							'-ms-transform': 'translateX(100%)',
							'-moz-transform': 'translateX(100%)',
							'-o-transform': 'translateX(100%)',
							'-webkit-transform': 'translateX(100%)'
						});
						break;
					case 'r':
						bar.css({
							'transform': 'translateX(-100%)',
							'-ms-transform': 'translateX(-100%)',
							'-moz-transform': 'translateX(-100%)',
							'-o-transform': 'translateX(-100%)',
							'-webkit-transform': 'translateX(-100%)'
						});
						break;
					case 'u':
						bar.css({
							'transform': 'translateY(100%)',
							'-ms-transform': 'translateY(100%)',
							'-moz-transform': 'translateY(100%)',
							'-o-transform': 'translateY(100%)',
							'-webkit-transform': 'translateY(100%)'
						});
						break;
					case 'd':
						bar.css({
							'transform': 'translateY(-100%)',
							'-ms-transform': 'translateY(-100%)',
							'-moz-transform': 'translateY(-100%)',
							'-o-transform': 'translateY(-100%)',
							'-webkit-transform': 'translateY(-100%)'
						});
					}
				}
			}
			bar.appendTo(slide.parent());
			if (i == 9) {
				bar.on('animationend webkitAnimationEnd oanimationend MSAnimationEnd', function() {
					transitionComplete();
					currentSlide.css('visibility', '');
					$('.anim').remove();
				});
			}
		}
		
		if (slideNo === 1) {
			currentSlide.css('visibility', 'hidden');
		}
		$('.anim').addClass('dotslide-bars ' + effect + ' ' + dir + ' ' + (slideNo === 1 ? 'o' : 'i'));
	});
	
	
	/*!
	 * Blinds effect
	 */
	DotSlide.addTransitionEffect('blinds', function(currentSlide, nextSlide, transitionComplete, transitTime) {
		var slideNo = (Math.floor(Math.random() * 2) + 1),
			effect = slideNo === 1 ? 'open' : 'close',
			slide = slideNo === 1 ? currentSlide : nextSlide,
			dir = (Math.floor(Math.random() * 2) + 1) === 1 ? 'h' : 'v',
			to;
		
		slide.parent().addClass('dotslide-threed');
		for(var i = 0; i < 10; i++) {
			to = dir === 'v' ? ((i*10 + 5) + '% 0%') : ('0% ' + (i*10 + 5) + '%');
			
			var bar = $('<div></div>').css({
											position: 'absolute',
											overflow: 'hidden',
											zIndex: 1,
											width: (dir === 'h') ? (slide.width()/10) : slide.width(),
											height: (dir === 'v') ? (slide.height()/10) : slide.height(),
											left: (dir === 'v') ? 0 : (i*slide.width()/10),
											top: (dir === 'h') ? 0 : (i*slide.height()/10),
											'animation-delay': (transitTime*i/10) + 'ms',
											'-webkit-animation-delay': (transitTime*i/10) + 'ms',
											'-moz-animation-delay': (transitTime*i/10) + 'ms',
											'-o-animation-delay': (transitTime*i/10) + 'ms',
											'-ms-animation-delay': (transitTime*i/10) + 'ms',
											'transform': (dir === 'h' ? 'rotateY' : 'rotateX') + (effect === 'open' ? '(0deg)' : '90deg'),
											'-ms-transform': (dir === 'h' ? 'rotateY' : 'rotateX') + (effect === 'open' ? '(0deg)' : '90deg'),
											'-moz-transform': (dir === 'h' ? 'rotateY' : 'rotateX') + (effect === 'open' ? '(0deg)' : '90deg'),
											'-o-transform': (dir === 'h' ? 'rotateY' : 'rotateX') + (effect === 'open' ? '(0deg)' : '90deg'),
											'-webkit-transform': (dir === 'h' ? 'rotateY' : 'rotateX') + (effect === 'open' ? '(0deg)' : '90deg'),
											'opacity': (effect === 'open' ? 1 : 0),
											'-moz-opacity': (effect === 'open' ? 1 : 0),
											'-webkit-opacity': (effect === 'open' ? 1 : 0),
											'-khtml-opacity': (effect === 'open' ? 1 : 0),
											'transform-origin': to,
											'-webkit-transform-origin': to,
											'-moz-transform-origin': to,
											'-o-transform-origin': to,
											'-ms-transform-origin': to
										})
										.applyCSSAnimationDuration(transitTime)
										.addClass('anim dotslide-threed')
										.append(slide.clone()
															.width(slide.width())
															.height(slide.height())
															.css({
																position: 'absolute',
																visibility: 'visible',
																left: (( dir === 'h') ? (-i*slide.width()/10) : 0),
																top: ((dir === 'v') ? (-i*slide.height()/10) : 0)
															}))
										.appendTo(slide.parent());
			
			if (i == 9) {
				bar.on('animationend webkitAnimationEnd oanimationend MSAnimationEnd', function() {
					slide.parent().removeClass('dotslide-threed');
					transitionComplete();
					currentSlide.css('visibility', '');
					$('.anim').remove();
				});
			}
		}
		
		if (slideNo === 1) {
			currentSlide.css('visibility', 'hidden');
		}
		$('.anim').addClass('dotslide-blind ' + effect + ' ' + dir);
	});
	
	/*!
	 * Bounce effect
	 */
	DotSlide.addTransitionEffect('bounce', function(currentSlide, nextSlide, transitionComplete, transitTime) {
		var slideNo = (Math.floor(Math.random() * 2) + 1),
			dir = (Math.floor(Math.random() * 4) + 1),
			slide = slideNo === 1 ? currentSlide : nextSlide;
		
		switch (dir) {
		case 1:
			dir = 'u';
			break;
		case 2:
			dir = 'r';
			break;
		case 3:
			dir = 'd';
			break;
		case 4:
			dir = 'l';
			break;
		}
		
		slide.removeClass('dotslide-bounce u d r l in out dotslide-transparent')
				.off('animationend webkitAnimationEnd oanimationend MSAnimationEnd')
				.on('animationend webkitAnimationEnd oanimationend MSAnimationEnd', function() {
					transitionComplete();
					slide.removeClass('dotslide-bounce u d r l in out')
								.clearCSSAnimationDuration()
								.off('animationend webkitAnimationEnd oanimationend MSAnimationEnd');
				})
				.applyCSSAnimationDuration(transitTime);
		
		slide.addClass('dotslide-bounce ' + dir + (slideNo === 1 ? ' out' : ' in'));
	});
	
	/*!
	 * Fade effect
	 */
	DotSlide.addTransitionEffect('fade', function(currentSlide, nextSlide, transitionComplete, transitTime) {
		var effect = 'fade' + (((Math.floor(Math.random() * 2) + 1) === 1) ? 'in' : 'out'),
			slide = effect === 'fadeout' ? currentSlide : nextSlide;
		
		slide.removeClass('dotslide-fadeout dotslide-fadein dotslide-transparent dotslide-topoftop')
					.off('animationend webkitAnimationEnd oanimationend MSAnimationEnd')
					.on('animationend webkitAnimationEnd oanimationend MSAnimationEnd', function() {
						transitionComplete();
						slide.removeClass('dotslide-fadeout dotslide-fadein dotslide-transparent dotslide-topoftop')
									.clearCSSAnimationDuration()
									.off('animationend webkitAnimationEnd oanimationend MSAnimationEnd');
					})
					.applyCSSAnimationDuration(transitTime);
		switch(effect) {
		case 'fadein':
			slide.addClass('dotslide-transparent')
					.addClass('dotslide-topoftop')
					.addClass('dotslide-fadein');
			break;
		case 'fadeout':
			slide.addClass('dotslide-fadeout');
		}
	});
	
	/*!
	 * Flip effect
	 */
	DotSlide.addTransitionEffect('flip', function(currentSlide, nextSlide, transitionComplete, transitTime) {
		var axis = ((Math.floor(Math.random() * 2) + 1) === 1) ? 'x' : 'y',
			dir = ((Math.floor(Math.random() * 2) + 1) === 1) ? 'c' : 'ac'

		currentSlide.clone().addClass('dotslide-anim front dotslide-threed dotslide-topoftop ' + axis + ' ' + dir).appendTo(currentSlide.parent());
		nextSlide.clone().addClass('dotslide-anim back dotslide-threed dotslide-topoftop ' + axis + ' ' + dir).appendTo(nextSlide.parent());
		currentSlide.parent().addClass('dotslide-threed');
		$('.dotslide-anim.back').on('animationend webkitAnimationEnd oanimationend MSAnimationEnd', function() {
			currentSlide.parent().removeClass('threed');
			transitionComplete();
			$('.dotslide-transparent').removeClass('dotslide-transparent');
			$('.dotslide-anim.back').off('animationend webkitAnimationEnd oanimationend MSAnimationEnd');
			$('.dotslide-anim').remove();
		});
		
		currentSlide.addClass('dotslide-transparent');
		nextSlide.addClass('dotslide-transparent');
		$('.dotslide-anim').applyCSSAnimationDuration(transitTime).addClass('dotslide-flip');
	});
	
	/*!
	 * Random
	 */
	DotSlide.addTransitionEffect('random', function(currentSlide, nextSlide, transitionComplete, transitTime) {
		var randomIndex = Object.keys(DotSlide.transitions).indexOf('random');
		
		var transitionIndex = Math.floor(Math.random() * Object.keys(DotSlide.transitions).length);
		
		if (transitionIndex === randomIndex) {
			if (transitionIndex === (Object.keys(DotSlide.transitions).length - 1)) {
				transitionIndex--;
			} else {
				transitionIndex++;
			}
		}
		DotSlide._requestAnimationFrame(function() {
			DotSlide.transitions[Object.keys(DotSlide.transitions)[transitionIndex]].apply(this, [currentSlide, nextSlide, transitionComplete, transitTime]);
		});
	});
	/*!
	 * Rotate effect
	 */
	DotSlide.addTransitionEffect('rotate', function(currentSlide, nextSlide, transitionComplete, transitTime) {
		var effect = 'dotslide-rotate-' + (((Math.floor(Math.random() * 2) + 1) === 1) ? 'right' : 'left');
		currentSlide.removeClass('dotslide-rotate-right1 dotslide-rotate-left1')
					.parent().addClass('dotslide-threed');
		
		nextSlide.removeClass('dotslide-rotate-right2 dotslide-rotate-left2 dotslide-transparent dotslide-topoftop')
				.addClass('dotslide-transparent')
				.addClass('dotslide-topoftop')
				.off('animationend webkitAnimationEnd oanimationend MSAnimationEnd')
				.on('animationend webkitAnimationEnd oanimationend MSAnimationEnd', function() {
					nextSlide.parent().removeClass('dotslide-threed');
					transitionComplete();
					currentSlide.removeClass('dotslide-rotate-right1 dotslide-rotate-left1');
					nextSlide.removeClass('dotslide-rotate-right2 dotslide-rotate-left2 dotslide-transparent dotslide-topoftop')
							.clearCSSAnimationDuration()
							.off('animationend webkitAnimationEnd oanimationend MSAnimationEnd');
				})
				.applyCSSAnimationDuration(transitTime);
		currentSlide.addClass(effect + '1');
		nextSlide.addClass(effect + '2');
	});
	
	/*!
	 * Zoom effect
	 */
	DotSlide.addTransitionEffect('zoom', function(currentSlide, nextSlide, transitionComplete, transitTime) {
		var slideNo = (Math.floor(Math.random() * 2) + 1),
			effect = 'dotslide-zoom' + (((Math.floor(Math.random() * 2) + 1) === 1) ? 'in' : 'out') + slideNo,
			slide = slideNo === 1 ? currentSlide : nextSlide;
		slide.parent().addClass('dotslide-threed');
		slide.removeClass('dotslide-zoomin1 dotslide-zoomout1 dotslide-zoomin2 dotslide-zoomout2 dotslide-transparent dotslide-topoftop')
				.off('animationend webkitAnimationEnd oanimationend MSAnimationEnd')
				.on('animationend webkitAnimationEnd oanimationend MSAnimationEnd', function() {
					slide.parent().removeClass('dotslide-threed');
					transitionComplete();
					slide.removeClass('dotslide-zoomin1 dotslide-zoomout1 dotslide-zoomin2 dotslide-zoomout2 dotslide-transparent dotslide-topoftop')
							.clearCSSAnimationDuration()
							.off('animationend webkitAnimationEnd oanimationend MSAnimationEnd');
				})
				.applyCSSAnimationDuration(transitTime);
		if (slideNo == 2) {
			slide.addClass('dotslide-transparent')
					.addClass('dotslide-topoftop');
		}
		slide.addClass(effect);
	});
	
	/*
	 * Adds css animation duration
	 */
	$.fn.applyCSSAnimationDuration = function(transitTime) {
		this.each(function() {
			$(this).css({
				'animation-duration': transitTime + 'ms',
				'-ms-animation-duration': transitTime + 'ms',
				'-moz-animation-duration': transitTime + 'ms',
				'-o-animation-duration': transitTime + 'ms',
				'-webkit-animation-duration': transitTime + 'ms'
			});
		});
		return this;
	}
	
	/*
	 * Removes css animation duration
	 */
	$.fn.clearCSSAnimationDuration = function() {
		this.each(function() {
			$(this).css({
				'animation-duration': '',
				'-ms-animation-duration': '',
				'-moz-animation-duration': '',
				'-o-animation-duration': '',
				'-webkit-animation-duration': ''
			});
		});
		return this;
	}
	
	$.fn.dotslide = function(options) {
		if (options === true) {
			return this.data('dotslide');
		}
	    if (typeof options == 'string') {
			var args = arguments;
	    	this.each(function() {
		        var dotSlide = $.data(this, 'dotslide');
		        if (dotSlide) {
		        	DotSlide.prototype[options].apply(dotSlide,Array.prototype.slice.call(args, 1));
		        }
	    	});
	        return this;
	    }

        options = $.extend({},$.fn.dotslide.defaults, options);
        
        this.each(function() {
			if (!$.data(this, 'dotslide')) {
				$.data(this, 'dotslide', new DotSlide(this, options));
			}
        });
        
        return this;
	};
	
	$.fn.dotslide.defaults = {
			autoplay: false,
			delay: 4000,
			layout: 'cover',
			onDestroy: null,
			onLoad: null,
			onPause: null,
			onPlay: null,
			onSlideChangeStart: null,
			onSlideChangeComplete: null,
			onUpdate: null,
			slides: null,
			transition: 'fade',
			transitTime: 1000,
			transitionAlways: false
	};
})(jQuery);
