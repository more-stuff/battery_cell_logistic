"""
Saca la lista de DMC a borrar de los xlsx que mando el cliente y la deja en un
CSV de una sola columna, que es lo unico que saben leer los .sql de al lado.

    python backend/migrations/20260823_delete_list_dmcs/extraer_dmcs.py

Se ejecuta desde la raiz del proyecto. Lee los .xlsx de la raiz y escribe
dmcs_a_borrar.csv tambien en la raiz.

Los ficheros vienen con una hoja por caja: primera fila la etiqueta del
contenedor (27BUN..., TMP-... o BID...) y debajo los DMC. Hay hojas que no
traen etiqueta y empiezan directamente por el primer DMC, asi que NO se puede
saltar la primera fila a ciegas: se filtra por el formato del propio DMC.

Un DMC es una linea de 87 caracteres que empieza por "#0Z". Cualquier otra cosa
(etiquetas, celdas vacias, notas sueltas) se descarta y se cuenta aparte, para
que se vea en la salida si el fichero trae algo que no esperabamos.

Ojo con los espacios: el DMC crudo lleva espacios DENTRO (".. ###*Z00 B1Y9..")
y hay codigos que acaban en espacio antes del '*'. Se guarda tal cual llega,
sin strip, porque en la base de datos esta igual de crudo: asi es como lo
escanea el operario y asi lo guarda /reempaque. Si aqui lo recortasemos, el
JOIN del borrado no encontraria nada.
"""

import csv
import glob
import os
import sys

import openpyxl

LONGITUD_DMC = 87  # frontend-operarios/src/hooks/usePaquete.js -> len_dmc
PREFIJO_DMC = "#0Z"
SALIDA = "dmcs_a_borrar.csv"


def es_dmc(valor) -> bool:
    return (
        isinstance(valor, str)
        and len(valor) == LONGITUD_DMC
        and valor.startswith(PREFIJO_DMC)
    )


def main() -> int:
    ficheros = sorted(glob.glob("*.xlsx"))

    if not ficheros:
        print("No hay ningun .xlsx en el directorio actual.", file=sys.stderr)
        print("Ejecuta el script desde la raiz del proyecto.", file=sys.stderr)
        return 1

    # dict y no set: conserva el orden de aparicion, que hace mas facil cotejar
    # el CSV con los xlsx a mano.
    dmcs: dict[str, tuple[str, str]] = {}
    filas = 0
    repetidos = 0
    descartadas = 0

    for fichero in ficheros:
        wb = openpyxl.load_workbook(fichero, read_only=True, data_only=True)

        for hoja in wb.worksheets:
            n_hoja = 0

            for fila in hoja.iter_rows(values_only=True):
                valor = fila[0]

                if valor is None:
                    continue

                if not es_dmc(valor):
                    descartadas += 1
                    continue

                filas += 1
                n_hoja += 1

                if valor in dmcs:
                    repetidos += 1
                    origen = dmcs[valor]
                    print(
                        f"  REPETIDO: ya estaba en {origen[0]} / hoja {origen[1]}"
                        f" -> {valor}"
                    )
                    continue

                dmcs[valor] = (fichero, hoja.title)

            print(f"{fichero:35s} | hoja {hoja.title:18s} | {n_hoja:4d} DMC")

        wb.close()

    with open(SALIDA, "w", newline="", encoding="utf-8") as f:
        # QUOTE_ALL por si algun dia aparece una coma dentro del codigo. COPY
        # con FORMAT csv entiende el entrecomillado sin tocar nada.
        escritor = csv.writer(f, quoting=csv.QUOTE_ALL)
        escritor.writerow(["dmc_code"])

        for dmc in dmcs:
            escritor.writerow([dmc])

    print()
    print(f"Ficheros leidos      : {len(ficheros)}")
    print(f"Filas DMC            : {filas}")
    print(f"Repetidas (ignoradas): {repetidos}")
    print(f"Filas no-DMC         : {descartadas}  (etiquetas de caja y vacias)")
    print(f"DMC unicos a borrar  : {len(dmcs)}")
    print()
    print(f"Escrito {os.path.abspath(SALIDA)}")
    print("Este numero es el que hay que poner en la red de seguridad del 002.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
