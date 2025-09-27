import requests
import json

# Test del endpoint de desarrollos para verificar el campo responsible
try:
    response = requests.get("http://localhost:8000/api/v1/developments/")
    
    if response.status_code == 200:
        developments = response.json()
        print(f"✅ Endpoint respondió correctamente: {len(developments)} desarrollos")
        
        if developments:
            first_dev = developments[0]
            print(f"\nPrimer desarrollo:")
            print(f"  ID: {first_dev.get('id')}")
            print(f"  Nombre: {first_dev.get('name')}")
            print(f"  Provider: {first_dev.get('provider')}")
            print(f"  Responsible: {first_dev.get('responsible')}")
            print(f"  General Status: {first_dev.get('general_status')}")
            
            # Verificar si tiene el campo responsible
            if 'responsible' in first_dev:
                print(f"✅ Campo 'responsible' presente: {first_dev['responsible']}")
            else:
                print("❌ Campo 'responsible' NO presente")
        else:
            print("⚠️ No hay desarrollos en la respuesta")
    else:
        print(f"❌ Error en endpoint: {response.status_code}")
        print(f"Respuesta: {response.text}")

except requests.exceptions.ConnectionError:
    print("❌ No se puede conectar al backend. ¿Está ejecutándose?")
except Exception as e:
    print(f"❌ Error: {e}")
