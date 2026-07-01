import hid
import time
import re
import pyautogui

# Configuración de hardware (WCH CH9326 / UART-HID)
VID_CABLE = 0x1A86
PID_CABLE = 0xE429

# Comando Maestro-Esclavo para solicitar datos en pantalla
comando_peticion = [0x00, 0x06, 0xAB, 0xCD, 0x03, 0x5E, 0x01, 0xD9]
comando_peticion += [0x00] * (65 - len(comando_peticion))

# Parámetros de velocidad y tolerancia (Optimizado a 150ms)
LECTURAS_ESTABLES_REQUERIDAS = 3
UMBRAL_CERO = 0.1


def extraer_voltaje(datos_brutos):
    """Filtra y extrae el voltaje exigiendo exactamente 3 decimales para evitar lecturas fantasma."""
    texto_crudo = bytes(datos_brutos).decode("ascii", errors="ignore")

    # \d{3} exige exactamente tres decimales (ej: 1.581 o 0.000)
    # Esto elimina automáticamente cualquier lectura parcial como "1." o "1. "
    coincidencia = re.search(r"[-+]?\d+\.\d{3}", texto_crudo)

    if coincidencia:
        valor = float(coincidencia.group())

        # Si el valor es exactamente 1.0 o valores planos residuales del cambio de escala, los ignoramos
        if valor == 1.0:
            return None

        return valor
    return None


# Inicialización y apertura de interfaces HID
dispositivos_abiertos = []
print("Buscando cable multímetro...")
for d in hid.enumerate():
    if d["vendor_id"] == VID_CABLE and d["product_id"] == PID_CABLE:
        try:
            h = hid.device()
            h.open_path(d["path"])
            h.set_nonblocking(1)
            dispositivos_abiertos.append(h)
            print("-> Hardware conectado correctamente.")
        except Exception:
            pass

if not dispositivos_abiertos:
    print("Error: No se detecta el cable. Revisa la conexión USB.")
    exit()

# Variables de estado para el control del bucle y cerrojo (latch)
valor_anterior = 0.0
contador_estabilidad = 0
ya_enviado = False

print("\n=== SCRIPT DE AUTOMATIZACIÓN ACTIVO ===")

try:
    while True:
        for dev in dispositivos_abiertos:
            try:
                dev.write(comando_peticion)
            except Exception:
                pass

            time.sleep(0.05)

            datos = dev.read(64)
            if datos:
                voltaje_actual = extraer_voltaje(datos)

                if voltaje_actual is not None:

                    # Puntas al aire / Retorno a cero: Rearme del sistema
                    if voltaje_actual < UMBRAL_CERO:
                        ya_enviado = False
                        contador_estabilidad = 0
                        valor_anterior = 0.0
                        continue

                    # Control de estabilidad y emulación de teclado
                    if not ya_enviado:
                        if abs(voltaje_actual - valor_anterior) < 0.005:
                            contador_estabilidad += 1
                        else:
                            contador_estabilidad = 0
                            valor_anterior = voltaje_actual

                        if contador_estabilidad >= LECTURAS_ESTABLES_REQUERIDAS:
                            print(f"[ESTABLE] Enviando: {voltaje_actual} V")

                            pyautogui.write(str(voltaje_actual))
                            pyautogui.press("enter")

                            ya_enviado = True
                            contador_estabilidad = 0

        time.sleep(0.05)

except KeyboardInterrupt:
    print("\nDeteniendo automatización y liberando hardware...")
    for dev in dispositivos_abiertos:
        dev.close()
