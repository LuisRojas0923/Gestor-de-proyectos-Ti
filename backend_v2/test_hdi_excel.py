import pandas as pd
import sys

file_path = "c:/Users/amejoramiento3/Desktop/DESCUENTOS_NOMINA_REFRIDCOL_SOLID/Gestor-de-proyectos-Ti/ARCHIVO_PLANO_JULIO_2026.xlsx"

try:
    # Read the first few rows to understand structure
    df_raw = pd.read_excel(file_path, nrows=10)
    print("RAW HEAD:")
    print(df_raw.head())

    print("\nCOLUMNS:")
    for i, col in enumerate(df_raw.columns):
        print(f"Col {i}: {col}")

    # Read with forward fill to see how pandas handles merged cells
    df_ffill = pd.read_excel(file_path)
    # Typically, pandas reads merged cells by putting the value in the top-left cell
    # and NaNs in the rest.
    # We will forward fill the 'L' column (which is index 11, but let's find the exact name).
    # Since the first row might be empty, we skip it.
    df_skip = pd.read_excel(file_path, skiprows=1)
    print("\nHEAD AFTER SKIPROWS=1:")
    print(df_skip.head())

    # Check L column name (index 11)
    if len(df_skip.columns) > 11:
        col_L = df_skip.columns[11]
        print(f"\nColumn L name: '{col_L}'")

        # Test forward fill on column L
        sample_L = df_skip[col_L].head(20).tolist()
        print("First 20 raw values in Col L:")
        print(sample_L)

        filled_L = df_skip[col_L].ffill().head(20).tolist()
        print("First 20 ffill values in Col L:")
        print(filled_L)

except Exception as e:
    print("Error reading excel:", e)
