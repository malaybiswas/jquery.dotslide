# jQuery DotSlide

DotSlide is a jquery slideshow plugin for photos. It does not require extensive preset DOM structure and exposes a set of API to interact with. It provides event callback handling options and allows you to add custom transition effects in your implementation.

#Features

* Easy to implement with minimal pre-requisite DOM structure
* Many ways to configure
* Fully responsive
* APIs for programmatic interactions
* Event callbacks
* Extensible - add your own effects
* Supports most modern browsers and devices

#Checkout the [demo](http://malaybiswas.github.io/jquery.dotslide/)
Play around with the options, API and events.

#Basic Installation

## Step 1 - Add the scripts and stylesheet

Add jquery and DotSlide scripts in the page. DotSlide has been tested on jquery 2.0.2 and higher.

````html
<script type='text/javascript' src='http://ajax.googleapis.com/ajax/libs/jquery/2.0.2/jquery.min.js'></script>
<script type='text/javascript' src='<path_to_js>/jquery.dotslide-0.0.1.min.js'></script>
<link rel='stylesheet' type='text/css' href='<path_to_css>/jquery.dotslide-0.0.1.min.css'>
````

## Step 2 - Setup HTML markup

Add a container for slideshow.

````html
<div class='dotslide-container'></div>
````

## Step 3 - Initialize DotSlide

Since the slide images are passed to the plugin at the time of initilization, DotSlide can be initialized when the document is loaded or after a ajax or websocket response is received.

````javascript
$('.dotslide-container').dotslide({
   slides: [
        {url: '<path_to_image>'},
        {url: '<path_to_image>'},
        {url: '<path_to_image>'}
       ] 
});
````
#Documentation

Read the full documentation at [http://malay.breecz.com/page/5/2/4/jQuery-DotSlide-Plugin](http://malay.breecz.com/page/5/2/4/jQuery-DotSlide-Plugin).
