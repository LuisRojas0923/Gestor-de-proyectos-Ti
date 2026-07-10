import os

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
    
    content = content.replace("as='span'", "as=\"span\"") # Standardize while at it
    content = content.replace("as=\\'span\\'", "as=\"span\"")
    content = content.replace("color=\\'inherit\\'", "color=\"inherit\"")
    content = content.replace("variant=\\'custom\\'", "variant=\"custom\"")
    content = content.replace("as=\\'label\\'", "as=\"label\"")
    
    if content != orig_content:
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Fixed backslashes in {rel_path}')
