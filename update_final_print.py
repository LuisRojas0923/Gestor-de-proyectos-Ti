import re
file_path = r'c:\Users\amejoramiento3\Desktop\DESCUENTOS_NOMINA_REFRIDCOL_SOLID\Gestor-de-proyectos-Ti\frontend\src\pages\ServicePortal\pages\RequisicionPersonal\pages\PrintRequisicionRP.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix TOTAL INGRESOS label
content = content.replace('font-bold text-slate-800 text-[6px]', 'font-bold text-slate-800 text-[12px]')

# Add margin top to firmas to lower them
content = content.replace('<div className="grid grid-cols-3 gap-6 pt-2 items-start">', '<div className="grid grid-cols-3 gap-6 pt-6 mt-6 items-start">')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
