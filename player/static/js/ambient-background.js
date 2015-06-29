//create a new namespace
/*
ambientRSS.flickr = {};

ambientRSS.flickr.contentOnTime = 10000; //ms
ambientRSS.flickr.transitionTime = 2000; //ms
ambientRSS.flickr.apiKey = 'd2bdfdb0f34638eeda75033ee075e252';
ambientRSS.flickr.searchUrl = 'https://www.flickr.com/services/rest/?method=flickr.photos.search&format=json&nojsoncallback=1&api_key=' + ambientRSS.flickr.apiKey;
ambientRSS.flickr.imageTemplate = _.template('//farm<%= farm %>.staticflickr.com/<%= server %>/<%= id %>_<%= secret %>_b.jpg');
ambientRSS.flickr.weatherAPI = 'http://api.openweathermap.org/data/2.5/weather?';

ambientRSS.flickr.SearchImageCollection = Backbone.Collection.extend({
    parse: function(response){
        console.log(response);
        this.pages = response.photos.pages;
        this.page = response.photos.page;
        return _.filter(response.photos.photo, function(a){ return a.ispublic });
    }
});
*/


ambientRSS.FiveHundredPxPhotoCollection = Backbone.Collection.extend({
    parse: function(rsp){
        return rsp.photos
    }
});

ambientRSS.BackgroundImageFader = Backbone.View.extend({
    initialize: function(options){
        _.bindAll(this, "advance", "start", "stop");
        return this;
    },

    addImage: function(imageURL){
        var self = this;
        var img = new Image();
        //error checking for image URL
        img.onload = function(){
            //see if image already exists in queue already and don't add if it is
            var backgroundCss = 'url("' + imageURL + '")';
            if(self.$el.children().filter(function(){
                    return $(this).css('background-image') == backgroundCss;
                }).length > 0){
                return;
            }
            var div = $("<div>");
            div.css("background-image", backgroundCss).hide();
            self.$el.append(div);
            self.trigger("image-loaded",imageURL);
        };
        //initialize the load
        img.src = imageURL;
        return this;
    },


    /* Controls the index and moves the feed along.  This manages updating views.  It is this function
     * that gets attached to a interval driven timer
     */
    advance: function(){
        var first = this.$el.children().first();
        var next = first.next();
        //notify others by throwing a signal
        if(next.length <= 0){
            this.trigger("empty-image-queue");
        }

        //start the removal process
        ambientRSS.transitions.fade(next, first, function(){
            first.remove();
        });

        //show the things that are suppose to be shown. This assumes show() only affects display and not opacity
        first.show();
        next.show();
    },

    start: function(){
        this.stop();
        //starts the advancement
        this.advance();
        this.contentFlipInterval = setInterval(this.advance, ambientRSS.contentOnTime * 5);
        return this;
    },

    stop: function(){
        if(this.contentFlipInterval){
            clearInterval(this.contentFlipInterval);
        }
        return this;
    }
});

/*
A image fader background that uses five hunder pixel images. Pass query options to fetch. Defaults to
editors choice images.
 */
ambientRSS.FiveHundredPxPhotoBackgroundSimple = ambientRSS.BackgroundImageFader.extend({
    consumerKey: "14JslGKbF2RRDoiSJgQz2Zmw1CIVkspPGtMVIFrH",
    photoApi: "https://api.500px.com/v1/photos?",

    //constructor that just instantiates a background image fader and a collection
    initialize: function(options){
        ambientRSS.BackgroundImageFader.prototype.initialize.apply(this, arguments);
        _.bindAll(this, "fetch");
        this.collection = new ambientRSS.FiveHundredPxPhotoCollection();
        options = options || {};
        this.fetchOptions = options.fetch || {};

        //sets a signal to the view so that when we run out of images we fetch more
        var self = this;
        this.on("empty-image-queue", function(){
            this.fetch(self.fetchOptions);
        });
        this.on("finished-adding-images", function(){
            this.start()
        });
        return this;
    },

    //uses the api to fetch the images
    fetch: function(options){
        //first assign the consumer key
        options = options || this.fetchOptions;
        options.consumer_key = this.consumerKey;

        //now set some defaults
        options.feature = options.feature || "editors";
        options.image_size = options.image_size || 2048;
        options.sort= options.sort || "created_at";
        options.rpp = options.rpp || 25;

        var self=this;
        this.collection.fetch({
            url: this.photoApi + $.param(options),
            success:function(c) {
                c.each(function (m,idx) {
                    self.addImage(m.get("image_url"));
                });
                self.trigger("finished-adding-images");
            }
        });
    }
});

/*
ambientRSS.flickr.FlickrWeatherBackground = ambientRSS.flickr.FlickrTagsBackground.extend({

    initialize: function(options){
        options = options || {};
        //the super classes constructor is called in refreshWeather
        //filter out some stupid stuff from flickr
        //this.setTags(["-fantasy", "-face", "-eyes", "-ufo"]);
        this.setCity(options.city || 'San Jose, CA');
        //call super constructor
        ambientRSS.flickr.FlickrTagsBackground.prototype.initialize.apply(this);
        return this;
    },

    // Sets the city for the current flickr weather background
    setCity: function(city){
        this.city = city;
        this.url = ambientRSS.flickr.weatherAPI + $.param({q:this.city});
        this.refreshWeather();
        return this;
    },

    // Refreshes the weather and sets the internal tags to match the data
    refreshWeather: function(){
        var self = this;
        var weather = new Backbone.Model();
        weather.fetch({
            url: this.url,
            success: function(model){
                var data = model.toJSON();
                var texts = data.weather[0].description.split(" ");

                //calculate time of day
                var sunrise = data.sys.sunrise;
                var sunset = data.sys.sunset;
                var now = new Date().getTime() * 0.001;
                var tod = "";
                if(now > sunset || now < sunrise){
                    tod = "night";
                }
                //ok now there's some sun
                if(now > sunrise && now < sunset){
                    var totalSun = sunset - sunrise;
                    var percentSun = (now-sunrise) / totalSun;
                    console.log(now, totalSun, percentSun);
                    if(percentSun < 0.9) tod = "dusk";
                    if(percentSun < 0.7) tod = "day -night";
                    if(percentSun < 0.55) tod = "noon";
                    if(percentSun < 0.4) tod = "morning";
                    if(percentSun < 0.15) tod = "dawn";
                }
                texts.push(tod);

                self.setTexts(texts);
                self.start();
            }
        })
    }
});
*/
