from rest_framework import serializers
from api.models.inventory import Category, Department, Product

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'

class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    media_url = serializers.CharField(source='media.file.url', read_only=True)

    class Meta:
        model = Product
        fields = '__all__'
