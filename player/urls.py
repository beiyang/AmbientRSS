from django.conf.urls import patterns, include, url

urlpatterns = patterns('player.views',
                       url(r'^$', 'player', name="player"),
                       url(r'^proxy/(?P<url>.*)$', 'proxy', name='proxy'),
)
