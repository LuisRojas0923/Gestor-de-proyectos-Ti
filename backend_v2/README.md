# Backend V2 - Gestor de Proyectos TI

Backend FastAPI con estructura modular y localización completa al español.

## Instalación

```bash
pip install -r requirements.txt
```

## Ejecución

```bash
uvicorn app.main:app --reload --port 8000
```

## Estructura

```
app/
├── models/      # Modelos SQLAlchemy por módulo
├── schemas/     # Schemas Pydantic por módulo
├── api/         # Endpoints FastAPI por módulo
└── services/    # Lógica de negocio por módulo
```
