# HeyPredictor 📊🔮  
Equipo: 404 Data Not Found

**Predicción de gastos recurrentes para Hey Banco**

Este proyecto proporciona una solución completa para **detectar patrones de gastos recurrentes** en los clientes de Hey Banco y **predecir el monto y el tiempo estimado hasta la siguiente transacción**. Está dividido en dos componentes principales:

- Un notebook de entrenamiento y generación de features (`Hey_prediction.ipynb`)
- Una aplicación fullstack (React + Flask API) para hacer predicciones en tiempo real a partir de CSVs nuevos con features específicas.
---

## Lógica del modelo

### `Hey_prediction.ipynb` contiene:

1. **Exploración de datos (EDA)**  
   Se analizan tendencias generales, distribución de montos y periodicidad de transacciones por cliente-comercio.

2. **Limpieza y procesamiento**  
   - Conversión de fechas
   - Correción de columna *comercio*.
   - Agrupaciones por cliente y comercio

3. **Ingeniería de features**  
   Para cada combinación cliente-comercio se generan:
   - `dias_desde_ultima`
   - `monto`
   - `media_monto_hist`
   - `std_monto_hist`
   - `num_tx_cliente_comercio`

4. **Clasificación heurística de gastos recurrentes**  
   Basado en:
   - Frecuencia mínima de transacciones (≥ 3)
   - Intervalo regular (mediana de días ≤ 45)
   - Baja variabilidad del monto (desviación estándar < 30% de la media)

   ```python
      frecuencia['es_recurrente'] = (
          (frecuencia['num_transacciones'] >= 3) &
          (frecuencia['dias_entre'] <= 45) &
          (frecuencia['monto_std'] < 0.3 * frecuencia['monto_promedio'])
      )
     ```

5. **Entrenamiento de modelos Random Forest Regressor**  
   - Un modelo para predecir el **monto estimado**
   - Otro para predecir los **días hasta la siguiente compra**

6. **Generación del dataset para producción**  
   Se genera un nuevo `.csv` que incluye **una fila por cliente-comercio** correspondiente a la **última transacción conocida**, junto con sus features calculadas.

7. **Exportación de modelos**  
   Los modelos entrenados se guardan como `.joblib` para ser utilizados por la aplicación.

---

## Aplicación React + Flask API

### Estructura
- **Frontend**: construida con Vite + React + Tailwind. Permite:
  - Subir CSVs con transacciones históricas
  - Buscar por ID de cliente
  - Visualizar gráficas por tipo de venta, comercio, monto en el tiempo
  - Ejecutar predicciones fila por fila

- **Backend**: Servidor Flask que expone un endpoint `/predict` y usa los modelos `.joblib` para responder con:
  ```json
  {
    "monto_estimado": 123.45,
    "dias_estimados": 30
  }
   ```
---

## Cómo ejecutar la aplicación

### 1. Clona el repositorio

```bash
git clone https://github.com/cuiltyv/datathon4.git
cd datathon4
```

### 2. Ejecuta el notebook

Abre el archivo `Hey_prediction.ipynb` y corre todas las celdas de principio a fin:

- Esto generará un archivo `.csv` de entrada que la aplicación utilizará para hacer predicciones.
- También entrenará y guardará dos modelos como `rf_model_monto.joblib` (para monto estimado) y `rf_model_fecha.pkl` (para días estimados).

Asegúrate de tener todas las dependencias necesarias instaladas mediante el archivo `requirements.txt`.
```
cd backend
pip install -r requirements.txt
```

### 3. Copia los modelos al backend

Una vez generados los modelos, colócalos en la carpeta `backend/`. Esta carpeta es donde reside el servidor Flask que usará dichos modelos para responder a las solicitudes de predicción.

### 4. Corre el backend Flask

Desde la carpeta `backend`, ejecuta el servidor Flask. Esto iniciará la API local que responde a las predicciones en la ruta `/predict`.
```bash
python ./datathon/backend/app.py
```
Esto levantará la API en `http://127.0.0.1:5000`.

### 5. Corre el frontend React

Desde la carpeta `datathon4`, instala las dependencias necesarias y luego levanta la app en modo desarrollo.

```bash
cd datathon4
npm install
npm run dev
```

La interfaz estará accesible en `http://localhost:5173`.

---

## Replicabilidad paso a paso

1. Ejecuta el notebook `Hey_prediction.ipynb`.
2. Guarda los modelos `.joblib` en la carpeta `backend/`.
3. Ejecuta el servidor Flask.
4. Levanta el frontend.
5. Sube un nuevo archivo CSV, busca por ID de cliente y obtén las predicciones.

---

## Requisitos sugeridos (`requirements.txt`)

- pandas  
- numpy  
- scikit-learn  
- joblib  
- flask  
- flask-cors  
- jupyter  
- matplotlib  
- seaborn
- difflib

### 6. Imagenes
A continuación se muestra una imagen de la aplicación en ejecución. Para ver el comportamiento del modelo, debes introducir un ID de cliente válido en el campo de búsqueda. Esto filtrará los registros de ese cliente y mostrará gráficas personalizadas junto con la predicción estimada de su siguiente gasto.

<img width="1800" alt="Screenshot 2025-05-25 at 1 29 45 p m" src="https://github.com/user-attachments/assets/f7daacb1-f8d6-4357-851c-44976e1b32af" />
<img width="1800" alt="Screenshot 2025-05-25 at 1 29 47 p m" src="https://github.com/user-attachments/assets/d92d4097-9723-48d3-932a-259818bf49df" />
<img width="1800" alt="Screenshot 2025-05-25 at 1 29 59 p m" src="https://github.com/user-attachments/assets/bba917a4-b269-4401-a913-706fd7f48abc" />
<img width="1800" alt="Screenshot 2025-05-25 at 1 30 02 p m" src="https://github.com/user-attachments/assets/7bacf7f6-0b26-4e3b-88f3-8d501aa7b9c1" />
<img width="1800" alt="Screenshot 2025-05-25 at 1 30 04 p m" src="https://github.com/user-attachments/assets/4e596573-faa0-48e4-ab88-346a37444607" />


