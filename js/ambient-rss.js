var ambientRSS = {};

ambientRSS.defaultTemplate = _.template('<div class="ambient-content-block"><div class="thumb"><%= image %></div>' +
    '<div class="ambient-title"><%= title %></div><div class="ambient-description"><%= description %></div></div>');

ambientRSS.ContentElement = Backbone.View.extend({
    template: ambientRSS.defaultTemplate,
    render: function(){
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    }
});

var g_feed;
$(document).ready(function(){
    $.getFeed({
        url:'http://www.engadget.com/rss.xml',
        success: function(feed){
            g_feed=feed;
            var col = new Backbone.Collection(feed.items);
            col.each(function(m){
                var test = $("<div>").appendTo("#tester");
                var view = new ambientRSS.ContentElement({model:m, el:test});
                view.render();
            });
        }
    });
});