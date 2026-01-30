
from app.utils_cache import global_cache

def clear_dashboard_cache():
    # En SimpleCache no hay delete por ahora, usamos clear() o esperamos 30s
    # Pero para pruebas, podemos invocar clear()
    global_cache.clear()
    print("Caché de dashboard limpiado por completo.")

if __name__ == "__main__":
    clear_dashboard_cache()
