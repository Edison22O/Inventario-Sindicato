from rest_framework.test import APITestCase
from rest_framework import status
from django.core.cache import cache
from api.models.core import User, Role

class LoginThrottlingTestCase(APITestCase):
    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    def test_login_throttling_exceeds_limit(self):
        url = '/token/'
        data = {'username': 'testuser_throttle', 'password': 'wrongpassword'}

        # Send 5 requests (allowed limit per minute)
        for _ in range(5):
            response = self.client.post(url, data, format='json')
            self.assertNotEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

        # 6th request should trigger rate limit (429 Too Many Requests)
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn('detail', response.data)

class SecurityPermissionTestCase(APITestCase):
    def setUp(self):
        self.admin_role, _ = Role.objects.get_or_create(name='Administrador', defaults={'level': 1})
        self.driver_role, _ = Role.objects.get_or_create(name='Conductor', defaults={'level': 5})

        self.admin_user = User.objects.create_user(
            username='admin_test',
            password='Password123',
            role=self.admin_role
        )
        self.driver_user = User.objects.create_user(
            username='driver_test',
            password='Password123',
            role=self.driver_role
        )

    def test_non_admin_cannot_access_user_management(self):
        # Authenticate as driver (non-admin)
        self.client.force_authenticate(user=self.driver_user)
        response = self.client.get('/users/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_access_user_management(self):
        # Authenticate as admin
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
