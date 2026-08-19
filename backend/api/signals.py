from django.db.models.signals import post_save, post_delete, post_migrate
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Product, Department, Category, Supplier
from .models.maintenance import MaintenanceLog
from .models.furniture import FurnitureProduct, FurnitureDepartment, FurnitureCategory, FurnitureSupplier

@receiver(post_migrate)
def ensure_default_roles(sender, **kwargs):
    if sender.name != 'api':
        return
    try:
        from api.models.core import Role, User
        default_roles_data = [
            {'name': 'Administrador', 'level': 1},
            {'name': 'Administrador de Flota Vehicular', 'level': 2},
            {'name': 'Encargado de Tecnología', 'level': 3},
            {'name': 'Encargado de Mobiliario', 'level': 4},
            {'name': 'Conductor', 'level': 5},
        ]
        target_roles = {}
        for role_data in default_roles_data:
            role_obj = Role.objects.filter(name__iexact=role_data['name']).first()
            if not role_obj:
                level = role_data['level']
                while Role.objects.filter(level=level).exists():
                    level += 10
                role_obj = Role.objects.create(name=role_data['name'], level=level, status=True)
            target_roles[role_data['name']] = role_obj

        role_mappings = {
            'tecnologico': target_roles['Encargado de Tecnología'],
            'tecnológico': target_roles['Encargado de Tecnología'],
            'muebles': target_roles['Encargado de Mobiliario'],
            'mobiliario': target_roles['Encargado de Mobiliario'],
            'conductores': target_roles['Conductor'],
            'choferes': target_roles['Conductor'],
        }

        for old_name, new_role_obj in role_mappings.items():
            old_roles = Role.objects.filter(name__iexact=old_name)
            for old_role in old_roles:
                if old_role.pk != new_role_obj.pk:
                    User.objects.filter(role=old_role).update(role=new_role_obj)
                    old_role.delete()
    except Exception:
        pass

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

@receiver(post_save, sender=MaintenanceLog)
@receiver(post_delete, sender=MaintenanceLog)
def maintenance_log_changed(sender, instance, **kwargs):
    action = 'delete' if 'created' not in kwargs else ('create' if kwargs['created'] else 'update')
    broadcast_inventory_update('MaintenanceLog', action)

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

# Furniture Signals
@receiver(post_save, sender=FurnitureProduct)
@receiver(post_delete, sender=FurnitureProduct)
def furniture_product_changed(sender, instance, **kwargs):
    action = 'delete' if 'created' not in kwargs else ('create' if kwargs['created'] else 'update')
    broadcast_inventory_update('FurnitureProduct', action)

@receiver(post_save, sender=FurnitureDepartment)
@receiver(post_delete, sender=FurnitureDepartment)
def furniture_department_changed(sender, instance, **kwargs):
    action = 'delete' if 'created' not in kwargs else ('create' if kwargs['created'] else 'update')
    broadcast_inventory_update('FurnitureDepartment', action)

@receiver(post_save, sender=FurnitureCategory)
@receiver(post_delete, sender=FurnitureCategory)
def furniture_category_changed(sender, instance, **kwargs):
    action = 'delete' if 'created' not in kwargs else ('create' if kwargs['created'] else 'update')
    broadcast_inventory_update('FurnitureCategory', action)

@receiver(post_save, sender=FurnitureSupplier)
@receiver(post_delete, sender=FurnitureSupplier)
def furniture_supplier_changed(sender, instance, **kwargs):
    action = 'delete' if 'created' not in kwargs else ('create' if kwargs['created'] else 'update')
    broadcast_inventory_update('FurnitureSupplier', action)
