from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import random

app = FastAPI(title="Motor Salva-Ventas Contraentrega")

# Simulación de Base de Datos en memoria para el MVP
pedidos_db = {
    "PED-101": {
        "cliente": "Carlos Pérez",
        "direccion": "Barrio El Socorro, Mz 12 Lote 4",
        "valor": 85000,
        "metodo_pago": "EFECTIVO",
        "estado_cliente": "PENDIENTE_CONFIRMACION",
        "pin_seguridad": None,
        "entregado": False
    }
}

# 1. El cliente presiona "Estoy en casa con el efectivo"
@app.post("/pedido/{id_pedido}/confirmar-efectivo")
def confirmar_efectivo(id_pedido: str):
    if id_pedido not in pedidos_db:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    pedidos_db[id_pedido]["estado_cliente"] = "LISTO_EN_CASA"
    return {"mensaje": "¡Perfecto! El mensajero ya sabe que lo esperas con efectivo."}

# 2. El Botón "Salva-Ventas": Cliente paga por transferencia (Nequi/PSE)
@app.post("/pedido/{id_pedido}/pago-digital-exitoso")
def procesar_cambio_a_digital(id_pedido: str):
    if id_pedido not in pedidos_db:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    # Generamos el PIN de 4 dígitos para el portero o cliente
    pin_generado = str(random.randint(1000, 9999))
    
    pedidos_db[id_pedido]["metodo_pago"] = "YA_PAGADO_DIGITAL"
    pedidos_db[id_pedido]["estado_cliente"] = "AUTORIZADO_CON_PIN"
    pedidos_db[id_pedido]["pin_seguridad"] = pin_generado
    
    return {
        "alerta_mensajero": "NO COBRAR EFECTIVO - PEDIR PIN",
        "pin_para_cliente": pin_generado
    }

# 3. El mensajero valida el PIN en la puerta para entregar el paquete
@app.post("/pedido/{id_pedido}/validar-entrega")
def entregar_paquete(id_pedido: str, pin_ingresado: str):
    pedido = pedidos_db.get(id_pedido)
    
    if pedido["metodo_pago"] == "YA_PAGADO_DIGITAL":
        if pedido["pin_seguridad"] != pin_ingresado:
            raise HTTPException(status_code=400, detail="❌ PIN incorrecto. No entregar paquete.")
            
    pedido["entregado"] = True
    return {"mensaje": "✅ Paquete entregado con éxito."}