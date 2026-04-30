$path = 'c:\Users\amejoramiento6\Gestor-de-proyectos-Ti\backend_v2\app\services\ia\chat_service.py'
$content = Get-Content $path -Raw
$pattern = '        - \*\*Inferencia\*\*: Deduce la Categoría \(IDs: \{categorias_str\}\), el Impacto y la Temporalidad a partir del contexto\.'
$replacement = '        - **Inferencia de Categoría (REGLAS ESTRICTAS)**:
            1. Si el usuario menciona **Correos (Outlook/Gmail)** o **Siigo**, usa: `soporte_software`.
            2. Si solicita **Mouse, Teclado o UPS NUEVOS**, usa: `compras_hardware`.
            3. Si solicita **Licencias** de cualquier tipo, usa: `compra_licencias`.
            4. Solo si se detectó un activo específico del inventario en el contexto anterior, usa: `soporte_mejora`.
            5. Para otros casos, elige de esta lista: {categorias_str}'

$newContent = $content -replace $pattern, $replacement
$newContent | Set-Content $path -Encoding utf8
