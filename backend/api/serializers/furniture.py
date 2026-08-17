from rest_framework import serializers
from api.models.furniture import FurnitureCategory, FurnitureDepartment, FurnitureSupplier, FurnitureProduct, FurnitureMaintenanceLog

class FlexibleRelatedField(serializers.PrimaryKeyRelatedField):
    def to_internal_value(self, data):
        if self.pk_field is not None:
            data = self.pk_field.to_internal_value(data)
        queryset = self.get_queryset()
        
        if isinstance(data, int) or (isinstance(data, str) and data.isdigit()):
            try:
                return queryset.get(pk=int(data))
            except queryset.model.DoesNotExist:
                pass
        
        if isinstance(data, str):
            try:
                return queryset.get(public_id=data)
            except Exception:
                pass
            
            if hasattr(queryset.model, 'name'):
                try:
                    return queryset.get(name=data)
                except Exception:
                    pass

        return super().to_internal_value(data)

class FurnitureCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FurnitureCategory
        fields = '__all__'

class FurnitureDepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = FurnitureDepartment
        fields = '__all__'

class FurnitureSupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = FurnitureSupplier
        fields = '__all__'

class FurnitureProductSerializer(serializers.ModelSerializer):
    department = FlexibleRelatedField(queryset=FurnitureDepartment.objects.all())
    category = FlexibleRelatedField(queryset=FurnitureCategory.objects.all(), required=False, allow_null=True)
    supplier = FlexibleRelatedField(queryset=FurnitureSupplier.objects.all(), required=False, allow_null=True)

    category_name = serializers.CharField(source='category.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    media_url = serializers.CharField(source='media.file.url', read_only=True)

    class Meta:
        model = FurnitureProduct
        fields = '__all__'

class FurnitureMaintenanceLogSerializer(serializers.ModelSerializer):
    product_codigo = serializers.CharField(source='product.codigo', read_only=True)
    product_nombre = serializers.CharField(source='product.nombre', read_only=True)
    
    class Meta:
        model = FurnitureMaintenanceLog
        fields = '__all__'

    def create(self, validated_data):
        maintenance_log = super().create(validated_data)
        product = maintenance_log.product
        product.estado = maintenance_log.estado_resultante
        product.fecha_ultimo_mantenimiento = maintenance_log.fecha
        product.save()
        return maintenance_log
