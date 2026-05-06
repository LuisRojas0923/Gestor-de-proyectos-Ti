Attribute VB_Name = "ModuloTablaMaestraPlana"
' ====================================================================
' MACRO PARA EXTRACCIÓN DE TABLA MAESTRA PLANA DE NÓMINA (SÍN PIVOT)
' Base de datos: project_manager (Portal)
' Tabla: nomina_registros_normalizados
' Columnas: CEDULA, NOMBRE, EMPRESA, HORAS, DIAS, CONCEPTO, VALOR
' Driver: PostgreSQL Unicode(x64)
' ====================================================================

Option Explicit

' --- AMBIENTE ACTIVO ---
' Valores: "LOCAL", "DEV", "PROD"
Private mAmbiente As String

' --- UTILIDADES DE CIFRADO ---

Private Function HexToString(ByVal hexVal As String) As String
    Dim i As Long
    Dim res As String
    res = ""
    For i = 1 To Len(hexVal) Step 2
        res = res & Chr(Val("&H" & Mid(hexVal, i, 2)))
    Next i
    HexToString = res
End Function

' --- SWITCH AMBIENTE ---

Sub CambiarAmbientePlano()
    ' Permite al usuario seleccionar el ambiente de conexión
    Dim opcion As String
    opcion = InputBox( _
        "Seleccione el ambiente de conexión:" & vbCrLf & vbCrLf & _
        "1 = LOCAL  (192.168.40.29:5433)" & vbCrLf & _
        "2 = DEV    (192.168.0.21:5432)" & vbCrLf & _
        "3 = PROD   (192.168.0.21:5433)" & vbCrLf & vbCrLf & _
        "Ambiente actual: " & IIf(mAmbiente = "", "NO DEFINIDO", mAmbiente), _
        "Seleccionar Ambiente Plano", "1")
    
    Select Case Trim(opcion)
        Case "1": mAmbiente = "LOCAL"
        Case "2": mAmbiente = "DEV"
        Case "3": mAmbiente = "PROD"
        Case Else
            MsgBox "Opción no válida. Se mantiene: " & IIf(mAmbiente = "", "LOCAL (default)", mAmbiente), vbExclamation
            If mAmbiente = "" Then mAmbiente = "LOCAL"
            Exit Sub
    End Select
    
    MsgBox "Ambiente cambiado a: " & mAmbiente, vbInformation, "Ambiente Activo"
End Sub

Private Function ObtenerCadenaConexion() As String
    ' Retorna la cadena ODBC según el ambiente activo
    Dim srv As String, prt As String
    
    If mAmbiente = "" Then mAmbiente = "LOCAL" ' Default
    
    Select Case mAmbiente
        Case "LOCAL"
            srv = "192.168.40.29"
            prt = "5433"
         Case "DEV"
            srv = "192.168.0.21"
            prt = "5432"
         Case "PROD"
            srv = "192.168.0.21"
            prt = "5433"
    End Select
    
    ' Contraseña cifrada en hex: "password_segura_refridcol"
    ObtenerCadenaConexion = "Driver={PostgreSQL Unicode(x64)};" & _
        "Server=" & srv & ";" & _
        "Port=" & prt & ";" & _
        "Database=project_manager;" & _
        "Uid=user;" & _
        "Pwd=" & HexToString("70617373776f72645f7365677572615f726566726964636f6c") & ";"
End Function

' --- PROCESO PRINCIPAL ---

