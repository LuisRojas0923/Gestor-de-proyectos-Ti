import re
import os

files_to_check = [
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\pages\Chat.tsx",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\alerts\ActivityForm.tsx",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\alerts\AlertPanel.tsx",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\atoms\Icon.tsx",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\atoms\MaterialCard.tsx",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\atoms\MaterialTypography.tsx",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development\DevelopmentPhases.tsx",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\pages\MyDevelopments\components\views\ListView\DevelopmentStatistics.tsx",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\pages\MyDevelopments\components\views\ListView\DevelopmentTable.tsx",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\pages\DevelopmentDetail\ActivityLogTab.tsx",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\pages\DevelopmentDetail\GeneralInfoTab.tsx",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\pages\MyDevelopments\components\modals\ActivityCreateModal.tsx",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\pages\Reports\sections\PortalCardsMobile.tsx",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\pages\Reports\sections\PortalTableDesktop.tsx",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\pages\ServicePortal\CategoryView.tsx",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\pages\ServicePortal\DashboardView.tsx",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\pages\ServicePortal\LoginView.tsx",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\pages\ServicePortal\SuccessView.tsx",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\pages\ServicePortal\TicketDetailView.tsx",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\pages\ServicePortal\TicketFormView.tsx",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\pages\ServicePortal\TicketListView.tsx",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\pages\TicketManagement.tsx",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\pages\Dashboard.tsx",
    # agregar una ruta principal que es pages y debe mirar todo lo que contiene 
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\pages",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\atoms",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\molecules",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\organisms",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\templates",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\alerts",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  
    r"c:\Users\amejoramiento6\Desktop\Gestor de proyectos\Gestor-de-proyectos-Ti\frontend\src\components\development",  

print("=== Iniciando Auditoría Headless ===")
violations_found = False

for file_path in files_to_check:
    print(f"Checking: {os.path.basename(file_path)}")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
            
            for name, pattern in patterns.items():
                for i, line in enumerate(lines):    
                    if pattern.search(line):
                        print(f"  [VIOLATION] {name} at line {i+1}: {line.strip()[:50]}...")
                        violations_found = True
    except Exception as e:
        print(f"  [ERROR] Could not read file: {e}")

if not violations_found:
    print("\n✅ No violations found in targeted files!")
else:
    print("\n⚠️ Violations found.")
