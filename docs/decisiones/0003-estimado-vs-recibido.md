# ADR 0003 — Separar ingresos estimados del dinero recibido

- **Estado:** aceptada

## Decisión
Las fuentes de ingreso (salario quincenal, mensual, etc.) generan un **calendario de pagos esperados** calculado al vuelo. Ningún pago se registra como recibido automáticamente: el usuario lo confirma (“Marcar como recibido”) y en ese momento se crea un movimiento real vinculado al periodo (`income_source_id` + `period_key`, con índice único).

- No se puede confirmar un pago con fecha futura (validado en la capa de datos).
- Los totales del dashboard e informes usan solo movimientos reales.
- Toda cifra estimada se marca visualmente con la etiqueta **Estimado**; los datos registrados con **Real**.
- Los pagos recurrentes con “registro automático” solo se crean cuando su fecha ya llegó.
