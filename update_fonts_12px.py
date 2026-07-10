import re
file_path = r'c:\Users\amejoramiento3\Desktop\DESCUENTOS_NOMINA_REFRIDCOL_SOLID\Gestor-de-proyectos-Ti\frontend\src\pages\ServicePortal\pages\RequisicionPersonal\pages\PrintRequisicionRP.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('className="text-right font-medium text-[8px]"', 'className="text-right font-medium text-[12px]"')
content = content.replace('className="text-left font-medium text-[8px] w-3/4"', 'className="text-left font-medium text-[12px] w-3/4"')
content = content.replace('className="text-left font-medium text-[8px] whitespace-pre-wrap"', 'className="text-left font-medium text-[12px] whitespace-pre-wrap"')
content = content.replace('className="text-left font-medium text-[8px] w-2/3"', 'className="text-left font-medium text-[12px] w-2/3"')
# For Total Ingresos, let's keep it bold but change 8px to 12px or maybe 14px? Since standard values are 12px, let's make total 14px?
content = content.replace('className="text-right font-black text-[9px]"', 'className="text-right font-black text-[12px]"')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
