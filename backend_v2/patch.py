with open(r'c:\Users\amejoramiento3\Desktop\DESCUENTOS_NOMINA_REFRIDCOL_SOLID\Gestor-de-proyectos-Ti\backend_v2\app\api\novedades_nomina\nomina_router.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_endpoints = """
# ── BENEFICIAR ─────────────────────────────────────────────────────────────

@router.post("/beneficiar/preview")
async def preview_beneficiar(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
):
    \"\"\"Procesa Excel de BENEFICIAR, enriquece con ERP, guarda en BD.\"\"\"
    archivos_binarios = []
    for f in files:
        contenido = await f.read()
        archivos_binarios.append(contenido)

    rows, summary, warnings_txt = extraer_beneficiar(archivos_binarios)
    summary["mes"] = mes
    summary["anio"] = anio

    # ── Retirados con pago externo ────────────────────────────────────────────
    RETIRADOS_PAGO_EXTERNO: dict = {
        "16783959": {"nombre": "DELGADO REINA ALEXANDER", "empresa": "REFRIDCOL", "motivo": "RETIRADO - Pago externo"},
        "31977462": {"nombre": "PARRA TRUJILLO LILIANA",  "empresa": "REFRIDCOL", "motivo": "RETIRADO - Pago externo"},
    }

    warnings_detalle = []
    cedulas_solo_informativas: set = set(RETIRADOS_PAGO_EXTERNO.keys())
    cedulas_sin_erp = cedulas_solo_informativas

    if db_erp is not None:
        cedulas_para_erp = list(
            set(r["cedula"] for r in rows if r["cedula"] not in cedulas_sin_erp)
        )
        mapa_erp = EmpleadosService.consultar_empleados_bulk(db_erp, cedulas_para_erp)

        for row in rows:
            ced = row["cedula"]
            if ced in cedulas_sin_erp:
                continue
            info = mapa_erp.get(ced)
            if info:
                row["nombre_asociado"] = info["nombre"] or row.get("nombre_asociado", "")
                row["empresa"] = info["empresa"] or row.get("empresa", "")
                row["estado_erp"] = info["estado"]
            else:
                row["estado_erp"] = "NO ENCONTRADO"

        cedulas_ya = set()
        for row in rows:
            ced = row["cedula"]
            if ced in cedulas_sin_erp:
                continue
            if ced in cedulas_ya:
                continue
            cedulas_ya.add(ced)
            estado = row.get("estado_erp", "")
            if estado == "NO ENCONTRADO":
                warnings_detalle.append({
                    "cedula": ced,
                    "nombre": row.get("nombre_asociado", "Desconocido"),
                    "motivo": "No encontrada en ERP",
                })
            elif estado and estado.upper() != "ACTIVO":
                warnings_detalle.append({
                    "cedula": ced,
                    "nombre": row.get("nombre_asociado", "Desconocido"),
                    "motivo": f"Estado: {estado}",
                })
    else:
        warnings_txt.append("ERP no disponible: datos no enriquecidos.")

    # ── Aplicar retirados con pago externo ───────────────────────────
    for row in rows:
        ced = row["cedula"]
        if ced in RETIRADOS_PAGO_EXTERNO:
            ret = RETIRADOS_PAGO_EXTERNO[ced]
            row["nombre_asociado"] = ret["nombre"]
            row["empresa"] = ret["empresa"]
            row["estado_erp"] = "RETIRADO"
            if not any(w["cedula"] == ced for w in warnings_detalle):
                warnings_detalle.append({
                    "cedula": ced,
                    "nombre": ret["nombre"],
                    "motivo": ret["motivo"],
                })

    cedulas_warning = set(
        w["cedula"] for w in warnings_detalle
        if w["cedula"] not in cedulas_solo_informativas
    )
    motivo_por_cedula = {w["cedula"]: w["motivo"] for w in warnings_detalle}
    rows_validas = [r for r in rows if r["cedula"] not in cedulas_warning]
    rows_warning = [r for r in rows if r["cedula"] in cedulas_warning]

    summary["total_asociados"] = len(set(r["cedula"] for r in rows_validas))
    summary["total_filas"] = len(rows_validas)
    summary["total_valor"] = sum(r["valor"] for r in rows_validas)
    summary["total_warnings"] = len(warnings_detalle)
    summary["total_filas_con_warnings"] = len(rows)

    from sqlalchemy import delete
    from datetime import datetime
    import hashlib

    stmt_del = delete(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "BENEFICIAR",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    await session.execute(stmt_del)

    archivo = NominaArchivo(
        nombre_archivo=f"beneficiar_{mes}_{anio}.xls",
        hash_archivo=hashlib.md5(archivos_binarios[0][:1024]).hexdigest() if archivos_binarios else "none",
        tamaño_bytes=sum(len(b) for b in archivos_binarios),
        tipo_archivo="xls",
        ruta_almacenamiento="memory",
        mes_fact=mes,
        año_fact=anio,
        categoria="COOPERATIVAS",
        subcategoria="BENEFICIAR",
        estado="Procesado",
    )
    session.add(archivo)
    await session.flush()

    for idx, row in enumerate(rows_validas):
        motivo = motivo_por_cedula.get(row["cedula"], "OK")
        reg = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes, año_fact=anio,
            cedula=row["cedula"],
            nombre_asociado=row.get("nombre_asociado", ""),
            valor=row["valor"],
            empresa=row.get("empresa", ""),
            concepto=row["concepto"],
            categoria_final="COOPERATIVAS",
            subcategoria_final="BENEFICIAR",
            estado_validacion=motivo,
            fila_origen=idx + 1,
        )
        session.add(reg)

    for idx, row in enumerate(rows_warning):
        motivo = motivo_por_cedula.get(row["cedula"], "ADVERTENCIA")
        reg = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes, año_fact=anio,
            cedula=row["cedula"],
            nombre_asociado=row.get("nombre_asociado", ""),
            valor=row["valor"],
            empresa=row.get("empresa", ""),
            concepto=row["concepto"],
            categoria_final="COOPERATIVAS",
            subcategoria_final="BENEFICIAR",
            estado_validacion=motivo,
            fila_origen=len(rows_validas) + idx + 1,
        )
        session.add(reg)

    await session.commit()
    
    # Formateo de salida como solicita el usuario: # CEDULA NOMBRE EMPRESA VALOR CONCEPTO
    formatted_rows = []
    for r in rows_validas:
        formatted_rows.append({
            "CEDULA": r["cedula"],
            "NOMBRE": r.get("nombre_asociado", ""),
            "EMPRESA": r.get("empresa", ""),
            "VALOR": r["valor"],
            "CONCEPTO": r["concepto"]
        })

    return {
        "rows": formatted_rows,
        "summary": summary,
        "warnings": warnings_txt,
        "warnings_detalle": warnings_detalle,
    }


