from rest_framework import serializers
from api.models.inventory import Category, Department, Product
from api.models.suppliers import Supplier

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

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'

class ProductSerializer(serializers.ModelSerializer):
    department = FlexibleRelatedField(queryset=Department.objects.all())
    category = FlexibleRelatedField(queryset=Category.objects.all(), required=False, allow_null=True)
    supplier = FlexibleRelatedField(queryset=Supplier.objects.all(), required=False, allow_null=True)

    category_name = serializers.CharField(source='category.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    media_url = serializers.CharField(source='media.file.url', read_only=True)

    class Meta:
        model = Product
        fields = '__all__'

