var ambientRSS = {};
ambientRSS.refreshContentTime = 100000; //seconds before each refresh of a feed.
ambientRSS.contentOnTime = 7000;
ambientRSS.refreshContentMaxIgnore = 50; //If there is this many queued up, it will ignore further updates.

ambientRSS.templateContent = function(){ return "" };

/* A class that represents a specific content element.  Mostly this just renders using a predefined template */
ambientRSS.ContentElement = Backbone.View.extend({
    render: function(){
        var dataJSON = this.model.toJSON();
        //extract out the image to make sure it's in the right place
        var $description = $('<div>').append(dataJSON.description);
        var $img = $description.find("img");
        if($img.length){
            $img.detach();
            if(!dataJSON.image){
                dataJSON.image = $('<div>').append($img[0]).html();
            }
            dataJSON.description = $description.html();
        }
        this.$el.html(ambientRSS.templateContent(dataJSON));
        return this;
    },

    destroy: function(){
        this.$el.remove();
        return this;
    }
});


ambientRSS.FeedItemModel = Backbone.Model.extend({
    idAttribute: ""
});


/* A collection used for syncronizing with RSS XML */
ambientRSS.FeedCollection = Backbone.Collection.extend({
    initialize: function(models, options){
        _.bindAll(this, "fetch");
        options = options || {};
        this.url = options.url;

        return this;
    },

    start: function(){
        this.interval = setInterval(this.fetch, ambientRSS.refreshContentTime);
        return this;
    },

    end: function(){
        window.clearInterval(this.interval);
        return this;
    },

    fetch: function(options){
        options = options || {};
        options.success = options.success || function(){};
        var self = this;
        $.getFeed({
            url: options.url || this.url,
            success: function(feed){
                self.add(feed.items, {merge:true});
                options.success.call(self);
            }
        });
    }
});


/* A class that stores the overall view to call feeds and views within that feed */
ambientRSS.ContentFeed = Backbone.View.extend({
    initialize: function(options){
        _.bindAll(this, "advance", "start", "updateViews");
        var self = this;
        this.feeds = [];
        this.newViewQueue = [];
        return this;
    },

    //Adds a feed from an rss url.
    addFeed: function(feedUrl){
        var newFeedCollection = new ambientRSS.FeedCollection([],{url: feedUrl});
        newFeedCollection.start();
        this.feeds.push(newFeedCollection);
    },

    updateViews: function(){
        var self = this;
        if(this.$el.children().length > ambientRSS.refreshContentMaxIgnore){
            return this;
        }
        _.each(this.feeds, function(feed){
            feed.each(function(m){
                var view = new ambientRSS.ContentElement({model:m});
                this.$el.append(view.$el);
                //initially hidden
                view.$el.hide();
                view.render();
                self.newViewQueue.push(view);
            }, this);
        }, this);
        return this;
    },

    /* Controls the index and moves the feed along.  This manages updating views.  It is this function
     * that gets attached to a interval driven timer
     */
    advance: function(){
        var first = this.$el.children().first();
        var next = first.next();
        ambientRSS.transitions.rotateFadeUp(next.find(".content-block"), first.find(".content-block"), function(){
            first.remove();
        });
        first.show();
        next.show();
    },

    start: function(){
        this.stop();
        //starts the advancement
        this.updateViews();
        this.advance();
        this.contentFlipInterval = setInterval(this.advance, ambientRSS.contentOnTime);
        this.refreshContentInterval = setInterval(this.updateViews, ambientRSS.contentOnTime*5);
        return this;
    },

    stop: function(){
        if(this.contentFlipInterval){
            clearInterval(this.contentFlipInterval);
        }
        if(this.refreshContentInterval){
            clearInterval(this.refreshContentInterval);
        }
        return this;
    }
});


/* Transitional functions */
ambientRSS.transitions = {};
ambientRSS.transitions.transforms = {};

ambientRSS.transitions.wrapElement = function(el){
    $(el).wrap("<div></div>");
    var ret = $(el).parent();
    ret.addClass("transition-wrapper");
    return ret;
};

/* Does a 3d rotation centered around the element's center of gravity.  Works in a single axis */
ambientRSS.transitions.transforms.rotate3d = function(el, options){
    var opts = options || {};
    opts.to = opts.to || 90; //degrees
    opts.from = opts.from || 0; //degrees
    opts.duration = opts.duration || 1.0; //seconds
    opts.axis = opts.axis || "Y";
    opts.easing = opts.easing || "out";

    var $el =ambientRSS.transitions.wrapElement(el);

    //setup initial conditions
    $el.css("perspective", "2000px").css("perspective-origin", "50% 50%");
    $el.css("rotate" + opts.axis, opts.from + "deg");

    var rotate = {
        easing: opts.easing,
        duration: opts.duration * 1000,
        complete: opts.complete || function(){}
    };
    rotate["rotate"+opts.axis] = opts.to;
    return $el.transition(rotate);
};

/* Does a fade effect using total opacity */
ambientRSS.transitions.transforms.fade = function(el, options){
    var opts = options || {};
    opts.to = opts.to || 0.0;
    opts.from = opts.from || 1.0;
    opts.duration = opts.duration || 1.0; //seconds
    opts.easing = opts.easing || "out";

    var $el =ambientRSS.transitions.wrapElement(el);

    $el.css("opacity", opts.from);
    return $el.transition({
        duration: opts.duration * 1000,
        opacity: opts.to,
        easing: opts.easing,
        complete: opts.complete || function(){}
    });
};

/* Does a fade effect using total opacity */
ambientRSS.transitions.transforms.move3d = function(el, options){
    var opts = options || {};
    opts.to = opts.to || [0,200];
    opts.from = opts.from || [0,0];
    opts.duration = opts.duration || 1.0; //seconds
    opts.easing = opts.easing || "out";

    var $el =ambientRSS.transitions.wrapElement(el);
    $el.css({x: opts.from[0], y: opts.from[1]});

    var data = {
        easing: opts.easing,
        duration: opts.duration * 1000,
        x: opts.to[0],
        y: opts.to[1],
        complete: opts.complete || function(){}
    };
    return $el.transition(data);
};

ambientRSS.transitions.fadeUp = function(inObj, outObj, complete){
    ambientRSS.transitions.transforms.move3d(inObj, {to:[0,0], from:[0,-500]});
    ambientRSS.transitions.transforms.move3d(outObj,{to:[0,500], from:[0,0]});
    ambientRSS.transitions.transforms.fade(outObj);
    ambientRSS.transitions.transforms.fade(inObj, {to:1.0, from:0.01, complete: complete});
};

ambientRSS.transitions.rotateFadeUp = function(inObj, outObj, complete){
    ambientRSS.transitions.transforms.rotate3d(outObj);
    ambientRSS.transitions.transforms.rotate3d(inObj, {to: 0.01, from: 90});
    ambientRSS.transitions.fadeUp(inObj, outObj, complete);
};

