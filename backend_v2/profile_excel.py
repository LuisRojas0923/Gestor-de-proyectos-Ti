
import pandas as pd
import time
import io

def profile_read_excel():
    print("Profiling pd.read_excel...")
    # Crear un excel grande
    data = {'C1': range(5000), 'C2': range(5000)}
    df = pd.DataFrame(data)
    
    start = time.time()
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False)
    print(f"Write time: {time.time() - start:.2f}s")
    
    content = output.getvalue()
    
    start = time.time()
    df2 = pd.read_excel(io.BytesIO(content))
    print(f"Read time: {time.time() - start:.2f}s")

if __name__ == "__main__":
    profile_read_excel()
