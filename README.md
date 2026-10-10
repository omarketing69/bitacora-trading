# Trade Journal Pro

quiero hacer una plantilla para llevar el registro de mis operaciones de trading, tengo este codigo json, crees que con esto podemos llevar el registro de mis operaciones, como una bitacora de trading            {
  "trades": [
    {
      "id": "400605985177248",
      "fecha_entrada": "2026-01-20T16:12:43Z",
      "fecha_salida": "2026-01-20T16:18:27Z",
      "instrumento": "Boom 1000",
      "moneda": "USD",
      "direccion": "Venta",
      "stake_usd": 2000.00,
      "resultado_usd": 200.10,
      "saldo_antes": 11580.00,
      "saldo_despues": 11780.10,
      "riesgo_pct_cuenta": 2.0,
      "resultado_pct_cuenta": 1.7,

      "tf_principal": "15M",
      "contexto_1h": "Tendencia bajista",
      "posicion_en_canal": "Cerca borde inferior",
      "tipo_setup": "Tendencia_pullback",
      "entrada_por": "Vela roja limpia tras pullback",

      "stop_plan_usd": 200.00,
      "tp_plan_usd": 100.00,
      "motivo_salida": "TP_extendido_20pct",
      "notas": "Entrada con la tendencia en Boom 1000, buscando 10–20% sobre el stake en el tramo final hacia el borde del canal."
    },

    {
      "id": "400605984097228",
      "fecha_entrada": "2026-01-20T16:04:00Z",
      "fecha_salida": "2026-01-20T16:06:27Z",
      "instrumento": "Boom 1000",
      "moneda": "USD",
      "direccion": "Venta",
      "stake_usd": 1000.00,
      "resultado_usd": 273.46,
      "saldo_antes": 11306.54,
      "saldo_despues": 11580.00,
      "riesgo_pct_cuenta": 2.0,
      "resultado_pct_cuenta": 2.4,

      "tf_principal": "15M",
      "contexto_1h": "Tendencia bajista",
      "posicion_en_canal": "Mitad hacia borde inferior",
      "tipo_setup": "Tendencia_pullback",
      "entrada_por": "Pullback con mecha y continuación roja",

      "stop_plan_usd": 200.00,
      "tp_plan_usd": 100.00,
      "motivo_salida": "TP_10pct_superado",
      "notas": "Trade de continuación bajista tras pullback claro en 5M/15M."
    }

    // ...aquí seguirían tus demás operaciones con el mismo formato
  ]
}

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://bitacora-trading.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/82163c4b-4eb7-408c-bb62-28c863a3be10).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
