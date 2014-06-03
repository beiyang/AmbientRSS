from django.conf.urls import patterns, include, url
from django.views.generic import TemplateView

urlpatterns = patterns('player.views',
                       url(r'^$', 'player', name="player"),
                       url(r'^particles/$', TemplateView.as_view(template_name="particles.html"), name="player"),
                       url(r'^proxy/(?P<url>.*)$', 'proxy', name='proxy'),
)
