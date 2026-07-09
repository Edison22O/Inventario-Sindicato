from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Product, Department, Category, Supplier

def broadcast_inventory_update(model_name, action):
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            'inventory_updates',
            {
                'type': 'inventory_update',
                'message': {
                    'model': model_name,
                    'action': action
                }
            }
        )

@receiver(post_save, sender=Product)
@receiver(post_delete, sender=Product)
def product_changed(sender, instance, **kwargs):
    action = 'delete' if 'created' not in kwargs else ('create' if kwargs['created'] else 'update')
    broadcast_inventory_update('Product', action)

@receiver(post_save, sender=Department)
@receiver(post_delete, sender=Department)
def department_changed(sender, instance, **kwargs):
    action = 'delete' if 'created' not in kwargs else ('create' if kwargs['created'] else 'update')
    broadcast_inventory_update('Department', action)

@receiver(post_save, sender=Category)
@receiver(post_delete, sender=Category)
def category_changed(sender, instance, **kwargs):
    action = 'delete' if 'created' not in kwargs else ('create' if kwargs['created'] else 'update')
    broadcast_inventory_update('Category', action)

@receiver(post_save, sender=Supplier)
@receiver(post_delete, sender=Supplier)
def supplier_changed(sender, instance, **kwargs):
    action = 'delete' if 'created' not in kwargs else ('create' if kwargs['created'] else 'update')
    broadcast_inventory_update('Supplier', action)
