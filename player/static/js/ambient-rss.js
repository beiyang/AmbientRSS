var ambientRSS = {};
ambientRSS.refreshContentTime = 100000; //seconds
ambientRSS.contentOnTime = 7000;

ambientRSS.defaultTemplate = _.template('<div class="ambient-content-block"><div class="item-thumb"><%= image %></div>' +
    '<div class="item-content"><div class="item-title"><h3><%= title %></h3></div><div class="item-description"><%= description %></div></div></div>');

/* A class that represents a specific content element.  Mostly this just renders using a predefined template */
ambientRSS.ContentElement = Backbone.View.extend({
    template: ambientRSS.defaultTemplate,
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
        this.$el.html(this.template(dataJSON));
        return this;
    },

    destroy: function(){
        this.$el.remove();
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

        //automatically check for udpates
        setInterval(this.fetch, ambientRSS.refreshContentTime);
        return this;
    },

    fetch: function(options){
        options = options || {};
        options.success = options.success || function(){};
        var self = this;
        $.getFeed({
            url: options.url || this.url,
            success: function(feed){
                self.add(feed.items);
                options.success.call(self);
            }
        });
    }
});


/* A class that stores the overall view to call feeds and views within that feed */
ambientRSS.ContentFeed = Backbone.View.extend({
    initialize: function(options){
        _.bindAll(this, "advance", "start");
        var self = this;
        this.currentViewIdx = 0;
        this.feeds = [];
        this.viewQueue = [];
        this.newViewQueue = [];
        this.currentView = null;
        this.$front = $("#front .content-block");
        this.$back = $("#back .content-block");
        return this;
    },

    addFeed: function(feed){
        this.feeds.push(feed);
    },

    flipViews: function(){
        this.viewQueue = this.newViewQueue;
        this.newViewQueue = [];
    },

    updateViews: function(view){
        var self = this;
        _.each(this.feeds, function(feed){
            feed.each(function(m){
                var viewEl = $("<div>");
                var view = new ambientRSS.ContentElement({model:m, el:viewEl});
                view.render();
                self.newViewQueue.push(view);
            });
        });
    },

    /* Controls the index and moves the feed along.  This manages updating views.  It is this function
     * that gets attached to a interval driven timer
     */
    advance: function(){
        this.show(this.currentViewIdx);
        this.currentViewIdx++;

        if(this.viewQueue.length <= this.currentViewIdx){
            this.flipViews();
            this.currentViewIdx = 0;
            this.updateViews();
        }
    },

    start: function(){
        //starts the advancement
        this.updateViews();
        this.flipViews();
        this.currentViewIdx = 0;
        this.advance();
        this.interval = setInterval(this.advance, ambientRSS.contentOnTime);
        return this;
    },

    stop: function(){
        if(this.interval){
            clearInterval(this.interval);
        }
        return this;
    },


    /* Shows a view in the current stack of available views */
    show: function(idx){
        if(this.viewQueue.length == 0) return;
        idx = idx % this.viewQueue.length;
        var self = this;
        //do the transition in from the back plane
        var inObj = this.viewQueue[idx].$el;
        inObj.appendTo(this.$back);

        //do the transition out in the front plane... it should already be in the front plane
        var outObj = null;
        if(this.currentView){
            outObj = this.currentView.$el;
        }
        ambientRSS.transitions.rotateFadeUp(inObj, outObj, function(){
            if(outObj){
                outObj.detach();
            }
            //empty the front store and pop it form the back
            self.$front.empty();
            inObj.appendTo(self.$front);
            self.$back.empty();

            //store the current view and remove pop it from the stack
            self.currentView = self.viewQueue[idx];
        });
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
}
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
}

ambientRSS.transitions.rotateFadeUp = function(inObj, outObj, complete){
    ambientRSS.transitions.transforms.rotate3d(outObj);
    ambientRSS.transitions.transforms.rotate3d(inObj, {to: 0.01, from: 90});
    ambientRSS.transitions.fadeUp(inObj, outObj, complete);
}