Sub ExtraerTablaMaestraPlana()
    Dim conn As Object
    Dim rs As Object
    Dim wsParams As Worksheet
    Dim wsData As Worksheet
    Dim sql As String
    Dim totalRegs As Long
    Dim nombreHoja As String
    Dim nombreTabla As String
    
    Dim mes As String
    Dim anio As String
    Dim quincena As String
    
    nombreHoja = "BD_MAESTRA_PLANA"
    nombreTabla = "T_MAESTRA_PLANA"
    
    On Error GoTo ErrorHandler
    
    ' 1. LEER PARÁMETROS
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
    
    ' 2. CONSTRUIR SQL PLANO (SÍN PIVOT)
    sql = "SELECT " & vbCrLf & _
          "    cedula AS ""CEDULA""," & vbCrLf & _
          "    COALESCE(nombre_asociado, '') AS ""NOMBRE""," & vbCrLf & _
          "    COALESCE(empresa, '') AS ""EMPRESA""," & vbCrLf & _
          "    COALESCE(horas, 0) AS ""HORAS""," & vbCrLf & _
          "    COALESCE(dias, 0) AS ""DIAS""," & vbCrLf & _
          "    COALESCE(concepto, subcategoria_final) AS ""CONCEPTO""," & vbCrLf & _
          "    CASE WHEN subcategoria_final IN ('OTROS GERENCIA', 'RETENCIONES') THEN valor ELSE ROUND(CAST((valor / 2.0) AS numeric), 2) END AS ""VALOR""" & vbCrLf & _
          "FROM nomina_registros_normalizados" & vbCrLf & _
          "WHERE mes_fact = " & mes & " AND año_fact = " & anio & vbCrLf & _
          "AND estado_validacion IN ('OK', 'Activo', 'REDIRECCIONADO', 'EXCEPCION', 'EXCEPCION_PAGO_TERCERO', 'EXCEPCION_VALOR_FIJO', 'EXCEPCION_PORCENTAJE_EMPRESA', 'EXCEPCION_AUTORIZADA', 'EXCEPCION_SALDO_FAVOR')" & vbCrLf & _
          "AND subcategoria_final NOT IN ('GESTION EXCEPCIONES', 'COMISIONES')" & vbCrLf
          
    If quincena = "Q1" Then
        sql = sql & "AND (COALESCE(concepto, subcategoria_final) ILIKE '%1Q%' OR COALESCE(concepto, subcategoria_final) ILIKE '%Q1%' OR concepto = 'CON COMISION 1Q') AND valor = 0" & vbCrLf
    Else
        sql = sql & "AND (COALESCE(concepto, subcategoria_final) ILIKE '%1Q%' OR COALESCE(concepto, subcategoria_final) ILIKE '%Q1%' OR COALESCE(concepto, subcategoria_final) ILIKE '%2Q%' OR COALESCE(concepto, subcategoria_final) ILIKE '%Q2%' OR concepto IN ('CON COMISION 1Q', 'SIN COMISION 2Q')) AND valor = 0" & vbCrLf
    End If
    
    sql = sql & "ORDER BY nombre_asociado, concepto;"
    
    ' 3. CONEXIÓN A POSTGRESQL
    Application.StatusBar = "Conectando a PostgreSQL (" & IIf(mAmbiente = "", "LOCAL", mAmbiente) & ")..."
    Set conn = CreateObject("ADODB.Connection")
    conn.Open ObtenerCadenaConexion()
    
    ' 4. EJECUTAR SQL
    Application.StatusBar = "Consultando Tabla Maestra Plana..."
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
    Application.StatusBar = "Cargando datos en Excel..."
    
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
    wsData.Range(wsData.Cells(6, 7), wsData.Cells(lastRow, lastCol)).NumberFormat = "$ #,##0.00"
    
    totalRegs = lastRow - 5
    
Finalizar:
    ' 9. LIMPIEZA
    rs.Close
    conn.Close
    Set rs = Nothing
    Set conn = Nothing
    
    wsParams.Activate
    Application.StatusBar = False
    MsgBox "Tabla Maestra Plana extraída con éxito." & vbCrLf & _
           "Ambiente: " & IIf(mAmbiente = "", "LOCAL", mAmbiente) & vbCrLf & _
           "Registros importados: " & totalRegs, vbInformation, "Éxito"
    Exit Sub

ErrorHandler:
    Application.StatusBar = False
    MsgBox "Error en extracción: " & Err.Description & vbCrLf & _
           "Ambiente: " & IIf(mAmbiente = "", "LOCAL", mAmbiente), _
           vbCritical, "Error en Macro"
    If Not rs Is Nothing Then If rs.State = 1 Then rs.Close
    If Not conn Is Nothing Then If conn.State = 1 Then conn.Close
End Sub
