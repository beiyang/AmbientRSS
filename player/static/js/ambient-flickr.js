//create a new namespace
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

ambientRSS.flickr.FlickrTagsBackground = Backbone.View.extend({
    el: "#ambient-flickr",

    initialize: function(options){
        _.bindAll(this, "advance", "start", "stop", "startHelper");
        //internal state
        this.colIdx = 0;

        //default tag
        this.tags = '';
        this.texts = '';

        //create our front and back div
        this.$back = this.$(".flickr-front");
        this.$front = this.$(".flickr-back");

        //predfined options and or tags
        options = options || {};
        if(options.tags) this.setTags(options.tags);
        if(options.texts) this.setTexts(options.texts);

        //default values
        this.backCollection = new ambientRSS.flickr.SearchImageCollection();
        this.frontCollection = new ambientRSS.flickr.SearchImageCollection();
        return this;
    },

    /* Swaps the collections and creates a new one to update photos */
    swapCollection: function(){
        this.frontCollection = this.backCollection;
        this.backCollection = new ambientRSS.flickr.SearchImageCollection();
        this.backCollection.url = this.getSearchUrl();
        this.backCollection.fetch();
        return this;
    },

    /* Advances one image in the current collection and does a fade transition */
    advance: function(){
        //sanity check
        if(this.frontCollection.length==0 || this.colIdx >= this.frontCollection.length){
            return this;
        }
        var self = this;
        //create a new url
        var url=ambientRSS.flickr.imageTemplate(this.frontCollection.at(this.colIdx).toJSON());
        this.$front.css('background-image', this.$back.css('background-image')).css('opacity', 1);
        this.$back.css('background-image', 'url("' + url + '")');
        this.$el.waitForImages({
            finished: function(){
                self.$front.transition({opacity:0, duration:ambientRSS.flickr.transitionTime});
            },
            waitForAll: true
        });

        //increment the index
        this.colIdx++;
        if(this.colIdx >= this.frontCollection.length){
            this.swapCollection();
            this.colIdx = 0;
        }
        return this;
    },

    start: function(){
        var self = this;

        //create the collections
        this.backCollection = new ambientRSS.flickr.SearchImageCollection();
        this.backCollection.url = this.getSearchUrl();
        this.backCollection.fetch({success:this.startHelper});
        this.swapCollection();
    },

    startHelper: function(){
        this.stop();
        //starts the advancement
        this.currentViewIdx = 0;
        this.advance();
        this.interval = setInterval(this.advance, ambientRSS.flickr.contentOnTime);
        return this;
    },

    stop: function(){
        if(this.interval){
            clearInterval(this.interval);
        }
        return this;
    },

    /* Sets internal tags to search flickr for.  Expects a list of tags */
    setTags: function(tags){
        this.tags = tags.join();
        return this;
    },

    /* Sets internal free text search.  Expects a list of text strings. - for negation */
    setTexts: function(texts){
        this.texts = texts.join(" ");
    },

    /* Helper method that gets the search url for the collection */
    getSearchUrl: function(){
        //build an object to serialize
        var searchArgs = {
            //license: [4,5].join(), //the legally public ones
            sort: "relevance",
            //tag_mode: "any",
            content_type: 1
        };
        if(this.tags != ''){
            searchArgs.tags = this.tags;
        }
        if(this.texts != ''){
            searchArgs.text = this.texts;
        }
        //default catch all... at least show a pretty picture of skys
        if(this.tags == '' && this.texts == ''){
            searchArgs.texts = 'sky';
        }
        console.log(searchArgs);
        return ambientRSS.flickr.searchUrl + "&" + $.param(searchArgs);
    }
});

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

    /* Sets the city for the current flickr weather background */
    setCity: function(city){
        this.city = city;
        this.url = ambientRSS.flickr.weatherAPI + $.param({q:this.city});
        this.refreshWeather();
        return this;
    },

    /* Refreshes the weather and sets the internal tags to match the data */
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

