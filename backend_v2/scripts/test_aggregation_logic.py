import polars as pl

# Mocking the aggregation logic from router.py to verify it works as expected
def test_aggregation():
    # Simulamos el DataFrame que resultaría de la lectura del Excel basado en los índices
    # col3: MIN, col5: DESC, col6: VALOR, col7: IMP, col9: TOTAL
    data = {
        "column_3": ["3001234567", "3001234567", "3001234567", "3001112222"],
        "column_5": ["Cargo Fijo voz", "Plan de Datos", "Roaming Internacional", "Cargo Fijo voz"],
        "column_6": [50000, 30000, 10000, 50000],
        "column_7": [9500, 5700, 1900, 9500],
        "column_9": [59500, 35700, 11900, 59500]
    }
    
    df = pl.DataFrame(data)
    cols = df.columns
    
    # Simulación de la limpieza en router.py
    data_cleaned = df.select([
        pl.col(cols[0]).alias("min"),
        pl.col(cols[1]).alias("descripcion"),
        pl.col(cols[2]).cast(pl.Float64).alias("valor"),
        pl.col(cols[3]).cast(pl.Float64).alias("impuestos"),
        pl.col(cols[4]).cast(pl.Float64).alias("total_fila")
    ])
    
    c_fijo_pat = "Cargo Fijo|Datos|Claro Sync"
    especiales_pat = "Roaming|NBA|Larga Distancia|Especiales"

    consumos = data_cleaned.group_by("min").agg([
        pl.col("valor").filter(pl.col("descripcion").cast(pl.Utf8).str.contains(c_fijo_pat)).sum().alias("cargo_mes"),
        pl.col("valor").filter(pl.col("descripcion").cast(pl.Utf8).str.contains(especiales_pat)).sum().alias("especiales"),
        pl.col("impuestos").sum().alias("iva_19"),
        pl.col("total_fila").sum().alias("total")
    ])
    
    # Validaciones
    linea1 = consumos.filter(pl.col("min") == "3001234567")
    assert linea1["cargo_mes"][0] == 80000 # 50000 + 30000
    assert linea1["especiales"][0] == 10000 # 10000
    assert linea1["total"][0] == 107100 # 59500 + 35700 + 11900
    
    print("\n¡Prueba de lógica de agregación EXITOSA!")

if __name__ == "__main__":
    test_aggregation()
