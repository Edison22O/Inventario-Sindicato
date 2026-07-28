from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from api.models.suppliers import Supplier
from api.serializers.suppliers import SupplierSerializer

class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated]
