# Documentación: Exportación de Estado de Cuenta a Excel (.xlsx)

Este documento es una guía exclusiva para el uso del endpoint de generación de reportes en formato Excel del ERP.

## Endpoint de Exportación

- **URL:** `http://localhost:8000/api/v2/viaticos/estado-cuenta/xlsx`
- **Método:** `GET`
- **Descripción:** Genera y descarga un archivo Excel (.xlsx) con el estado de cuenta detallado de un empleado.

### Parámetros de Consulta (Query Params)

| Parámetro | Tipo | Requerido | Descripción | Formato |
| :--- | :--- | :--- | :--- | :--- |
| `cedula` | `string` | **SÍ** | Cédula del empleado. | |
| `desde` | `date` | No | Fecha inicial. | `YYYY-MM-DD` |
| `hasta` | `date` | No | Fecha final. | `YYYY-MM-DD` |

---

### Ejemplo de Uso (URL Directa)
Puedes probarlo directamente pegando esto en tu navegador (asegúrate de que el backend esté corriendo):
`http://localhost:8000/api/v2/viaticos/estado-cuenta/xlsx?cedula=10203040`

---

### Implementación Técnica

#### Opción A: Aplicación Java 8 (Escritorio)
```java
public void descargarExcel(String cedula) throws Exception {
    String urlStr = "http://localhost:8000/api/v2/viaticos/estado-cuenta/xlsx?cedula=" + cedula;
    URL url = new URL(urlStr);
    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
    conn.setRequestMethod("GET");

    if (conn.getResponseCode() == 200) {
        try (InputStream in = conn.getInputStream();
             OutputStream out = new FileOutputStream("Reporte_" + cedula + ".xlsx")) {
            byte[] buf = new byte[4096];
            int n;
            while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
        }
        System.out.println("Excel descargado con éxito.");
    }
}
```

#### Opción B: Aplicación Web (Frontend)
```javascript
const descargar = (cedula) => {
  window.open(`http://localhost:8000/api/v2/viaticos/estado-cuenta/xlsx?cedula=${cedula}`, '_blank');
};
```

---

### Notas para el Equipo ERP
- El archivo generado incluye columnas de Fecha, Radicado, Tipo, Observaciones y cálculos de Saldo.
- Las celdas monetarias están formateadas con `$ #,##0`.
- El tiempo de respuesta depende del volumen de datos del empleado en el ERP.
