import os
import re

files_to_fix = [
    'components/ConfigTemporalesModal.tsx',
    'components/DetalleCandidatoDrawer.tsx',
    'components/MetricasAnalisisTab.tsx',
    'components/MetricasCedula.tsx',
    'components/MetricasRPModal.tsx',
    'components/modals/AgregarCandidatoModal.tsx',
    'components/modals/CausalesDescarteConfigModal.tsx',
    'components/modals/DevolverModificacionModal.tsx',
    'pages/BandejaGestionHumana.tsx',
    'pages/DetalleRequisicion.tsx',
    'pages/PrintRequisicionRP.tsx',
    'pages/NuevaRequisicion/ModalSimuladorCentroCosto.tsx',
    'pages/NuevaRequisicion/NuevaRequisicionWizard.tsx',
    'pages/NuevaRequisicion/SeccionAreaCargo.tsx',
    'pages/NuevaRequisicion/SeccionDatosGenerales.tsx',
    'pages/NuevaRequisicion/SeccionEquiposDotacion.tsx',
    'pages/NuevaRequisicion/SeccionResumenConfirmacion.tsx'
]

base_dir = r'c:\Users\amejoramiento3\Desktop\DESCUENTOS_NOMINA_REFRIDCOL_SOLID\Gestor-de-proyectos-Ti\frontend\src\pages\ServicePortal\pages\RequisicionPersonal'

for rel_path in files_to_fix:
    full_path = os.path.join(base_dir, rel_path.replace('/', '\\'))
    if not os.path.exists(full_path):
        continue
    
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()

    orig_content = content
    
    depth = len(rel_path.split('/')) - 1
    prefix = '../' * (4 + depth) + 'components/atoms'

    imports_to_add = []
    
    if '<Text ' in content and not re.search(r'import \{[^}]*\bText\b[^}]*\}', content):
        imports_to_add.append('Text')
    if '<Button ' in content and not re.search(r'import \{[^}]*\bButton\b[^}]*\}', content):
        imports_to_add.append('Button')
    if '<Textarea' in content and not re.search(r'import \{[^}]*\bTextarea\b[^}]*\}', content):
        imports_to_add.append('Textarea')

    if imports_to_add:
        # Check if we already import from atoms
        # e.g., import { Input, Badge } from '../../../components/atoms'
        match = re.search(r'import\s+\{([^}]+)\}\s+from\s+[\'\"](?:.*?/)*components/atoms[\'\"];?', content)
        if match:
            existing_imports = match.group(1)
            new_imports = existing_imports
            for imp in imports_to_add:
                if imp not in existing_imports:
                    new_imports += f', {imp}'
            content = content.replace(match.group(0), f'import {{{new_imports}}} from \'{prefix}\';')
        else:
            # Add new import after the last import
            last_import_idx = content.rfind('import ')
            if last_import_idx != -1:
                end_of_last_import = content.find(';', last_import_idx)
                if end_of_last_import != -1:
                    end_of_last_import += 1
                else:
                    end_of_last_import = content.find('\n', last_import_idx) + 1
                
                content = content[:end_of_last_import] + f'\nimport {{ {", ".join(imports_to_add)} }} from \'{prefix}\';\n' + content[end_of_last_import:]
            else:
                content = f'import {{ {", ".join(imports_to_add)} }} from \'{prefix}\';\n' + content

    if content != orig_content:
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Added imports to {rel_path}')
