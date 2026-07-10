import urllib.request
import urllib.parse
import json

# Login
data = urllib.parse.urlencode({'username': 'admin', 'password': 'adminpassword'}).encode('utf-8')
req = urllib.request.Request('http://localhost:8000/token/', data=data)
try:
    response = urllib.request.urlopen(req)
    token = json.loads(response.read())['access']
except Exception as e:
    print('Failed to login:', e)
    # try another password or username if needed
    exit(1)

# Get products
req = urllib.request.Request('http://localhost:8000/products/')
req.add_header('Authorization', f'Bearer {token}')
try:
    response = urllib.request.urlopen(req)
    products = json.loads(response.read())
    for p in products:
        if 'asd' in p.get('nombre', '').lower():
            print(f"Product: {p.get('nombre')} -> Image: {repr(p.get('image'))}")
except Exception as e:
    print('Failed to get products:', e)
