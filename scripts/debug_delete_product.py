from fastapi.testclient import TestClient
from main import app
client = TestClient(app)
# list products
r = client.get('/productos/?offset=0&limit=10')
print('LIST status', r.status_code)
items = r.json().get('data', [])
print('count', len(items))
if not items:
    print('No products to test')
else:
    prod = items[0]
    pid = prod['id']
    print('Testing product id', pid, 'deleted_at:', prod.get('deleted_at'))
    rd = client.delete(f'/productos/{pid}')
    print('DELETE status', rd.status_code, 'body:', rd.text)
    # try get
    rg = client.get(f'/productos/{pid}')
    print('GET after delete status', rg.status_code, 'body:', rg.text)
