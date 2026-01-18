from app.database import SessionLocal, engine, Base
from app.models.desarrollo import FaseDesarrollo
from app.models.auth import Usuario
from app.services.auth import ServicioAuth

def sembrar_datos():
    db = SessionLocal()
    try:
        # 1. Crear usuario admin si no existe
        admin = db.query(Usuario).filter(Usuario.cedula == "admin").first()
        if not admin:
            print("Creando usuario administrador...")
            nuevo_admin = Usuario(
                id="admin-01",
                cedula="admin",
                nombre="Administrador Sistema",
                rol="admin",
                hash_contrasena=ServicioAuth.obtener_hash_contrasena("admin123"),
                esta_activo=True
            )
            db.add(nuevo_admin)

        # 2. Fases de Desarrollo estandar
        fases = [
            {"nombre": "Analisis", "codigo": "ANA", "orden": 1, "color": "#f1c40f"},
            {"nombre": "Desarrollo", "codigo": "DES", "orden": 2, "color": "#3498db"},
            {"nombre": "Pruebas", "codigo": "PRU", "orden": 3, "color": "#e67e22"},
            {"nombre": "Despliegue", "codigo": "DEP", "orden": 4, "color": "#2ecc71"}
        ]
        
        for f_data in fases:
            existente = db.query(FaseDesarrollo).filter(FaseDesarrollo.codigo == f_data["codigo"]).first()
            if not existente:
                print(f"Creando fase: {f_data['nombre']}")
                nueva_fase = FaseDesarrollo(**f_data)
                db.add(nueva_fase)
        
        db.commit()
        print("Datos de semilla sembrados exitosamente.")
        
    except Exception as e:
        print(f"Error sembrando datos: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Asegurar que las tablas existan
    print("Verificando tablas e instalando base de datos...")
    Base.metadata.create_all(bind=engine)
    sembrar_datos()
