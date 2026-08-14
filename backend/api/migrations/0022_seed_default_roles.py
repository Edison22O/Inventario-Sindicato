from django.db import migrations

def create_and_clean_roles(apps, schema_editor):
    Role = apps.get_model('api', 'Role')
    User = apps.get_model('api', 'User')

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
            role_obj = Role.objects.create(
                name=role_data['name'],
                level=level,
                status=True
            )
        target_roles[role_data['name']] = role_obj

    # Mapeo de nombres de roles antiguos a los nuevos roles estandarizados
    role_mappings = {
        'tecnologico': target_roles['Encargado de Tecnología'],
        'tecnológico': target_roles['Encargado de Tecnología'],
        'muebles': target_roles['Encargado de Mobiliario'],
        'mobiliario': target_roles['Encargado de Mobiliario'],
        'conductores': target_roles['Conductor'],
        'choferes': target_roles['Conductor'],
    }

    # Migrar usuarios existentes con roles antiguos a los nuevos roles y eliminar roles viejos
    for old_name, new_role_obj in role_mappings.items():
        old_roles = Role.objects.filter(name__iexact=old_name)
        for old_role in old_roles:
            if old_role.pk != new_role_obj.pk:
                User.objects.filter(role=old_role).update(role=new_role_obj)
                old_role.delete()

def reverse_roles(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0021_alter_category_public_id_alter_department_public_id_and_more'),
    ]

    operations = [
        migrations.RunPython(create_and_clean_roles, reverse_code=reverse_roles),
    ]
