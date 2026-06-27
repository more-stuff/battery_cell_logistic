from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from datetime import datetime
import logging
import uuid
from box_rules import (
    TIPO_NORMAL,
    TIPO_DEFECTUOSA,
    TIPO_CADUCIDAD_PROXIMA,
    TIPOS_CAJA_VALIDOS,
    validar_celda_para_tipo_caja,
    get_config_int,
    get_limite_por_tipo_caja,
    normalizar_modelo,
)

# Imports relativos (salimos de la carpeta routers para buscar estos archivos)
import models, schemas
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/reempaque",  # Todas las rutas empezarán por /reempaque
    tags=["Operario Reempaque"],
)


@router.post("/finalizar")
def finalizar_reempaque(datos: schemas.ReempaqueInput, db: Session = Depends(get_db)):

    try:
        # 1. CALCULAR LA PEOR CADUCIDAD (MIN)
        logger.info(
            f"Iniciando cierre de caja para usuario {datos.usuario_id} con {len(datos.celdas)} celdas."
        )
        tipo_caja = datos.tipo_caja or (
            TIPO_DEFECTUOSA if datos.is_defective else TIPO_NORMAL
        )
        try:
            modelo = normalizar_modelo(datos.modelo)
        except ValueError as e:
            raise HTTPException(
                status_code=400,
                detail=str(e),
            )

        if tipo_caja not in TIPOS_CAJA_VALIDOS:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo de caja no válido: {tipo_caja}",
            )

        limite_esperado = get_limite_por_tipo_caja(db, models, modelo, tipo_caja)

        if len(datos.celdas) != limite_esperado:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"La caja de tipo {tipo_caja} debe tener {limite_esperado} celdas. "
                    f"Recibidas: {len(datos.celdas)}."
                ),
            )

        dias_caducidad_proxima = get_config_int(
            db,
            models,
            modelo,
            "caducidad_proxima_dias",
            30,
        )

        dmcs_entrantes = [c.dmc_code for c in datos.celdas]
        if len(dmcs_entrantes) != len(set(dmcs_entrantes)):
            vistos = set()
            repetidos = set()

            for dmc in dmcs_entrantes:
                if dmc in vistos:
                    repetidos.add(dmc)
                vistos.add(dmc)

            raise HTTPException(
                status_code=409,
                detail=(
                    "⛔ ERROR CRÍTICO: Hay DMC duplicados dentro de la misma caja:\n"
                    + "\n".join(sorted(repetidos))
                ),
            )

        if dmcs_entrantes:
            # Consultamos de golpe si alguno de estos códigos ya existe en la tabla Celda
            # (Usamos .in_ para hacerlo en una sola consulta rápida)
            duplicados = (
                db.query(models.Celda)
                .options(joinedload(models.Celda.caja_destino))
                .filter(models.Celda.dmc_code.in_(dmcs_entrantes))
                .all()
            )

            if duplicados:
                # Si encontramos alguno, PARAMOS TODO.
                # Preparamos un mensaje detallado de qué celdas son las culpables.
                lista_errores = []
                for celda in duplicados:
                    nombre_caja = (
                        celda.caja_destino.id_temporal
                        if celda.caja_destino
                        else "Desconocida"
                    )

                    lista_errores.append(f"{celda.dmc_code} (en {nombre_caja})")

                msg_error = (
                    f"⛔ ERROR CRÍTICO: Se intentan guardar piezas que YA EXISTEN:\n "
                    + "\n ".join(lista_errores)
                )

                # Devolvemos un 409 Conflict para que el Frontend sepa mostrarlo bonito
                raise HTTPException(status_code=409, detail=msg_error)
        dmcs_defectuosos = set()

        if dmcs_entrantes:
            defectuosos = (
                db.query(models.DMCDefectuoso.dmc_code)
                .filter(models.DMCDefectuoso.dmc_code.in_(dmcs_entrantes))
                .all()
            )

            dmcs_defectuosos = {row[0] for row in defectuosos}

        errores_tipo_caja = []

        for celda in datos.celdas:
            try:
                validar_celda_para_tipo_caja(
                    tipo_caja=tipo_caja,
                    dmc=celda.dmc_code,
                    fecha_caducidad=celda.fecha_caducidad,
                    dmc_es_defectuoso=celda.dmc_code in dmcs_defectuosos,
                    dias_caducidad_proxima=dias_caducidad_proxima,
                )
            except ValueError as e:
                errores_tipo_caja.append(str(e))

        if errores_tipo_caja:
            raise HTTPException(
                status_code=409,
                detail="\n".join(errores_tipo_caja),
            )

        # Sacamos todas las fechas de las celdas que nos envía el frontend
        lista_fechas = [c.fecha_caducidad for c in datos.celdas]

        # Si hay fechas, cogemos la mínima. Si no, None.
        peor_caducidad = min(lista_fechas) if lista_fechas else None

        # 2. GENERAR ID TEMPORAL (Tu lógica de TMP-...)
        timestamp_code = int(datetime.now().timestamp())
        nuevo_id = f"TMP-{hex(timestamp_code)[2:].upper()}"

        # 3. CREAR LA CAJA
        nueva_caja = models.CajaReempaque(
            id_temporal=nuevo_id,
            usuario_id=datos.usuario_id,
            fecha_inicio_reempaque=datos.fecha_inicio,
            fecha_fin_reempaque=datos.fecha_fin,
            fecha_caducidad_caja=peor_caducidad,
            is_defective=(tipo_caja == TIPO_DEFECTUOSA),
            tipo_caja=tipo_caja,
            modelo=modelo,
        )

        db.add(nueva_caja)

        # asigna el id a la caja pero no la guarda pero asi podemos definir las celdas
        db.flush()

        # crea las nuevas caja necesarias ahorra comparaciones
        hus_necesarios = {c.hu_origen for c in datos.celdas if c.hu_origen}

        existentes = (
            db.query(models.PaletEntrada.hu_proveedor)
            .filter(models.PaletEntrada.hu_proveedor.in_(hus_necesarios))
            .all()
        )

        hus_existentes = {row[0] for row in existentes}

        for hu in hus_necesarios - hus_existentes:
            db.add(models.PaletEntrada(hu_proveedor=hu))

        # 4. GUARDAR CELDAS Y VINCULAR PALETS
        for posicion, celda_in in enumerate(datos.celdas):

            # B. Crear Celda
            nueva_celda = models.Celda(
                caja_reempaque_id=nueva_caja.id,
                hu_origen_id=celda_in.hu_origen,
                dmc_code=celda_in.dmc_code,
                fecha_caducidad=celda_in.fecha_caducidad,
                estado_calidad=celda_in.estado_calidad,
                posicion_en_caja=posicion,
            )
            db.add(nueva_celda)

        db.commit()
        logger.info(f"Caja {nueva_caja.id_temporal} guardada correctamente.")
        return {
            "mensaje": "Caja guardada",
            "id_temporal": nueva_caja.id_temporal,
            "fecha_caducidad_caja": nueva_caja.fecha_caducidad_caja,
            "modelo": nueva_caja.modelo,
        }

    except HTTPException as http_ex:
        # Si lanzamos el error 409 manual, lo dejamos pasar tal cual
        raise http_ex

    except Exception as e:
        db.rollback()  # <--- tira para atras todo lo que habia hecho

        # <--- 3. EL CAMBIO CRÍTICO: LOGGING CON CONTEXTO
        # logger.error: Indica que es un fallo grave.
        # exc_info=True: Adjunta AUTOMÁTICAMENTE toda la traza del error (dónde ocurrió).
        logger.error(
            f"FALLO CRÍTICO al guardar caja para usuario {datos.usuario_id}: {str(e)}",
            exc_info=True,
        )

        raise HTTPException(status_code=500, detail="Error guardando caja")
