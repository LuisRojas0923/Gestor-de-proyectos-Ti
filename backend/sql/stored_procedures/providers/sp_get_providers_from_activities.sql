-- =====================================================
-- STORED PROCEDURE: sp_get_providers_from_activities
-- =====================================================
-- Descripción: Obtiene proveedores homologados que tienen actividades registradas
--              haciendo JOIN entre development_activity_log y developments
-- =====================================================

DELIMITER $$

CREATE PROCEDURE sp_get_providers_from_activities()
BEGIN
    SELECT DISTINCT 
        CASE 
            -- Homologaciones específicas
            WHEN LOWER(d.provider) LIKE '%ingesoft%' THEN 'Ingesoft'
            WHEN LOWER(d.provider) LIKE '%oracle%' THEN 'ORACLE'
            WHEN LOWER(d.provider) LIKE '%itc%' THEN 'ITC'
            WHEN LOWER(d.provider) LIKE '%interno%' OR LOWER(d.provider) LIKE '%ti interno%' THEN 'TI Interno'
            WHEN LOWER(d.provider) LIKE '%coomeva%' THEN 'Coomeva'
            WHEN LOWER(d.provider) LIKE '%softtek%' THEN 'Softtek'
            WHEN LOWER(d.provider) LIKE '%accenture%' THEN 'Accenture'
            WHEN LOWER(d.provider) LIKE '%microsoft%' THEN 'Microsoft'
            WHEN LOWER(d.provider) LIKE '%ibm%' THEN 'IBM'
            WHEN LOWER(d.provider) LIKE '%sap%' THEN 'SAP'
            
            -- Casos especiales
            WHEN d.provider IS NULL OR d.provider = '' THEN 'Sin Proveedor'
            
            -- Mantener original si no hay homologación
            ELSE TRIM(d.provider)
        END AS provider_homologado,
        COUNT(DISTINCT dal.development_id) as cantidad_desarrollos_con_actividades,
        COUNT(dal.id) as total_actividades
    FROM development_activity_log dal
    INNER JOIN developments d ON dal.development_id = d.id
    WHERE d.provider IS NOT NULL 
    GROUP BY provider_homologado
    ORDER BY provider_homologado;
END$$

DELIMITER ;

-- =====================================================
-- PROCEDIMIENTO ALMACENADO PARA HOMOLOGAR PROVEEDOR
-- =====================================================
-- Descripción: Homologa un nombre de proveedor específico
-- =====================================================

DELIMITER $$

CREATE FUNCTION fn_homologar_proveedor(provider_name VARCHAR(255))
RETURNS VARCHAR(255)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE provider_homologado VARCHAR(255);
    
    SET provider_homologado = CASE 
        -- Homologaciones específicas
        WHEN LOWER(provider_name) LIKE '%ingesoft%' THEN 'Ingesoft'
        WHEN LOWER(provider_name) LIKE '%oracle%' THEN 'ORACLE'
        WHEN LOWER(provider_name) LIKE '%itc%' THEN 'ITC'
        WHEN LOWER(provider_name) LIKE '%interno%' OR LOWER(provider_name) LIKE '%ti interno%' THEN 'TI Interno'
        WHEN LOWER(provider_name) LIKE '%coomeva%' THEN 'Coomeva'
        WHEN LOWER(provider_name) LIKE '%softtek%' THEN 'Softtek'
        WHEN LOWER(provider_name) LIKE '%accenture%' THEN 'Accenture'
        WHEN LOWER(provider_name) LIKE '%microsoft%' THEN 'Microsoft'
        WHEN LOWER(provider_name) LIKE '%ibm%' THEN 'IBM'
        WHEN LOWER(provider_name) LIKE '%sap%' THEN 'SAP'
        
        -- Casos especiales
        WHEN provider_name IS NULL OR provider_name = '' THEN 'Sin Proveedor'
        
        -- Mantener original si no hay homologación
        ELSE TRIM(provider_name)
    END;
    
    RETURN provider_homologado;
END$$

DELIMITER ;
