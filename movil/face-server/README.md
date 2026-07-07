# Face Server Legacy

Este directorio contiene el servidor Flask/DeepFace historico de GeoFace.

Estado actual:

- No es el runtime productivo de la app movil.
- La app `movil/` consume `backend_v2` por `/api/v2`.
- El procesamiento facial productivo pasa por `backend_v2` y el servicio interno `biometria-engine`.
- Las rutas `/v1/*` de este directorio no deben usarse para nuevas integraciones.

Decision temporal:

- Se conserva como referencia historica hasta que el equipo apruebe eliminarlo o moverlo a archivo.
- No exponer este servicio en Docker, LAN o produccion.
- No documentarlo como contrato operativo.
