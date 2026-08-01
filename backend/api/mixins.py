from api.models.core import ActivityLog

class AuditLogMixin:
    """
    Un mixin para ViewSets que automáticamente registra las acciones de Creación,
    Actualización y Eliminación (CREATE, UPDATE, DELETE) en ActivityLog.
    """
    audit_module_name = 'General'

    def get_audit_description(self, action, instance):
        return f"Realizó {action} en {str(instance)}"

    def perform_create(self, serializer):
        instance = serializer.save()
        if self.request and hasattr(self.request, 'user') and self.request.user.is_authenticated:
            ActivityLog.objects.create(
                user=self.request.user,
                action='CREATE',
                module=self.audit_module_name,
                description=self.get_audit_description('creación', instance)
            )

    def perform_update(self, serializer):
        instance = serializer.save()
        if self.request and hasattr(self.request, 'user') and self.request.user.is_authenticated:
            ActivityLog.objects.create(
                user=self.request.user,
                action='UPDATE',
                module=self.audit_module_name,
                description=self.get_audit_description('actualización', instance)
            )

    def perform_destroy(self, instance):
        desc = self.get_audit_description('eliminación', instance)
        super().perform_destroy(instance)
        if self.request and hasattr(self.request, 'user') and self.request.user.is_authenticated:
            ActivityLog.objects.create(
                user=self.request.user,
                action='DELETE',
                module=self.audit_module_name,
                description=desc
            )
