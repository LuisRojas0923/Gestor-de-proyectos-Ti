-- =====================================================
-- SCRIPT PARA EJECUTAR STORED PROCEDURES
-- =====================================================
-- Ejecutar este script en la base de datos para crear los SPs
-- =====================================================

-- Ejecutar el SP de proveedores
CALL sp_get_providers_from_activities();

-- Probar la función de homologación
SELECT fn_homologar_proveedor('Ingesoft Colombia') as homologado;
SELECT fn_homologar_proveedor('ORACLE CORPORATION') as homologado;
SELECT fn_homologar_proveedor('TI Interno') as homologado;
SELECT fn_homologar_proveedor('ITC SAS') as homologado;
SELECT fn_homologar_proveedor('Sin Proveedor') as homologado;
