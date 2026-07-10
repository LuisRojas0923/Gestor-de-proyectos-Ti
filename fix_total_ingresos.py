import re
file_path = r'c:\Users\amejoramiento3\Desktop\DESCUENTOS_NOMINA_REFRIDCOL_SOLID\Gestor-de-proyectos-Ti\frontend\src\pages\ServicePortal\pages\RequisicionPersonal\pages\PrintRequisicionRP.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('text-right font-black text-slate-800 text-[8px]', 'text-right font-black text-slate-800 text-[12px]')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
