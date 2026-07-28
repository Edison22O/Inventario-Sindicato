from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from api.models.maintenance import MaintenanceLog
from api.serializers.maintenance import MaintenanceLogSerializer

class MaintenanceLogViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceLog.objects.all()
    serializer_class = MaintenanceLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = MaintenanceLog.objects.select_related('product').all().order_by('-fecha', '-created_at')
        product_id = self.request.query_params.get('product', None)
        if product_id is not None:
            queryset = queryset.filter(product_id=product_id)
        return queryset
