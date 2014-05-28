/* jFeed : jQuery feed parser plugin
 * Copyright (C) 2007 Jean-François Hovinne - http://www.hovinne.com/
 * Modifications (C) 2013 Scott Webber, Roovy, Inc. - http://roovy.com
 * Dual licensed under the MIT (MIT-license.txt)
 * and GPL (GPL-license.txt) licenses.
 */
(function(window, undefined) {

jQuery.getFeed = function(options) {

    options = jQuery.extend({

        url: null,
        data: null,
        cache: true,
        success: null,
        failure: null,
        error: null,
        global: true

    }, options);

    if (options.url) {

        if (jQuery.isFunction(options.failure) && jQuery.type(options.error)==='null') {
          // Handle legacy failure option
          options.error = function(xhr, msg, e){
            options.failure(msg, e);
          }
        } else if (jQuery.type(options.failure) === jQuery.type(options.error) === 'null') {
          // Default error behavior if failure & error both unspecified
          options.error = function(xhr, msg, e){
            window.console&&console.log('getFeed failed to load feed', xhr, msg, e);
          }
        }

        return jQuery.ajax({
            type: 'GET',
            url: options.url,
            data: options.data,
            cache: options.cache,
            dataType: 'xml',
            success: function(xml) {
                var feed = new JFeed(xml);
                if (jQuery.isFunction(options.success)) options.success(feed);
            },
            error: options.error,
            global: options.global
        });
    }
};

function JFeed(xml) {
    if (xml) this.parse(xml);
}
;

JFeed.prototype = {

    type: '',
    version: '',
    title: '',
    link: '',
    description: '',
    parse: function(xml) {

        if (jQuery('channel', xml).length == 1) {

            this.type = 'rss';
            var feedClass = new JRss(xml);

        } else if (jQuery('feed', xml).length == 1) {

            this.type = 'atom';
            var feedClass = new JAtom(xml);
        }

        if (feedClass) jQuery.extend(this, feedClass);
    }
};

    // Expose JFeed to the global object
    window.JFeed = JFeed;

})(window);
function JFeedItem() {};

JFeedItem.prototype = {

    author: '',
    content: '',
    coordinates: null,
    description: '',
    enclosure: null,
    image: null,
    id: '',
    link: '',
    title: '',
    updated: ''
};

function JAtom(xml) {
    this._parse(xml);
};

JAtom.prototype = {

    _parse: function(xml) {

        var channel = jQuery('feed', xml).eq(0);

        this.version = '1.0';
        this.title = jQuery(channel).find('title:first').text();
        this.link = jQuery(channel).find('link:first').attr('href');
        this.description = jQuery(channel).find('subtitle:first').text();
        this.language = jQuery(channel).attr('xml:lang');
        this.updated = jQuery(channel).find('updated:first').text();

        this.items = new Array();

        var feed = this;

        jQuery('entry', xml).each( function() {

            var item = new JFeedItem();
            var t = jQuery(this);

            item.title = t.find('title').eq(0).text();
            item.description = t.find('content').eq(0).text();
            item.content = t.find('content').eq(0).text();
            item.updated = t.find('updated').eq(0).text();
            item.id = t.find('id').eq(0).text();
            item.author = t.find('author name').eq(0).text();

            item.image = jQuery(item.content).find('img').eq(0).attr('src');
            if (!item.image) item.image = jQuery(item.description).find('img').eq(0).attr('src');

            t.find('link').each(function() {
                var t = jQuery(this);
                var rel = t.attr('rel');

                if (rel == 'enclosure') {
                    item.enclosure = {
                        url: t.attr('url'),
                        type: t.attr('type')
                    }
                }

                /*
                 * RFC 4287 - 4.2.7.2: take first encountered 'link' node
                 *                     to be of the 'alternate' type.
                 */
                if ((rel == 'alternate') || (!rel && !item.link)) {
                    item.link = t.attr('href');
                }
            });

            var point = t.find('georss\\:point').eq(0).text();
            if (!point) point = t.find('point').eq(0).text();
            if (point.length > 0) {
                point = point.split(" ");
                item.coordinates = [point[1], point[0]];
            }

            feed.items.push(item);
        });
    }
};

function JRss(xml) {
    this._parse(xml);
};

JRss.prototype  = {

    _parse: function(xml) {

        if(jQuery('rss', xml).length == 0) this.version = '1.0';
        else this.version = jQuery('rss', xml).eq(0).attr('version');

        var channel = jQuery('channel', xml).eq(0);

        this.title = jQuery(channel).find('title:first').text();
        this.link = jQuery(channel).find('link:first').text();
        this.description = jQuery(channel).find('description:first').text();
        this.language = jQuery(channel).find('language:first').text();
        this.updated = jQuery(channel).find('lastBuildDate:first').text();

        this.items = new Array();

        var feed = this;

        jQuery('item', xml).each( function() {

            var item = new JFeedItem();
            var t = jQuery(this);

            item.title = t.find('title').eq(0).text();
            item.link = t.find('link').eq(0).text();
            item.description = t.find('description').eq(0).text();
            item.updated = t.find('pubDate').eq(0).text();
            item.id = t.find('guid').eq(0).text();

            item.content = t.find('content\\:encoded').eq(0).text();
            if (!item.content) item.content = t.find('encoded').eq(0).text();

            item.image = jQuery(item.content).find('img').eq(0).attr('src');
            if (!item.image) item.image = jQuery(item.description).find('img').eq(0).attr('src');

            item.author = t.find('dc\\:creator').eq(0).text();
            if (!item.author) item.author = t.find('creator').eq(0).text();

            var point = t.find('georss\\:point').eq(0).text();
            if (!point) point = t.find('point').eq(0).text();
            if (point.length > 0) {
                point = point.split(" ");
                item.coordinates = [point[1], point[0]];
            }

            var enclosure = t.find('enclosure');
            if (enclosure.length > 0) {
                item.enclosure = {
                    url: enclosure.attr('url'),
                    type: enclosure.attr('type')
                }
            }

            feed.items.push(item);
        });
    }
};

