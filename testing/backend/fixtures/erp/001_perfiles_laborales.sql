CREATE ROLE erp_read_test LOGIN PASSWORD 'erp_read_test_only';

CREATE TABLE establecimiento (
    nrocedula VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(255),
    viaticante VARCHAR(10),
    baseviaticos NUMERIC,
    correocorporativo VARCHAR(255)
);

CREATE TABLE contrato (
    numerocontrato VARCHAR(100) PRIMARY KEY,
    establecimiento VARCHAR(50),
    cargo VARCHAR(255),
    area VARCHAR(255),
    estado VARCHAR(30),
    empresa VARCHAR(255),
    ciudadcontratacion VARCHAR(255),
    centrocosto VARCHAR(255),
    jefe VARCHAR(255),
    riesgoarl VARCHAR(100),
    fechainicio DATE,
    fecharetiro DATE
);

CREATE TABLE beneficio (
    contrato VARCHAR(100),
    estado VARCHAR(30),
    autorizacionhorasextras BOOLEAN,
    salario NUMERIC
);

INSERT INTO establecimiento (
    nrocedula, nombre, viaticante, baseviaticos, correocorporativo
) VALUES (
    '1000000001', 'USUARIO ERP TEST', 'N', 0, 'erp-test@example.invalid'
);

INSERT INTO contrato (
    numerocontrato, establecimiento, cargo, area, estado,
    empresa, ciudadcontratacion, centrocosto, fechainicio
) VALUES
    ('1000000001-1', '1000000001', 'CARGO ANTERIOR', 'TI', 'Terminado',
     'EMPRESA TEST', 'CALI', '001', DATE '2024-01-01'),
    ('1000000001-2', '1000000001', 'CARGO VIGENTE', 'TI', 'Activo',
     'EMPRESA TEST', 'CALI', '001', DATE '2025-01-01');

GRANT CONNECT ON DATABASE solidpruebas3 TO erp_read_test;
GRANT USAGE ON SCHEMA public TO erp_read_test;
GRANT SELECT ON establecimiento, contrato, beneficio TO erp_read_test;
