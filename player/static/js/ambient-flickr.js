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
        this.pages = response.photos.pages;
        this.page = response.photos.page;
        return response.photos.photo;
    }
});

ambientRSS.flickr.FlickrTagsBackground = Backbone.View.extend({
    el: "#ambient-flickr",

    initialize: function(options){
        _.bindAll(this, "advance", "start", "stop");
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

        //create the collections
        this.backCollection = new ambientRSS.flickr.SearchImageCollection();
        this.backCollection.url = this.getSearchUrl();
        this.backCollection.fetch({success:this.start});
        this.swapCollection();
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
    setText: function(texts){
        this.texts = texts.join();
    },

    /* Helper method that gets the search url for the collection */
    getSearchUrl: function(){
        //build an object to serialize
        var searchArgs = {
            license: [5,6,7].join(), //the legally public ones
        };
        if(this.tags != ''){
            searchArgs.tags = this.tags;
        }
        if(this.texts != ''){
            searchArgs.texts = this.texts;
        }
        //default catch all... at least show a pretty picture of skys
        if(this.tags == '' && this.texts == ''){
            searchArgs.texts = 'sky';
        }
        console.log(ambientRSS.flickr.searchUrl + "&" + $.param(searchArgs));
        return ambientRSS.flickr.searchUrl + "&" + $.param(searchArgs);
    }
});

ambientRSS.flickr.FlickrWeatherBackground = ambientRSS.flickr.FlickrTagsBackground.extend({

    initialize: function(options){
        options = options || {};
        this.setCity(options.city || 'San Jose, CA');
        this.superInit = false;
        return this;
    },

    /* Sets the city for the current flickr weather background */
    setCity: function(city){
        this.city = city;
        this.url = ambientRSS.flickr.weatherAPI + $.param({q:this.city});
        this.refreshCityData();
        return this;
    },

    /* Refreshes the weather and sets the internal tags to match the data */
    refreshWeather: function(){
        var self = this;
        var weather = new Backbone.Model();
        weather.fetch({
            url: this.url,
            success: function(){
                var model;
                if(self.superInit){

                }else{
                    self.superInit = true;
                    ambientRSS.flickr.FlickrTagsBackground.prototype.initialize.apply(this, {text:flickrStr});
                }
            }
        })
    }
});

