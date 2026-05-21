Attribute VB_Name = "ModuloTablaMaestra"
' ====================================================================
' MACRO PARA EXTRACCIÓN DE TABLA MAESTRA DE NÓMINA
' Base de datos: project_manager (Portal)
' Tabla: nomina_registros_normalizados
' Driver: PostgreSQL Unicode(x64)
' ====================================================================

Option Explicit

' --- SWITCH AMBIENTE (REDIRECCIONADO AL MÓDULO CENTRAL) ---

Sub CambiarAmbiente()
    ModuloConexionNomina.CambiarAmbiente
End Sub

' --- PROCESO PRINCIPAL ---

Sub ExtraerTablaMaestra()
    Dim conn As Object
    Dim rs As Object
    Dim wsParams As Worksheet
    Dim wsData As Worksheet
    Dim sql As String
    Dim col As Long
    Dim totalRegs As Long
    Dim nombreHoja As String
    Dim nombreTabla As String
    
    Dim mes As String
    Dim anio As String
    Dim quincena As String
    
    Dim activeEnv As String
    activeEnv = IIf(ModuloConexionNomina.mAmbiente = "", "LOCAL", ModuloConexionNomina.mAmbiente)
    
    nombreHoja = "BD_MAESTRA"
    nombreTabla = "T_MAESTRA"
    
    On Error GoTo ErrorHandler
    
    ' 1. LEER PARÁMETROS
    ' Se asume que en la hoja actual el usuario digitó MES en B1, AÑO en B2 y QUINCENA en B3
    Set wsParams = ActiveSheet
    mes = Trim(wsParams.Range("B1").Value)
    anio = Trim(wsParams.Range("B2").Value)
    quincena = UCase(Trim(wsParams.Range("B3").Value))
    
    If Not IsNumeric(mes) Or Not IsNumeric(anio) Then
        MsgBox "El Mes y el Año deben ser números.", vbExclamation, "Validación"
        Exit Sub
    End If
    
    If quincena <> "Q1" And quincena <> "Q2" Then
        MsgBox "La Quincena debe ser 'Q1' o 'Q2'.", vbExclamation, "Validación"
        Exit Sub
    End If
    
    ' 2. CONSTRUIR SQL DINÁMICO ESTÁTICO (PIVOT)
    Dim q1Check As String, q2Check As String
    If quincena = "Q1" Then q1Check = "1=1" Else q1Check = "1=0"
    If quincena = "Q2" Then q2Check = "1=1" Else q2Check = "1=0"

    sql = "SELECT " & vbCrLf & _
          "    cedula AS ""CEDULA""," & vbCrLf & _
          "    MAX(COALESCE(nombre_asociado, '')) AS ""NOMBRE REAL""," & vbCrLf & _
          "    MAX(COALESCE(empresa, '')) AS ""EMPRESA""," & vbCrLf & _
          "    SUM(COALESCE(horas, 0)) AS ""HORAS""," & vbCrLf & _
          "    SUM(COALESCE(dias, 0)) AS ""DIAS""," & vbCrLf
          
    sql = sql & "    SUM(CASE WHEN concepto = 'BENEFICIAR APORTE' AND " & q1Check & " THEN ROUND(CAST((valor / 2.0) AS numeric), 2) ELSE 0 END) AS ""BENEFICIAR.1Q APORTE""," & vbCrLf
    sql = sql & "    SUM(CASE WHEN concepto = 'BENEFICIAR APORTE' AND " & q2Check & " THEN ROUND(CAST((valor / 2.0) AS numeric), 2) ELSE 0 END) AS ""BENEFICIAR.2Q APORTE""," & vbCrLf
    sql = sql & "    SUM(CASE WHEN concepto = 'BENEFICIAR CREDITO' AND " & q1Check & " THEN ROUND(CAST((valor / 2.0) AS numeric), 2) ELSE 0 END) AS ""BENEFICIAR.1Q CREDITO""," & vbCrLf
    sql = sql & "    SUM(CASE WHEN concepto = 'BENEFICIAR CREDITO' AND " & q2Check & " THEN ROUND(CAST((valor / 2.0) AS numeric), 2) ELSE 0 END) AS ""BENEFICIAR.2Q CREDITO""," & vbCrLf
    sql = sql & "    SUM(CASE WHEN concepto = 'BENEFICIAR OTROS DESCUENTOS' AND " & q1Check & " THEN ROUND(CAST((valor / 2.0) AS numeric), 2) ELSE 0 END) AS ""BENEFICIAR.1Q OTROS DESC""," & vbCrLf
    sql = sql & "    SUM(CASE WHEN concepto = 'BENEFICIAR OTROS DESCUENTOS' AND " & q2Check & " THEN ROUND(CAST((valor / 2.0) AS numeric), 2) ELSE 0 END) AS ""BENEFICIAR.2Q OTROS DESC""," & vbCrLf
    sql = sql & "    SUM(CASE WHEN concepto = 'BOGOTA LIBRANZA' AND " & q1Check & " THEN ROUND(CAST((valor / 2.0) AS numeric), 2) ELSE 0 END) AS ""BOGOTÁ_LIBZ.1 QUINCENA""," & vbCrLf
    sql = sql & "    SUM(CASE WHEN concepto = 'BOGOTA LIBRANZA' AND " & q2Check & " THEN ROUND(CAST((valor / 2.0) AS numeric), 2) ELSE 0 END) AS ""BOGOTÁ_LIBZ.2 QUINCENA""," & vbCrLf
    sql = sql & "    SUM(CASE WHEN concepto = 'CAMPOSANTO' AND " & q1Check & " THEN ROUND(CAST((valor / 2.0) AS numeric), 2) ELSE 0 END) AS ""CAMPOSANTO.1 QUINCENA""," & vbCrLf
    sql = sql & "    SUM(CASE WHEN concepto = 'CAMPOSANTO' AND " & q2Check & " THEN ROUND(CAST((valor / 2.0) AS numeric), 2) ELSE 0 END) AS ""CAMPOSANTO.2 QUINCENA""," & vbCrLf
    
    ' CONTROL DE DESCUENTOS
    sql = sql & "    SUM(CASE WHEN concepto = 'CONTROL DE DESCUENTO " & quincena & "' THEN valor ELSE 0 END) AS ""CONTROL_DE_DESC.VALOR CUOTA""," & vbCrLf
    
    sql = sql & "    SUM(CASE WHEN concepto = 'DAVIVIENDA LIBRANZA' AND " & q1Check & " THEN ROUND(CAST((valor / 2.0) AS numeric), 2) ELSE 0 END) AS ""DAVIVIENDA_LIBZ.1 QUINCENA""," & vbCrLf
    sql = sql & "    SUM(CASE WHEN concepto = 'DAVIVIENDA LIBRANZA' AND " & q2Check & " THEN ROUND(CAST((valor / 2.0) AS numeric), 2) ELSE 0 END) AS ""DAVIVIENDA_LIBZ.2 QUINCENA""," & vbCrLf
    sql = sql & "    SUM(CASE WHEN concepto = 'EMBARGO' AND " & q1Check & " THEN ROUND(CAST((valor / 2.0) AS numeric), 2) ELSE 0 END) AS ""EMBARGO.1 QUINCENA""," & vbCrLf
    sql = sql & "    SUM(CASE WHEN concepto = 'EMBARGO' AND " & q2Check & " THEN ROUND(CAST((valor / 2.0) AS numeric), 2) ELSE 0 END) AS ""EMBARGO.2 QUINCENA""," & vbCrLf
    sql = sql & "    SUM(CASE WHEN concepto = 'CELULARES' AND " & q1Check & " THEN ROUND(CAST((valor / 2.0) AS numeric), 2) ELSE 0 END) AS ""FAC_CLARO.1QUINCENA""," & vbCrLf
    sql = sql & "    SUM(CASE WHEN concepto = 'CELULARES' AND " & q2Check & " THEN ROUND(CAST((valor / 2.0) AS numeric), 2) ELSE 0 END) AS ""FAC_CLARO.2QUINCENA""," & vbCrLf
    sql = sql & "    SUM(CASE WHEN concepto = 'GRANCOOP APORTES' AND " & q1Check & " THEN ROUND(CAST((valor / 2.0) AS numeric), 2) ELSE 0 END) AS ""GRANCOOP.1Q AHORRO""," & vbCrLf
    sql = sql & "    SUM(CASE WHEN concepto = 'GRANCOOP APORTES' AND " & q2Check & " THEN ROUND(CAST((valor / 2.0) AS numeric), 2) ELSE 0 END) AS ""GRANCOOP.2Q AHORRO""," & vbCrLf
    sql = sql & "    SUM(CASE WHEN concepto = 'GRANCOOP PRESTAMOS' AND " & q1Check & " THEN ROUND(CAST((valor / 2.0) AS numeric), 2) ELSE 0 END) AS ""GRANCOOP.1Q PRESTAMO""," & vbCrLf
    sql = sql & "    SUM(CASE WHEN concepto = 'GRANCOOP PRESTAMOS' AND " & q2Check & " THEN ROUND(CAST((valor / 2.0) AS numeric), 2) ELSE 0 END) AS ""GRANCOOP.2Q PRESTAMO""," & vbCrLf
    sql = sql & "    SUM(CASE WHEN concepto = 'GRANCOOP ADICIONALES' AND " & q1Check & " THEN ROUND(CAST((valor / 2.0) AS numeric), 2) ELSE 0 END) AS ""GRANCOOP.1Q ADICIONALES""," & vbCrLf
    sql = sql & "    SUM(CASE WHEN concepto = 'GRANCOOP ADICIONALES' AND " & q2Check & " THEN ROUND(CAST((valor / 2.0) AS numeric), 2) ELSE 0 END) AS ""GRANCOOP.2Q ADICIONALES""," & vbCrLf
    sql = sql & "    SUM(CASE WHEN concepto = 'OCCIDENTE LIBRANZA' AND " & q1Check & " THEN ROUND(CAST((valor / 2.0) AS numeric), 2) ELSE 0 END) AS ""OCCIDENTE_LIBZ.1 QUINCENA""," & vbCrLf
    sql = sql & "    SUM(CASE WHEN concepto = 'OCCIDENTE LIBRANZA' AND " & q2Check & " THEN ROUND(CAST((valor / 2.0) AS numeric), 2) ELSE 0 END) AS ""OCCIDENTE_LIBZ.2 QUINCENA""," & vbCrLf
    
    ' PLANOS
    sql = sql & "    SUM(CASE WHEN concepto = 'OTROS-GERENCIA FONDO COMUN' THEN valor ELSE 0 END) AS ""OTROS_GERENCIA.FONDO COMUN""," & vbCrLf
    sql = sql & "    SUM(CASE WHEN concepto = 'OTROS-GERENCIA DESCUENTO EMPLEADAS' THEN valor ELSE 0 END) AS ""OTROS_GERENCIA.DESCUENTO EMPLEADAS""," & vbCrLf
    sql = sql & "    SUM(CASE WHEN concepto = 'OTROS-GERENCIA PAGO EMPLEADAS' THEN valor ELSE 0 END) AS ""OTROS_GERENCIA.INGRESO A EMPLEADO""," & vbCrLf
    sql = sql & "    SUM(CASE WHEN concepto = 'POLIZA VEHICULOS' THEN ROUND(CAST((valor / 2.0) AS numeric), 2) ELSE 0 END) AS ""POLIZA_DE_VEHICULO.VALOR CUTOA QUINENAL""," & vbCrLf
    
    sql = sql & "    SUM(CASE WHEN concepto = 'RECORDAR' AND " & q1Check & " THEN ROUND(CAST((valor / 2.0) AS numeric), 2) ELSE 0 END) AS ""RECORDAR.1 QUINCENA""," & vbCrLf
    sql = sql & "    SUM(CASE WHEN concepto = 'RECORDAR' AND " & q2Check & " THEN ROUND(CAST((valor / 2.0) AS numeric), 2) ELSE 0 END) AS ""RECORDAR.2 QUINCENA""," & vbCrLf
    sql = sql & "    SUM(CASE WHEN concepto = 'SEGURO DE VIDA' AND " & q1Check & " THEN ROUND(CAST((valor / 2.0) AS numeric), 2) ELSE 0 END) AS ""SURA.1 QUINCENA""," & vbCrLf
    sql = sql & "    SUM(CASE WHEN concepto = 'SEGURO DE VIDA' AND " & q2Check & " THEN ROUND(CAST((valor / 2.0) AS numeric), 2) ELSE 0 END) AS ""SURA.2 QUINCENA""," & vbCrLf
    
    ' PLANOS VACÍOS (0)
    sql = sql & "    0 AS ""PAY_FLOW.IMPORTE TOTAL A DEDUCIR $""," & vbCrLf
    
    sql = sql & "    SUM(CASE WHEN concepto = 'MEDICINA PREPAGADA' AND " & q1Check & " THEN ROUND(CAST((valor / 2.0) AS numeric), 2) ELSE 0 END) AS ""MEDICINA_PREPAGADA.1 QUINCENA""," & vbCrLf
    sql = sql & "    SUM(CASE WHEN concepto = 'MEDICINA PREPAGADA' AND " & q2Check & " THEN ROUND(CAST((valor / 2.0) AS numeric), 2) ELSE 0 END) AS ""MEDICINA_PREPAGADA.2 QUINCENA""," & vbCrLf
    
    ' PLANO VACÍO (0)
    sql = sql & "    0 AS ""Comisiones.VALOR""," & vbCrLf
    
    ' RETENCIONES
    sql = sql & "    SUM(CASE WHEN concepto = 'CON COMISION 1Q' AND " & q1Check & " THEN valor ELSE 0 END) AS ""RTFUENTE_Q1.RETEFUENTE A DESCONTAR""," & vbCrLf
    sql = sql & "    SUM(CASE WHEN concepto = 'SIN COMISION 2Q' AND " & q2Check & " THEN valor ELSE 0 END) AS ""RTFUENTE_Q2.RETEFUENTE A DESCONTAR""" & vbCrLf

    sql = sql & "FROM nomina_registros_normalizados" & vbCrLf & _
          "WHERE mes_fact = " & mes & " AND año_fact = " & anio & vbCrLf & _
          "AND estado_validacion IN ('OK', 'Activo', 'REDIRECCIONADO', 'EXCEPCION', 'EXCEPCION_PAGO_TERCERO', 'EXCEPCION_VALOR_FIJO', 'EXCEPCION_PORCENTAJE_EMPRESA', 'EXCEPCION_AUTORIZADA', 'EXCEPCION_SALDO_FAVOR')" & vbCrLf & _
          "AND subcategoria_final NOT IN ('GESTION EXCEPCIONES', 'COMISIONES')" & vbCrLf & _
          "GROUP BY cedula" & vbCrLf & _
          "ORDER BY MAX(COALESCE(nombre_asociado, ''));"
    
    ' 3. CONEXIÓN A POSTGRESQL (USANDO MÓDULO CENTRAL)
    Application.StatusBar = "Conectando a PostgreSQL (" & activeEnv & ")..."
    Set conn = CreateObject("ADODB.Connection")
    conn.Open ModuloConexionNomina.ObtenerCadenaConexion()
    
    ' 4. EJECUTAR SQL
    Application.StatusBar = "Consultando Tabla Maestra..."
    Set rs = conn.Execute(sql)
    
    ' 5. PREPARAR HOJA DESTINO
    On Error Resume Next
    Set wsData = ThisWorkbook.Worksheets(nombreHoja)
    If wsData Is Nothing Then
        Set wsData = ThisWorkbook.Worksheets.Add
        wsData.Name = nombreHoja
    End If
    
    ' 6. DESTRUIR TABLA Y LIMPIAR
    Dim tbl As ListObject
    On Error Resume Next
    Set tbl = wsData.ListObjects(nombreTabla)
    If Not tbl Is Nothing Then
        tbl.Unlist
    End If
    On Error GoTo ErrorHandler
    
    wsData.Rows("5:" & wsData.Rows.Count).Clear
    
    ' 7. ESCRIBIR ENCABEZADOS Y DATOS
    Application.StatusBar = "Cargando matriz en Excel..."
    
    If rs.EOF Then
        MsgBox "La consulta no devolvió ningún registro para el periodo indicado.", vbInformation
        GoTo Finalizar
    End If
    
    Dim iCol As Integer
    ' Escribir Cabeceras en la fila 5
    For iCol = 0 To rs.Fields.Count - 1
        wsData.Cells(5, iCol + 1).Value = rs.Fields(iCol).Name
        wsData.Cells(5, iCol + 1).Font.Bold = True
        wsData.Cells(5, iCol + 1).Interior.Color = RGB(0, 32, 96)
        wsData.Cells(5, iCol + 1).Font.Color = RGB(255, 255, 255)
    Next iCol
    
    ' Escribir Datos en la fila 6
    wsData.Cells(6, 1).CopyFromRecordset rs
    
    ' 8. CREAR TABLA ESTRUCTURADA
    Dim lastRow As Long
    Dim lastCol As Long
    lastRow = wsData.Cells(wsData.Rows.Count, 1).End(xlUp).Row
    lastCol = rs.Fields.Count
    
    Dim tblRange As Range
    Set tblRange = wsData.Range(wsData.Cells(5, 1), wsData.Cells(lastRow, lastCol))
    Set tbl = wsData.ListObjects.Add(1, tblRange, , 1)
    tbl.Name = nombreTabla
    tbl.TableStyle = "TableStyleMedium2"
    
    ' Formato
    wsData.Columns.AutoFit
    wsData.Range(wsData.Cells(6, 4), wsData.Cells(lastRow, 5)).NumberFormat = "#,##0"
    wsData.Range(wsData.Cells(6, 6), wsData.Cells(lastRow, lastCol)).NumberFormat = "$ #,##0.00"
    
    totalRegs = lastRow - 5
    
Finalizar:
    ' 9. LIMPIEZA
    rs.Close
    conn.Close
    Set rs = Nothing
    Set conn = Nothing
    
    wsParams.Activate
    Application.StatusBar = False
    MsgBox "Tabla Maestra extraída con éxito." & vbCrLf & _
           "Ambiente: " & activeEnv & vbCrLf & _
           "Registros importados: " & totalRegs, vbInformation, "Éxito"
    Exit Sub

ErrorHandler:
    Application.StatusBar = False
    MsgBox "Error en extracción: " & Err.Description & vbCrLf & _
           "Ambiente: " & activeEnv, _
           vbCritical, "Error en Macro"
    If Not rs Is Nothing Then If rs.State = 1 Then rs.Close
    If Not conn Is Nothing Then If conn.State = 1 Then conn.Close
End Sub
