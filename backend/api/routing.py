from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path('ws/inventory/', consumers.InventoryConsumer.as_asgi()),
    path('ws/system/', consumers.InventoryConsumer.as_asgi()),
]

