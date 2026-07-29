# VOLCADO DE UNA MUESTRA DE CAJAS REALES PARA LAS PRUEBAS DE SILENA
#
# Coge cajas que ya existen en la base de datos y escribe sus ficheros en una
# carpeta, para que SILENA tenga con qué probar su importación sin esperar a
# que en planta se cierren cajas de cada tipo.
#
# SOLO LEE. No cambia el estado_sync de ninguna caja, ni las marca como
# exportadas, ni toca el worker. Eso es justamente lo que hace que sirva: las
# cajas siguen su curso normal en nuestro sistema pase lo que pase con las
# pruebas de SILENA, y no quedan marcadas como sincronizadas por un fichero
# que en realidad se generó para un test.
#
# Usa generar_fichero(), el mismo código que el worker, así que los ficheros
# son idénticos a los de producción.
#
# Se ejecuta dentro del contenedor, que es donde se ve la base de datos
# (.env apunta a POSTGRES_HOST=db). Concretamente en worker-silena, que es el
# único servicio con el NAS montado:
#
#   docker compose -f docker-compose.dev.yml exec worker-silena \
#       python -m sync_silena.muestra --salida /nas/muestra_silena
#
# Eso deja los ficheros en ./nas_test/muestra_silena/ del repo. En una
# subcarpeta a propósito, para no mezclarlos con lo que va escribiendo el
# worker en la raíz del NAS.

import argparse
import os

TIPOS = ["NORMAL", "DEFECTUOSA", "CADUCIDAD_PROXIMA"]


def _seleccionar(db, models, tipo, limite, ya_elegidas, minimo, maximo):
    """
    Las cajas más recientes de un tipo, filtrando por número de celdas.

    El filtro importa: en la base de datos conviven cajas de verdad con restos
    de pruebas de dos y tres celdas. Sin filtro, "las más recientes" son
    justamente los restos, y a SILENA le llegarían ficheros de dos líneas.
    """
    from sqlalchemy import func

    conteo = (
        db.query(
            models.Celda.caja_reempaque_id.label("caja_id"),
            func.count().label("celdas"),
        )
        .group_by(models.Celda.caja_reempaque_id)
        .subquery()
    )

    consulta = (
        db.query(models.CajaReempaque)
        .join(conteo, conteo.c.caja_id == models.CajaReempaque.id)
        .filter(models.CajaReempaque.tipo_caja == tipo)
        .filter(conteo.c.celdas >= minimo)
    )

    if maximo is not None:
        consulta = consulta.filter(conteo.c.celdas <= maximo)

    if ya_elegidas:
        consulta = consulta.filter(models.CajaReempaque.id.notin_(ya_elegidas))

    return (
        consulta.order_by(models.CajaReempaque.fecha_fin_reempaque.desc())
        .limit(limite)
        .all()
    )


def main():
    parser = argparse.ArgumentParser(
        description="Vuelca los ficheros de una muestra de cajas reales para probar con SILENA.",
    )
    parser.add_argument(
        "--cajas",
        type=int,
        default=33,
        help="Número total de cajas a volcar (por defecto 33).",
    )
    parser.add_argument(
        "--salida",
        default="muestra_silena",
        help="Carpeta de destino (por defecto ./muestra_silena).",
    )
    parser.add_argument(
        "--min-celdas",
        type=int,
        default=100,
        help=(
            "Descarta cajas con menos celdas de las indicadas (por defecto 100). "
            "Con cajas reales de 180 no quita nada; sirve para saltarse los "
            "restos de pruebas de dos o tres celdas."
        ),
    )
    parser.add_argument(
        "--max-celdas",
        type=int,
        default=None,
        help="Descarta cajas con más celdas de las indicadas. Por defecto, sin tope.",
    )

    args = parser.parse_args()

    salida = os.path.abspath(args.salida)
    os.makedirs(salida, exist_ok=True)

    # CARPETA_SALIDA se lee del entorno al importar la configuración, así que
    # hay que fijarla antes. Se usa el mismo mecanismo que en producción para
    # que el fichero se escriba por el mismo camino, escritura atómica incluida.
    os.environ["SILENA_OUTPUT_DIR"] = salida

    # El generador va primero a propósito: así lee CARPETA_SALIDA de lo que
    # acabamos de poner, sin depender de si el load_dotenv() de database.py
    # pisa o no las variables que ya están en el entorno.
    from sync_silena.generador import generar_fichero

    from sqlalchemy.orm import joinedload

    import models
    from database import SessionLocal

    db = SessionLocal()

    try:
        # Se reparte a partes iguales entre los tipos y luego se completa con
        # lo que haya, por si de algún tipo no hay suficientes cajas.
        por_tipo = max(1, args.cajas // len(TIPOS))

        elegidas = []
        for tipo in TIPOS:
            elegidas.extend(
                _seleccionar(
                    db,
                    models,
                    tipo,
                    por_tipo,
                    [c.id for c in elegidas],
                    args.min_celdas,
                    args.max_celdas,
                )
            )

        for tipo in TIPOS:
            if len(elegidas) >= args.cajas:
                break

            elegidas.extend(
                _seleccionar(
                    db,
                    models,
                    tipo,
                    args.cajas - len(elegidas),
                    [c.id for c in elegidas],
                    args.min_celdas,
                    args.max_celdas,
                )
            )

        if not elegidas:
            print(
                f"No hay ninguna caja de al menos {args.min_celdas} celdas en la "
                "base de datos. Cierra alguna caja o baja el --min-celdas."
            )
            return

        # Se recargan con las celdas de golpe para no hacer una consulta por
        # caja al recorrerlas.
        cajas = (
            db.query(models.CajaReempaque)
            .options(joinedload(models.CajaReempaque.celdas))
            .filter(models.CajaReempaque.id.in_([c.id for c in elegidas]))
            .all()
        )

        escritas = []
        fallidas = []

        for caja in cajas:
            try:
                generar_fichero(caja)
                escritas.append(caja)
            except Exception as exc:
                # Una caja con un tipo raro no debe tumbar el volcado entero.
                fallidas.append((caja.id_temporal, str(exc)))

        print(f"\n{len(escritas)} ficheros escritos en {salida}\n")

        for tipo in TIPOS:
            del_tipo = [c for c in escritas if c.tipo_caja == tipo]

            if not del_tipo:
                print(f"  {tipo.ljust(18)}   0 cajas  <-- ninguna cumple el filtro")
                continue

            tamanos = sorted(len(c.celdas) for c in del_tipo)
            rango = (
                f"{tamanos[0]} celdas"
                if tamanos[0] == tamanos[-1]
                else f"{tamanos[0]}-{tamanos[-1]} celdas"
            )
            aviso = "  <-- menos de las pedidas" if len(del_tipo) < por_tipo else ""
            print(
                f"  {tipo.ljust(18)} {str(len(del_tipo)).rjust(3)} cajas, {rango}{aviso}"
            )

        if fallidas:
            print(f"\n{len(fallidas)} cajas no se pudieron escribir:")
            for id_temporal, error in fallidas:
                print(f"  {id_temporal}: {error}")

        print("\nNo se ha modificado ninguna caja: el estado_sync queda como estaba.")

    finally:
        # Solo hemos leído, pero cerramos limpio y sin dejar transacción abierta.
        db.rollback()
        db.close()


if __name__ == "__main__":
    main()
