from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from api.models.inventory import Category, Department, Product
from api.serializers.inventory import CategorySerializer, DepartmentSerializer, ProductSerializer

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('department', 'category', 'supplier', 'media').all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
