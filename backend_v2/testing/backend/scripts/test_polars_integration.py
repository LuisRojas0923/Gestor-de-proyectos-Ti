import polars as pl

# Crear un dataframe simple
df = pl.DataFrame({"A": [1], "B": [2]})
print("Column names:", df.columns)

# Intentar leer desde bytes asumiendo no headers (aunque fsspec/xlsx es complejo en scratch)
# Solo imprimiremos df.columns de una lectura genérica si polars lo permite sin excel
# En realidad, la mayoría de lectores de polars cuando has_header=False usan column_0, column_1...
# Vamos a confiar en el estándar de Polars/Pandas para esto.
