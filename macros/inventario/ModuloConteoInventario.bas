Attribute VB_Name = "ModuloConteoInventario"
' ====================================================================
' MACROS PARA EXTRACCIÓN DE CONTEO FÍSICO DE INVENTARIO
' Base de datos: project_manager (Portal)
' Tabla: conteoinventario + asignacioninventario
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

Sub CambiarAmbiente()
    ' Permite al usuario seleccionar el ambiente de conexión
    Dim opcion As String
    opcion = InputBox( _
        "Seleccione el ambiente de conexión:" & vbCrLf & vbCrLf & _
        "1 = LOCAL  (192.168.40.166:5432)" & vbCrLf & _
        "2 = DEV    (192.168.0.21:5432)" & vbCrLf & _
        "3 = PROD   (192.168.0.21:5433)" & vbCrLf & vbCrLf & _
        "Ambiente actual: " & IIf(mAmbiente = "", "NO DEFINIDO", mAmbiente), _
        "Seleccionar Ambiente", "2")
    
    Select Case Trim(opcion)
        Case "1": mAmbiente = "LOCAL"
        Case "2": mAmbiente = "DEV"
        Case "3": mAmbiente = "PROD"
        Case Else
            MsgBox "Opción no válida. Se mantiene: " & IIf(mAmbiente = "", "DEV (default)", mAmbiente), vbExclamation
            If mAmbiente = "" Then mAmbiente = "DEV"
            Exit Sub
    End Select
    
    MsgBox "Ambiente cambiado a: " & mAmbiente, vbInformation, "Ambiente Activo"
End Sub

Private Function ObtenerCadenaConexion() As String
    ' Retorna la cadena ODBC según el ambiente activo
    Dim srv As String, prt As String
    
    If mAmbiente = "" Then mAmbiente = "DEV" ' Default
    
    Select Case mAmbiente
        Case "LOCAL"
            srv = "192.168.40.166"
            prt = "5432"
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

' --- SUBS DE CONTEO ---

Sub EjecutarConteo1()
    Call EjecutarConteo(1)
End Sub

Sub EjecutarConteo2()
    Call EjecutarConteo(2)
End Sub

Sub EjecutarConteo3()
    Call EjecutarConteo(3)
End Sub

' --- PROCESO PRINCIPAL GENÉRICO ---

