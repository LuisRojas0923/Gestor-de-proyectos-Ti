Attribute VB_Name = "ModuloExtraccionComisiones"
' ====================================================================
' MACRO PARA EXTRACCIÓN DEDICADA DE COMISIONES (MES ANTERIOR)
' Base de datos: project_manager (Portal)
' Tabla: nomina_registros_normalizados
' Columnas: CEDULA, NOMBRE, EMPRESA, CIUDAD, VALOR, CONCEPTO
' Driver: PostgreSQL Unicode(x64)
' ====================================================================

Option Explicit

' --- AMBIENTE ACTIVO ---
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

Sub CambiarAmbienteComisiones()
    Dim opcion As String
    opcion = InputBox( _
        "Seleccione el ambiente de conexión:" & vbCrLf & vbCrLf & _
        "1 = LOCAL  (192.168.40.29:5433)" & vbCrLf & _
        "2 = DEV    (192.168.0.21:5432)" & vbCrLf & _
        "3 = PROD   (192.168.0.21:5433)" & vbCrLf & vbCrLf & _
        "Ambiente actual: " & IIf(mAmbiente = "", "NO DEFINIDO", mAmbiente), _
        "Seleccionar Ambiente Comisiones", "1")
    
    Select Case Trim(opcion)
        Case "1": mAmbiente = "LOCAL"
        Case "2": mAmbiente = "DEV"
        Case "3": mAmbiente = "PROD"
        Case Else
            MsgBox "Opción no válida. Se mantiene: " & IIf(mAmbiente = "", "LOCAL", mAmbiente), vbExclamation
            If mAmbiente = "" Then mAmbiente = "LOCAL"
            Exit Sub
    End Select
    MsgBox "Ambiente cambiado a: " & mAmbiente, vbInformation, "Ambiente Activo"
End Sub

Private Function ObtenerCadenaConexion() As String
    Dim srv As String, prt As String
    If mAmbiente = "" Then mAmbiente = "LOCAL"
    Select Case mAmbiente
        Case "LOCAL": srv = "192.168.40.29": prt = "5433"
        Case "DEV":   srv = "192.168.0.21": prt = "5432"
        Case "PROD":  srv = "192.168.0.21": prt = "5433"
    End Select
    ObtenerCadenaConexion = "Driver={PostgreSQL Unicode(x64)};" & _
        "Server=" & srv & ";" & _
        "Port=" & prt & ";" & _
        "Database=project_manager;" & _
        "Uid=user;" & _
        "Pwd=" & HexToString("70617373776f72645f7365677572615f726566726964636f6c") & ";"
End Function

' --- PROCESO PRINCIPAL ---

Sub ExtraccionComisiones()
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
    
    Dim mesAnt As Long
    Dim anioAnt As Long
    
    nombreHoja = "BD_COMISIONES"
    nombreTabla = "T_COMISIONES"
    
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
    
    ' Validación de Regla de Negocio: Comisiones reflejan en la 1Q del mes siguiente.
    If quincena <> "Q1" Then
        MsgBox "Atención: Según la regla de negocio, las comisiones acumuladas solo se pagan en la primera quincena (Q1)." & vbCrLf & _
               "Por favor, ejecute esta extracción para el ciclo Q1.", vbInformation, "Restricción de Quincena"
        Exit Sub
    End If
    
    ' Calcular Periodo Anterior (Corte Devengo)
    mesAnt = Val(mes) - 1
    anioAnt = Val(anio)
    If mesAnt = 0 Then
        mesAnt = 12
        anioAnt = anioAnt - 1
    End If
    
    ' 2. CONSTRUIR SQL PARA COMISIONES DEL MES PASADO
    sql = "SELECT " & vbCrLf & _
          "    cedula AS ""CEDULA""," & vbCrLf & _
          "    COALESCE(nombre_asociado, '') AS ""NOMBRE""," & vbCrLf & _
          "    COALESCE(empresa, '') AS ""EMPRESA""," & vbCrLf & _
          "    COALESCE(ciudad, '') AS ""CIUDAD""," & vbCrLf & _
          "    valor AS ""VALOR""," & vbCrLf & _
          "    'COMISIONES' AS ""CONCEPTO""" & vbCrLf & _
          "FROM nomina_registros_normalizados" & vbCrLf & _
          "WHERE mes_fact = " & mesAnt & " AND año_fact = " & anioAnt & vbCrLf & _
          "AND subcategoria_final = 'COMISIONES'" & vbCrLf & _
          "AND estado_validacion IN ('OK', 'Activo', 'REDIRECCIONADO', 'EXCEPCION', 'EXCEPCION_PAGO_TERCERO', 'EXCEPCION_VALOR_FIJO', 'EXCEPCION_PORCENTAJE_EMPRESA', 'EXCEPCION_AUTORIZADA', 'EXCEPCION_SALDO_FAVOR')" & vbCrLf & _
          "ORDER BY nombre_asociado;"
          
    ' 3. CONEXIÓN A POSTGRESQL
    Application.StatusBar = "Conectando a PostgreSQL para Comisiones (" & IIf(mAmbiente = "", "LOCAL", mAmbiente) & ")..."
    Set conn = CreateObject("ADODB.Connection")
    conn.Open ObtenerCadenaConexion()
    
    ' 4. EJECUTAR SQL
    Application.StatusBar = "Consultando Comisiones (Corte: Mes " & mesAnt & ")..."
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
    Application.StatusBar = "Cargando Comisiones en Excel..."
    
    If rs.EOF Then
        MsgBox "No se encontraron comisiones pendientes para procesar desde el mes anterior (" & mesAnt & "/" & anioAnt & ").", vbInformation
        GoTo Finalizar
    End If
    
    Dim iCol As Integer
    ' Cabeceras en fila 5
    For iCol = 0 To rs.Fields.Count - 1
        wsData.Cells(5, iCol + 1).Value = rs.Fields(iCol).Name
        wsData.Cells(5, iCol + 1).Font.Bold = True
        wsData.Cells(5, iCol + 1).Interior.Color = RGB(0, 102, 204) ' Azul brillante distintivo
        wsData.Cells(5, iCol + 1).Font.Color = RGB(255, 255, 255)
    Next iCol
    
    ' Pegar Datos
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
    tbl.TableStyle = "TableStyleMedium6"
    
    ' Formato Numérico
    wsData.Columns.AutoFit
    ' La columna 5 es "VALOR"
    wsData.Range(wsData.Cells(6, 5), wsData.Cells(lastRow, 5)).NumberFormat = "$ #,##0.00"
    
    totalRegs = lastRow - 5
    
Finalizar:
    rs.Close
    conn.Close
    Set rs = Nothing
    Set conn = Nothing
    wsParams.Activate
    Application.StatusBar = False
    If totalRegs > 0 Then
        MsgBox "Extracción de Comisiones completada." & vbCrLf & _
               "Periodo Cobro: " & mes & "/" & anio & " (Corte: " & mesAnt & ")" & vbCrLf & _
               "Registros: " & totalRegs, vbInformation, "Éxito"
    End If
    Exit Sub

ErrorHandler:
    Application.StatusBar = False
    MsgBox "Error en extracción de comisiones: " & Err.Description, vbCritical, "Error"
    If Not rs Is Nothing Then If rs.State = 1 Then rs.Close
    If Not conn Is Nothing Then If conn.State = 1 Then conn.Close
End Sub
