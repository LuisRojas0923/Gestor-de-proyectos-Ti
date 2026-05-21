Attribute VB_Name = "ModuloConexionNomina"
' ====================================================================
' MÓDULO CENTRAL DE CONEXIÓN A BASE DE DATOS (NÓMINA)
' Centraliza el ambiente activo y la cadena de conexión SQL.
' ====================================================================

Option Explicit

' --- AMBIENTE ACTIVO GLOBAL ---
Public mAmbiente As String

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

' --- SWITCH AMBIENTE CENTRALIZADO ---

Public Sub CambiarAmbiente()
    Dim opcion As String
    opcion = InputBox( _
        "Seleccione el ambiente de conexión:" & vbCrLf & vbCrLf & _
        "1 = LOCAL  (127.0.0.1:5433)" & vbCrLf & _
        "2 = DEV    (192.168.0.21:5432)" & vbCrLf & _
        "3 = PROD   (192.168.0.21:5433)" & vbCrLf & vbCrLf & _
        "Ambiente actual: " & IIf(mAmbiente = "", "NO DEFINIDO", mAmbiente), _
        "Seleccionar Ambiente", "1")
    
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

' --- OBTENER CADENA DE CONEXIÓN ---

Public Function ObtenerCadenaConexion() As String
    Dim srv As String, prt As String
    
    If mAmbiente = "" Then mAmbiente = "LOCAL"
    
    Select Case mAmbiente
        Case "LOCAL"
            srv = "127.0.0.1"
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
