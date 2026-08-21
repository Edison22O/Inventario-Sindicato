from rest_framework import serializers
from api.models.suppliers import Supplier, VehicleSupplier

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'

class VehicleSupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleSupplier
        fields = '__all__'

