from rest_framework.throttling import SimpleRateThrottle

class LoginRateThrottle(SimpleRateThrottle):
    """
    Throttle limit specifically for login requests (/token/).
    Uses a combination of client IP address and requested username
    to prevent brute-force attacks while avoiding locking out other users on shared networks.
    """
    scope = 'login'

    def get_cache_key(self, request, view):
        if request.method != 'POST':
            return None

        ident = self.get_ident(request)
        username = request.data.get('username', '')
        if isinstance(username, str) and username.strip():
            ident = f"{ident}_{username.strip().lower()}"

        return self.cache_format % {
            'scope': self.scope,
            'ident': ident
        }