Private Sub EjecutarConteo(ByVal ronda As Integer)
    Dim conn As Object
    Dim rs As Object
    Dim ws As Worksheet
    Dim sql As String
    Dim col As Long
    Dim totalRegs As Long
    Dim nombreHoja As String
    Dim nombreTabla As String
    
    nombreHoja = "BD_CONTEO" & ronda
    nombreTabla = "BD_CONTEO" & ronda
    
    On Error GoTo ErrorHandler
    
    ' 1. CONSTRUIR SQL DINÁMICO SEGÚN RONDA
    sql = "SELECT " & vbCrLf & _
          "    ROW_NUMBER() OVER(ORDER BY c.bodega, c.bloque, c.estante, c.nivel, c.codigo) AS ""No.""" & "," & vbCrLf & _
          "    a.id AS ""No. Planilla""," & vbCrLf & _
          "    '' AS ""Column3""," & vbCrLf & _
          "    c.b_siigo AS ""B. Siigo""," & vbCrLf & _
          "    c.bodega AS ""Bodega""," & vbCrLf & _
          "    c.bloque AS ""Bloque""," & vbCrLf & _
          "    c.estante AS ""Estante""," & vbCrLf & _
          "    c.nivel AS ""Nivel""," & vbCrLf & _
          "    '' AS ""Column9""," & vbCrLf & _
          "    c.codigo AS ""Codigo""," & vbCrLf & _
          "    c.descripcion AS ""Descripcion""," & vbCrLf & _
          "    c.unidad AS ""Und.""" & "," & vbCrLf & _
          "    '' AS ""Column13""," & vbCrLf & _
          "    c.cant_c" & ronda & " AS ""Cant.""" & "," & vbCrLf & _
          "    '' AS ""Column15""," & vbCrLf & _
          "    COALESCE(c.obs_c" & ronda & ", '') AS ""Observaciones:""," & vbCrLf & _
          "    COALESCE(c.user_c" & ronda & ", '') AS ""DIGITADOR""," & vbCrLf & _
          "    CASE WHEN c.user_c" & ronda & " IS NOT NULL THEN 1 ELSE 0 END AS ""Contar""," & vbCrLf & _
          "    c.codigo || '-' || COALESCE(c.b_siigo::TEXT, '0') || '-" & ronda & "' AS ""Llave""," & vbCrLf & _
          "    c.codigo || '-' || COALESCE(c.b_siigo::TEXT, '0') || '-" & ronda & "' AS ""Columna1""" & vbCrLf & _
          "FROM conteoinventario c" & vbCrLf & _
          "LEFT JOIN asignacioninventario a" & vbCrLf & _
          "    ON c.bodega = a.bodega AND c.bloque = a.bloque" & vbCrLf & _
          "       AND c.estante = a.estante AND c.nivel = a.nivel" & vbCrLf & _
          "ORDER BY c.bodega, c.bloque, c.estante, c.nivel, c.codigo;"
    
    ' 2. CONEXIÓN A POSTGRESQL
    Application.StatusBar = "Conectando a PostgreSQL (" & mAmbiente & ")..."
    Set conn = CreateObject("ADODB.Connection")
    conn.Open ObtenerCadenaConexion()
    
    ' 3. EJECUTAR SQL
    Application.StatusBar = "Ejecutando consulta Conteo " & ronda & "..."
    Set rs = conn.Execute(sql)
    
    ' 4. PREPARAR HOJA
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets(nombreHoja)
    If ws Is Nothing Then
        Set ws = ThisWorkbook.Worksheets.Add
        ws.Name = nombreHoja
    End If
    
    ' 5. PATRÓN A11: LIMPIAR TABLA SIN DESTRUIRLA
    Dim tbl As ListObject
    Set tbl = ws.ListObjects(nombreTabla)
    
    If Not tbl Is Nothing Then
        ' Borrar contenido de datos pero mantener el objeto tabla
        If Not tbl.DataBodyRange Is Nothing Then
            tbl.DataBodyRange.ClearContents
            ' Borrar filas sobrantes si hay más de 1
            If tbl.ListRows.Count > 1 Then
                tbl.DataBodyRange.Offset(1, 0).Resize( _
                    tbl.ListRows.Count - 1, tbl.ListColumns.Count).Rows.Delete
            End If
        End If
    Else
        ws.Cells.Clear
    End If
    On Error GoTo ErrorHandler
    
    ' 6. ESCRIBIR ENCABEZADOS (solo si la tabla no existía)
    If tbl Is Nothing Then
        For col = 0 To rs.Fields.Count - 1
            ws.Cells(1, col + 1).Value = rs.Fields(col).Name
            ws.Cells(1, col + 1).Font.Bold = True
            ws.Cells(1, col + 1).Interior.Color = RGB(0, 32, 96)
            ws.Cells(1, col + 1).Font.Color = RGB(255, 255, 255)
        Next col
    End If
    
    ' 7. VOLCAR DATOS
    Application.StatusBar = "Cargando datos en Excel..."
    ws.Cells(2, 1).CopyFromRecordset rs
    
    ' 8. CONTAR REGISTROS Y REDIMENSIONAR TABLA
    totalRegs = ws.Cells(ws.Rows.Count, 1).End(-4162).Row - 1 ' -4162 = xlUp
    
    If totalRegs > 0 Then
        Dim tblRange As Range
        Set tblRange = ws.Range(ws.Cells(1, 1), ws.Cells(totalRegs + 1, rs.Fields.Count))
        
        If tbl Is Nothing Then
            ' Crear tabla nueva si no existía
            Set tbl = ws.ListObjects.Add(1, tblRange, , 1) ' xlSrcRange, xlYes
            tbl.Name = nombreTabla
            tbl.TableStyle = "TableStyleMedium2"
        Else
            ' Redimensionar tabla existente al rango con datos
            tbl.Resize tblRange
        End If
        
        ' Formato de columnas
        ws.Columns.AutoFit
        
        ' Formato numérico para Cant.
        Dim cantCol As Long
        cantCol = 14 ' Columna N (Cant.)
        ws.Columns(cantCol).NumberFormat = "#,##0.0"
    End If
    
    ' 9. LIMPIEZA
    rs.Close
    conn.Close
    Set rs = Nothing
    Set conn = Nothing
    
    Application.StatusBar = False
    MsgBox "Conteo " & ronda & " descargado con éxito." & vbCrLf & _
           "Ambiente: " & mAmbiente & vbCrLf & _
           "Registros importados: " & totalRegs, vbInformation, "Éxito"
    Exit Sub

ErrorHandler:
    Application.StatusBar = False
    MsgBox "Error en Conteo " & ronda & ": " & Err.Description & vbCrLf & _
           "Ambiente: " & IIf(mAmbiente = "", "NO DEFINIDO", mAmbiente), _
           vbCritical, "Error en Macro"
    If Not rs Is Nothing Then If rs.State = 1 Then rs.Close
    If Not conn Is Nothing Then If conn.State = 1 Then conn.Close
End Sub
