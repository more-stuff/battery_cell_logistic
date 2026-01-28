from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import logging
import uuid

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

        dmcs_entrantes = [c.dmc_code for c in datos.celdas]

        if dmcs_entrantes:
            # Consultamos de golpe si alguno de estos códigos ya existe en la tabla Celda
            # (Usamos .in_ para hacerlo en una sola consulta rápida)
            duplicados = (
                db.query(models.Celda)
                .filter(models.Celda.dmc_code.in_(dmcs_entrantes))
                .all()
            )

            if duplicados:
                # Si encontramos alguno, PARAMOS TODO.
                # Preparamos un mensaje detallado de qué celdas son las culpables.
                lista_errores = []
                for celda in duplicados:
                    # Buscamos en qué caja está para chivárselo al usuario
                    caja_padre = db.query(models.CajaReempaque).get(
                        celda.caja_reempaque_id
                    )
                    nombre_caja = (
                        caja_padre.id_temporal if caja_padre else "Desconocida"
                    )

                    lista_errores.append(f"{celda.dmc_code} (en {nombre_caja})")

                msg_error = (
                    f"⛔ ERROR CRÍTICO: Se intentan guardar piezas que YA EXISTEN:\n "
                    + "\n ".join(lista_errores)
                )

                # Devolvemos un 409 Conflict para que el Frontend sepa mostrarlo bonito
                raise HTTPException(status_code=409, detail=msg_error)

        # Sacamos todas las fechas de las celdas que nos envía el frontend
        lista_fechas = [c.fecha_caducidad for c in datos.celdas]

        # Si hay fechas, cogemos la mínima. Si no, None.
        peor_caducidad = min(lista_fechas) if lista_fechas else None

        # 2. GENERAR ID TEMPORAL (Tu lógica de TMP-...)
        # (Aquí va tu código de generar ID, lo resumo)
        timestamp_code = int(datetime.now().timestamp())
        nuevo_id = f"TMP-{hex(timestamp_code)[2:].upper()}"

        # 3. CREAR LA CAJA (Con los nuevos nombres de campos)
        nueva_caja = models.CajaReempaque(
            id_temporal=nuevo_id,
            usuario_id=datos.usuario_id,
            # Guardamos las fechas de reempaque
            fecha_inicio_reempaque=datos.fecha_inicio,
            fecha_fin_reempaque=datos.fecha_fin,
            # Guardamos la caducidad calculada
            fecha_caducidad_caja=peor_caducidad,
            is_defective=datos.is_defective,
            # El resto (Outbound, Almacén) se queda en NULL automáticamente
        )

        db.add(nueva_caja)

        # asigna el id a la caja pero no la guarda pero asi podemos definir las celdas
        db.flush()

        # crea las nuevas caja necesarias ahorra comparaciones
        hus_necesarios = set(c.hu_origen for c in datos.celdas)
        for hu in hus_necesarios:
            if not db.query(models.PaletEntrada).filter_by(hu_proveedor=hu).first():
                db.add(models.PaletEntrada(hu_proveedor=hu))

        # 4. GUARDAR CELDAS Y VINCULAR PALETS
        for celda_in in datos.celdas:

            # B. Crear Celda
            nueva_celda = models.Celda(
                caja_reempaque_id=nueva_caja.id,
                hu_origen_id=celda_in.hu_origen,
                dmc_code=celda_in.dmc_code,
                fecha_caducidad=celda_in.fecha_caducidad,
                estado_calidad=celda_in.estado_calidad,
            )
            db.add(nueva_celda)

        db.commit()
        logger.info(f"Caja {nueva_caja.id_temporal} guardada correctamente.")
        return {"mensaje": "Caja guardada", "id_temporal": nueva_caja.id_temporal}

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
