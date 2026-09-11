import json
from channels.generic.websocket import AsyncWebsocketConsumer

class InventoryConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Join inventory group
        self.group_name = 'inventory_updates'

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()
        # Send initial confirmation connection message
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Real-time WebSocket active'
        }))

    async def disconnect(self, close_code):
        # Leave inventory group
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def receive(self, text_data=None, bytes_data=None):
        if text_data:
            try:
                data = json.loads(text_data)
                if data.get('type') == 'ping':
                    await self.send(text_data=json.dumps({'type': 'pong'}))
            except Exception:
                pass

    # Receive message from room group
    async def inventory_update(self, event):
        message = event['message']

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'inventory_update',
            'message': message
        }))

