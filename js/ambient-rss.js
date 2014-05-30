var ambientRSS = {};

ambientRSS.defaultTemplate = _.template('<div class="ambient-content-block"><div class="item-thumb"><%= image %></div>' +
    '<div class="item-content"><div class="item-title"><h3><%= title %></h3></div><div class="item-description"><%= description %></div></div></div>');

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

ambientRSS.ContentFeed = Backbone.View.extend({
    initialize: function(options){
        var self = this;
        this.collection = null;
        this.views = [];
        this.$front = $("#front .content-block");
        this.$back = $("#back .content-block");
        $.getFeed({
            url:'http://www.engadget.com/rss.xml',
            success: function(feed){
                self.collection = new Backbone.Collection(feed.items);
                self.render();
            }
        });
        return this;
    },

    render: function(){
        this.collection.each(function(m){
            var test = $("<div>");
            var view = new ambientRSS.ContentElement({model:m, el:test});
            view.render();
            this.views.push(view);
        },this);
    },

    show: function(idx){
        var self = this;
        var inObj = this.views[idx].$el;
        inObj.appendTo(this.$back);
        ambientRSS.transitions.rotateFadeUp(inObj, null, function(){
            self.$front.empty();
            inObj.appendTo(self.$front);
            self.$back.empty();
        })
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


var g_feed;
$(document).ready(function(){
    g_feed = new ambientRSS.ContentFeed({feed: 'http://www.engadget.com/rss.xml'});
});