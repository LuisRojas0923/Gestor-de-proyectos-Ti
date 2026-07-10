import re
file_path = r'c:\Users\amejoramiento3\Desktop\DESCUENTOS_NOMINA_REFRIDCOL_SOLID\Gestor-de-proyectos-Ti\frontend\src\pages\ServicePortal\pages\RequisicionPersonal\pages\PrintRequisicionRP.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('className="text-right font-medium"', 'className="text-right font-medium text-[8px]"')
content = content.replace('className="text-left font-medium w-3/4"', 'className="text-left font-medium text-[8px] w-3/4"')
content = content.replace('className="text-left font-medium whitespace-pre-wrap"', 'className="text-left font-medium text-[8px] whitespace-pre-wrap"')
content = content.replace('className="text-left font-medium w-2/3"', 'className="text-left font-medium text-[8px] w-2/3"')
content = content.replace('className="text-right font-black"', 'className="text-right font-black text-[9px]"')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