@router.get("/beneficiar/datos")
async def obtener_datos_beneficiar(
    mes: int = Query(...),
    anio: int = Query(...),
    session: Session = Depends(obtener_db),
):
    \"\"\"Devuelve datos BENEFICIAR guardados para un mes/año.\"\"\"
    stmt = select(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "BENEFICIAR",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    result = await session.execute(stmt)
    registros = result.scalars().all()

    rows = []
    warnings_detalle = []
    total_valor = 0.0

    for r in registros:
        data_item = {
            "CEDULA": r.cedula,
            "NOMBRE": r.nombre_asociado or "",
            "EMPRESA": r.empresa,
            "VALOR": r.valor,
            "CONCEPTO": r.concepto,
            "estado_validacion": r.estado_validacion
        }
        if r.estado_validacion == "OK":
            rows.append(data_item)
            total_valor += r.valor
        elif r.estado_validacion.startswith("RETIRADO"):
            rows.append(data_item)
            total_valor += r.valor
            warnings_detalle.append({
                "cedula": r.cedula,
                "nombre": r.nombre_asociado or "",
                "motivo": r.estado_validacion
            })
        else:
            warnings_detalle.append({
                "cedula": r.cedula,
                "nombre": r.nombre_asociado or "",
                "motivo": r.estado_validacion
            })

    summary = {
        "mes": mes, "anio": anio,
        "total_asociados": len(set(r["CEDULA"] for r in rows)),
        "total_filas": len(rows),
        "total_valor": total_valor,
        "total_warnings": len(warnings_detalle)
    }

    return {
        "rows": rows,
        "summary": summary,
        "warnings_detalle": warnings_detalle
    }

"""

lines.insert(520, new_endpoints)

with open(r'c:\Users\amejoramiento3\Desktop\DESCUENTOS_NOMINA_REFRIDCOL_SOLID\Gestor-de-proyectos-Ti\backend_v2\app\api\novedades_nomina\nomina_router.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)
