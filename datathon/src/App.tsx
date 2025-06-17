import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  FileSpreadsheet,
  Search,
  Loader2,
  BarChart3,
  Table
} from "lucide-react"
import { useState } from "react"
import Papa from 'papaparse'
import axios from 'axios'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { PieLabelRenderProps as PieLabelRenderPropsType } from 'recharts'
import { BarChart as ReBarChart, Bar, XAxis, YAxis, Legend } from 'recharts'
import { LineChart, Line } from 'recharts'
import {ScatterChart,Scatter,CartesianGrid,LabelList} from 'recharts'


const api = axios.create({
  baseURL: 'http://127.0.0.1:5000', // Cambiar a la direccion de la API
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true
})

type Registro = {
  id: string
  fecha: string
  comercio: string
  giro_comercio: string
  tipo_venta: string
  monto: string
  [key: string]: any
}


function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [graphFile, setGraphFile] = useState<File | null>(null)
  const [dataMap, setDataMap] = useState<Map<string, string[][]>>(new Map())
  const [graphDataMap, setGraphDataMap] = useState<Map<string, string[][]>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [isGraphLoading, setIsGraphLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [searchId, setSearchId] = useState("")
  const [graphSearchId, setGraphSearchId] = useState("")
  const [searchResult, setSearchResult] = useState<string[][] | null>(null)
  type Prediccion = {
  monto_estimado: number
  dias_estimados: number
  }

  const [predictions, setPredictions] = useState<Map<number, Prediccion>>(new Map())

  const [isPredicting, setIsPredicting] = useState(false)
  const [currentView, setCurrentView] = useState<'records' | 'graphs'>('records')

  const subscripcionesSet = new Set([
  "SPOTIFY", "NETFLIX", "DISNEY PLUS", "GOOGLE YOUTUBEPREMIUM", "GOOGLE YOUTUBE",
  "GOOGLE ONE", "OPENAI", "GOOGLE AMAZON MOBILE", "AUDIBLE", "CRUNCHYROLL",
  "TOTALPLAY", "TELMEX", "IZZI", "MEGACABLE", "PLAYSTATION NETWORK", "MICROSOFT",
  "ADOBE", "CABLEYCOMUN", "SMARTFIT", "APPLE", "VIX", "CANVA", "RENTAMOVISTAR",
  "KUESKI PAY", "AT&T", "MI ATT", "GOOGLE", "METROBUS",
  // Comercios agregados por ti:
  "CFE","AMAZON PRIME", "SERV AGUA DREN","TELCEL","TOTAL PASS", "RAPPIPRO", "MAX", "NAYAX", "MELIMAS", "SMART"
])


  const getPrediction = async (row: any, index: number) => {
  let input: number[]

  // Detecta si es array (viene del CSV sin encabezado)
  if (Array.isArray(row)) {
    input = [
      Number(row[4]), // dias_desde_ultima
      Number(row[5]), // monto
      Number(row[6]), // media_monto_hist
      Number(row[7]), // std_monto_hist
      Number(row[8])  // num_tx_cliente_comercio
    ]
  } else {
    input = [
      Number(row.dias_desde_ultima),
      Number(row.monto),
      Number(row.media_monto_hist),
      Number(row.std_monto_hist),
      Number(row.num_tx_cliente_comercio)
    ]
  }

  try {
    console.log("Enviando a la API:", input)
    const response = await api.post('/predict', [input])
    console.log("Respuesta recibida:", response.data)

    setPredictions(prev => new Map(prev).set(index, {
      monto_estimado: response.data.monto_estimado,
      dias_estimados: response.data.dias_estimados
    }))
  } catch (error) {
    console.error('Error getting prediction:', error)
  }
}

  const renderTabla = (titulo: string, datosFiltrados: { row: any, index: number }[],esSubscripcion: boolean) => (
  <div className="overflow-x-auto rounded-md border mt-4">
    <h4 className="text-md font-semibold px-4 py-2 bg-muted text-muted-foreground">{titulo}</h4>
    <table className="w-full text-sm">
      <thead className="bg-muted text-muted-foreground">
        <tr>
          <th className="px-4 py-2 text-left">Comercio</th>
          <th className="px-4 py-2 text-left">Fecha</th>
          <th className="px-4 py-2 text-left">Días Desde Última</th>
          <th className="px-4 py-2 text-left">Num Tx</th>
          <th className="px-4 py-2 text-left text-primary font-semibold">Monto Estimado</th>
          <th className="px-4 py-2 text-left text-primary font-semibold">Fecha Estimada</th>
          {esSubscripcion ? (
            <th className="px-4 py-2 text-left text-primary font-semibold">Días Estimados Próximo Pago</th>
          ) : (
            <>
            <th className="px-4 py-2 text-left text-primary font-semibold">Monto con Descuento</th>
            <th className="px-4 py-2 text-left text-primary font-semibold">Días para Caducar</th>
            </>

          )}
        </tr>
      </thead>

      <tbody>
        {datosFiltrados.map(({ row, index }) => {
          const pred = predictions.get(index)!
          const esArray = Array.isArray(row)
          const comercio = esArray ? row[2] : row.comercio
          const fecha = esArray ? row[1] : row.fecha
          const diasDesdeUltima = esArray ? row[4] : row.dias_desde_ultima
          
          const numTx = esArray ? row[8] : row.num_tx_cliente_comercio

          const fechaBase = new Date(fecha)
          fechaBase.setDate(fechaBase.getDate() + pred.dias_estimados)
          const fechaEstimada = fechaBase.toISOString().slice(0, 10)

          const diasColor =
            pred.dias_estimados < 10
              ? "text-red-600"
              : pred.dias_estimados < 25
              ? "text-yellow-600"
              : "text-green-600"

          const diasIcono = pred.dias_estimados < 10 ? "⚠️" : ""

          return (
            <tr key={index} className="even:bg-background odd:bg-muted/50">
              <td className="px-4 py-2">{comercio}</td>
              <td className="px-4 py-2">{fecha}</td>
              <td className="px-4 py-2">{diasDesdeUltima}</td>
              
              <td className="px-4 py-2">{numTx}</td>
              <td className="px-4 py-2 font-semibold text-primary">${pred.monto_estimado.toFixed(2)}</td>
              <td className="px-4 py-2 font-semibold">{fechaEstimada}</td>
              {esSubscripcion ? (
                <td
                  className="px-4 py-2 font-semibold text-white rounded"
                  style={{
                    backgroundColor:
                      pred.dias_estimados < 10
                        ? "#dc2626" // rojo
                        : pred.dias_estimados < 25
                        ? "#f59e0b" // amarillo
                        : "#16a34a", // verde
                  }}
                >
                  {pred.dias_estimados < 10 ? "⚠️ " : ""}
                  {pred.dias_estimados}
                </td>
              ) : (
                <>
                <td className="px-4 py-2 font-semibold text-black">
                  ${(pred.monto_estimado * 0.9).toFixed(2)}
                </td>

                <td
  className="px-4 py-2 font-semibold text-white rounded"
  style={{
    backgroundColor:
      pred.dias_estimados < 10
        ? "#dc2626" // rojo
        : pred.dias_estimados < 25
        ? "#f59e0b" // amarillo
        : "#16a34a", // verde
  }}
>
  {pred.dias_estimados < 10 ? "⚠️ " : ""}
  {pred.dias_estimados}
</td>




                </>

              )}


            </tr>
          )
        })}
      </tbody>
    </table>
  </div>

  
)

  const subscripcionesFiltradas = searchResult
  ? searchResult
      .map((row, i) => ({ row, index: i }))
      .filter(({ row, index }) =>
        predictions.has(index) &&
        subscripcionesSet.has(Array.isArray(row) ? row[2] : (row as Registro).comercio)
      )
  : []


  const cuponesFiltrados = searchResult
  ? searchResult
      .map((row, i) => ({ row, index: i }))
      .filter(({ row, index }) =>
        predictions.has(index) &&
        !subscripcionesSet.has(Array.isArray(row) ? row[2] : (row as Registro).comercio)
      )
  : []




  const chartData = searchResult
  ?.map((row, i) => {
    if (!predictions.has(i)) return null;

    const pred = predictions.get(i)!;
    const esArray = Array.isArray(row);
    const comercio = esArray ? row[2] : (row as Registro).comercio;
    const fecha = esArray ? row[1] : (row as Registro).fecha;

    const baseDate = new Date(fecha);
    baseDate.setDate(baseDate.getDate() + pred.dias_estimados);
    const fechaEstimada = baseDate.toISOString().slice(0, 10);

    return {
      comercio,
      fechaEstimada,
      monto: pred.monto_estimado,
      tipo: subscripcionesSet.has(comercio) ? "subscripcion" : "cupon"
    };
  })
  .filter(Boolean);



  

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setIsLoading(true)
      setProgress(0)
      setDataMap(new Map())
      setSearchResult(null)

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const newDataMap = new Map<string, any[]>()

          results.data.forEach((row: any) => {
            const id = row.id
            const records = newDataMap.get(id) || []
            newDataMap.set(id, [...records, row])
          })

          setDataMap(newDataMap)
          setIsLoading(false)
        },
        error: (error) => {
          console.error('Error parsing CSV:', error)
          setIsLoading(false)
        },
        
      })
    }
  }

  const handleGraphFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setGraphFile(file)
      setIsGraphLoading(true)
      setProgress(0)
      setGraphDataMap(new Map())

      Papa.parse(file, {
        complete: (results) => {
          console.log('Parsing complete:', results.data.length, 'rows')
          
          // Create a new Map to store the data
          const newDataMap = new Map<string, string[][]>()
          
          // Skip header row and process data
          results.data.slice(1).forEach((row: unknown) => {
            if (Array.isArray(row) && row[0]) {
              const id = row[0]
              const existingRecords = newDataMap.get(id) || []
              newDataMap.set(id, [...existingRecords, row])
            }
          })
          
          console.log('Processed rows:', newDataMap.size)
          setGraphDataMap(newDataMap)
          setIsGraphLoading(false)
        },
        error: (error) => {
          console.error('Error parsing CSV:', error)
          setIsGraphLoading(false)
        },
        header: false,
        skipEmptyLines: true
      })
    }
  }

  const handleSearch = (id: string) => {
    setSearchId(id)
    const result = dataMap.get(id)
    setSearchResult(result || null)
    setPredictions(new Map()) // Reset predictions when searching for a new record
  }


  const handlePredict = async () => {
  if (searchResult && searchResult.length > 0) {
    console.log("Ejecutando predicciones...")
    setIsPredicting(true)
    setPredictions(new Map())
   
    const predictionPromises = searchResult.map((row, index) => {
      console.log("Procesando fila:", row)
      return getPrediction(row, index)
    })

    await Promise.all(predictionPromises)
    setIsPredicting(false)
  }
}


  const handleGraphSearch = (id: string) => {
    setGraphSearchId(id)
    const result = graphDataMap.get(id)
    if (result) {
      setSearchResult(result)
    } else {
      setSearchResult(null)
    }
  }

  // Custom label for pie chart
  const renderPieLabel = (props: PieLabelRenderPropsType) => {
    let { cx, cy, innerRadius, outerRadius } = props
    const { midAngle, value, name } = props
    const percent = props.percent ?? 0
    // Provide defaults if undefined
    cx = typeof cx === 'number' ? cx : 0
    cy = typeof cy === 'number' ? cy : 0
    innerRadius = typeof innerRadius === 'number' ? innerRadius : 0
    outerRadius = typeof outerRadius === 'number' ? outerRadius : 0
    const RADIAN = Math.PI / 180
    // Calculate label position
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    return (
      <text x={x} y={y} fill="#222" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={13} fontWeight={500}>
        {name}: {value} ({(percent * 100).toFixed(0)}%)
      </text>
    )
  }

  const renderGraphsView = () => {
    // Calculate statistics if there is a search result
    let totalMonto = 0
    const tipoVentaCounts: Record<string, number> = {}
    if (searchResult && searchResult.length > 0) {
      searchResult.forEach(record => {
        // Assuming columns: id, fecha, comercio, giro_comercio, tipo_venta, monto
        // monto is last column, tipo_venta is second to last
        const montoStr = record[record.length - 1]
        const tipoVenta = record[record.length - 2]
        const monto = parseFloat(montoStr)
        if (!isNaN(monto)) totalMonto += monto
        if (tipoVenta) {
          tipoVentaCounts[tipoVenta] = (tipoVentaCounts[tipoVenta] || 0) + 1
        }
      })
    }
    const pieData = Object.entries(tipoVentaCounts).map(([key, value]) => ({ name: key, value }))
    const pieColors = ['#6366f1', '#f59e42', '#10b981', '#ef4444', '#fbbf24']

    // Aggregate by comercio
    let comercioStats: { comercio: string, count: number, monto: number }[] = []
    if (searchResult && searchResult.length > 0) {
      const comercioMap: Record<string, { count: number, monto: number }> = {}
      searchResult.forEach(record => {
        // Assuming columns: id, fecha, comercio, giro_comercio, tipo_venta, monto
        const comercio = record[2] || 'N/A'
        const monto = parseFloat(record[record.length - 1])
        if (!comercioMap[comercio]) {
          comercioMap[comercio] = { count: 0, monto: 0 }
        }
        comercioMap[comercio].count += 1
        if (!isNaN(monto)) comercioMap[comercio].monto += monto
      })
      comercioStats = Object.entries(comercioMap).map(([comercio, stats]) => ({ comercio, ...stats }))
    }

    const fisicaCount = tipoVentaCounts['fisica'] || 0
    const digitalCount = tipoVentaCounts['digital'] || 0

    // Prepare data for line chart: monto per fecha
    let montoTimeData: { fecha: string, monto: number }[] = []
    if (searchResult && searchResult.length > 0) {
      montoTimeData = searchResult
        .map(record => {
          // Assuming columns: id, fecha, comercio, giro_comercio, tipo_venta, monto
          const fecha = record[1] || ''
          const monto = parseFloat(record[record.length - 1])
          return { fecha, monto }
        })
        .filter(d => d.fecha && !isNaN(d.monto))
        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    }

    return (
      <div className="space-y-6">
        {/* CSV Upload Section for Graphs */}
        <Card className="shadow-md border border-gray-200">
          <CardHeader>
            <CardTitle>Upload Data for Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label 
                  htmlFor="graph-csv-upload" 
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-background hover:bg-accent"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {isGraphLoading ? (
                      <Loader2 className="w-8 h-8 mb-2 text-muted-foreground animate-spin" />
                    ) : (
                      <FileSpreadsheet className="w-8 h-8 mb-2 text-muted-foreground" />
                    )}
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold">Click para subir archivo CSV</span> o drag y drop
                    </p>
                    <p className="text-xs text-muted-foreground">Solo archivos CSV (MAX. 50MB)</p>
                  </div>
                  <input 
                    id="graph-csv-upload" 
                    type="file" 
                    className="hidden" 
                    accept=".csv"
                    onChange={handleGraphFileChange}
                    disabled={isGraphLoading}
                  />
                </label>
              </div>
              {graphFile && (
                <div className="flex items-center gap-2 p-2 bg-accent rounded-md">
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm truncate">{graphFile.name}</span>
                  {isGraphLoading && (
                    <span className="text-sm text-muted-foreground">
                      Processing... {progress.toLocaleString()} rows
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Search Box */}
        {graphDataMap.size > 0 && (
          <Card className="shadow-md border border-gray-200">
            <CardHeader>
              <CardTitle>Search Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Enter ID to search..."
                    className="pl-8"
                    value={graphSearchId}
                    onChange={(e) => handleGraphSearch(e.target.value)}
                  />
                </div>
                {searchResult && (
                  <div className="space-y-4">
                    <Card className="shadow-md border border-gray-200">
                      <CardHeader>
                        <CardTitle>Total Monto</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col md:flex-row md:items-center md:gap-6">
                          <div className="text-2xl font-bold">${totalMonto.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                          <div className="flex gap-4 mt-2 md:mt-0">
                            <span className="inline-flex items-center px-2 py-1 rounded bg-accent text-xs font-medium">
                              Fisica: <span className="ml-1 font-bold">{fisicaCount}</span>
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded bg-accent text-xs font-medium">
                              Digital: <span className="ml-1 font-bold">{digitalCount}</span>
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="shadow-md border border-gray-200">
                      <CardHeader>
                        <CardTitle>Tipo de Venta (Pie Chart)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 w-full flex items-center justify-center">
                          {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                              <PieChart>
                                <Pie
                                  data={pieData}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={70}
                                  label={renderPieLabel}
                                >
                                  {pieData.map((_, idx) => (
                                    <Cell key={`cell-${idx}`} fill={pieColors[idx % pieColors.length]} />

                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <span className="text-muted-foreground">No tipo_venta data</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="shadow-md border border-gray-200">
                      <CardHeader>
                        <CardTitle>Transacciones por Comercio</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-72 w-full flex items-center justify-center">
                          {comercioStats.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                              <ReBarChart data={comercioStats} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                                <XAxis dataKey="comercio" fontSize={12} tick={{ fill: '#888' }} angle={-20} interval={0} height={60} />
                                <YAxis fontSize={12} tick={{ fill: '#888' }} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="count" fill="#6366f1" name="Transacciones" />
                              </ReBarChart>
                            </ResponsiveContainer>
                          ) : (
                            <span className="text-muted-foreground">No comercio data</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="shadow-md border border-gray-200">
                      <CardHeader>
                        <CardTitle>Monto por Comercio</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-72 w-full flex items-center justify-center">
                          {comercioStats.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                              <ReBarChart data={comercioStats} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                                <XAxis dataKey="comercio" fontSize={12} tick={{ fill: '#888' }} angle={-20} interval={0} height={60} />
                                <YAxis fontSize={12} tick={{ fill: '#888' }} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="monto" fill="#f59e42" name="Monto" />
                              </ReBarChart>
                            </ResponsiveContainer>
                          ) : (
                            <span className="text-muted-foreground">No comercio data</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="shadow-md border border-gray-200">
                      <CardHeader>
                        <CardTitle>Monto a lo largo del tiempo</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-72 w-full flex items-center justify-center">
                          {montoTimeData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                              <LineChart data={montoTimeData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                                <XAxis
                                  dataKey="fecha"
                                  fontSize={12}
                                  tick={{ fill: '#888' }}
                                  angle={-20}
                                  interval={25}
                                  height={60}
                                  tickFormatter={date => date.slice(0, 10)}
                                />
                                <YAxis fontSize={12} tick={{ fill: '#888' }} />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="monto" stroke="#6366f1" name="Monto" dot />
                              </LineChart>
                            </ResponsiveContainer>
                          ) : (
                            <span className="text-muted-foreground">No monto/time data</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {searchResult 
                    ? "Record found" 
                    : "Enter an ID to search for a record"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 border-r bg-card">
        <div className="flex items-center h-16 border-b px-6 gap-2">
          <img
            src="/hey.png"
            alt="Hey Banco Logo"
            className="h-8 w-auto"
          />
          
        </div>
        <nav className="space-y-4 p-4">
          {/* CSV Upload Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Upload CSV</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-center w-full">
                <label 
                  htmlFor="csv-upload" 
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-background hover:bg-accent"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {isLoading ? (
                      <Loader2 className="w-8 h-8 mb-2 text-muted-foreground animate-spin" />
                    ) : (
                      <FileSpreadsheet className="w-8 h-8 mb-2 text-muted-foreground" />
                    )}
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold">Click para subir archivo CSV</span> o drag y drop
                    </p>
                    <p className="text-xs text-muted-foreground">Solo archivos CSV (MAX. 50MB)</p>
                  </div>
                  <input 
                    id="csv-upload" 
                    type="file" 
                    className="hidden" 
                    accept=".csv"
                    onChange={handleFileChange}
                    disabled={isLoading}
                  />
                </label>
              </div>
              {selectedFile && (
                <div className="flex items-center gap-2 p-2 bg-accent rounded-md">
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm truncate">{selectedFile.name}</span>
                  {isLoading && (
                    <span className="text-sm text-muted-foreground">
                      Processing... {progress.toLocaleString()} rows
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="pt-4 border-t space-y-2">
            <Button 
              variant={currentView === 'records' ? 'default' : 'ghost'} 
              className="w-full justify-start"
              onClick={() => setCurrentView('records')}
            >
              <Table className="mr-2 h-4 w-4" />
              Records View
            </Button>
            <Button 
              variant={currentView === 'graphs' ? 'default' : 'ghost'} 
              className="w-full justify-start"
              onClick={() => setCurrentView('graphs')}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Graphs View
            </Button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="pl-64">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b bg-background">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold tracking-tight">
                {currentView === 'records' ? 'Registro' : 'Análisis Gráfico'}
              </h1>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-6">
          {currentView === 'records' ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="shadow-md border border-gray-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Records</CardTitle>
                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dataMap.size.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      {searchResult ? "Record found" : "Search by ID"}
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-md border border-gray-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Status</CardTitle>
                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-300 text-green-800">
                      Ready
                    </span>

                    <p className="text-xs text-muted-foreground">
                      {isLoading ? `${progress.toLocaleString()} rows processed` : "Search by ID"}
                    </p>

                  </CardContent>
                </Card>
              </div>

              <div className="mt-6">
                <Card className="shadow-md border border-gray-200">
                  <CardHeader>
                    <CardTitle>Search Records</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {isLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          <span className="ml-2 text-sm text-muted-foreground">
                            Loading data... {progress.toLocaleString()} rows processed
                          </span>
                        </div>
                      ) : dataMap.size > 0 ? (
                        <div className="space-y-4">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="search"
                              placeholder="Enter ID to search..."
                              className="pl-8"
                              value={searchId}
                              onChange={(e) => handleSearch(e.target.value)}
                            />
                          </div>
                          {searchResult && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h3 className="font-medium">Record Details:</h3>
                                <Button 
                                  onClick={handlePredict}
                                  disabled={isPredicting}
                                  size="sm"
                                  className="bg-primary text-white hover:bg-primary/90 rounded-md px-4 py-2 transition shadow"
>

                                  {isPredicting ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Desplegando resultados...
                                    </>
                                  ) : (
                                    'Desplegar Resultados'
                                  )}
                                </Button>
                              </div>
                              <div className="space-y-4">
                                {/* Mostrar el cliente arriba de la tabla */}
                                <p className="text-sm mt-2 mb-2">
                                  <span className="font-semibold">Cliente:</span>{" "}
                                  {searchResult.length > 0
                                    ? (Array.isArray(searchResult[0]) ? searchResult[0][0] : (searchResult[0] as Registro).id)
                                    : 'N/A'}
                                </p>


                                <div className="grid grid-cols-2 gap-4 mt-4">
                                  <Card className="p-4 shadow-sm border">
                                    <p className="text-sm text-muted-foreground">Total Subscripciones</p>
                                    <h2 className="text-xl font-semibold">{subscripcionesFiltradas.length}</h2>
                                  </Card>
                                  <Card className="p-4 shadow-sm border">
                                    <p className="text-sm text-muted-foreground">Total Cupones</p>
                                    <h2 className="text-xl font-semibold">{cuponesFiltrados.length}</h2>
                                  </Card>
                                </div>



                                {searchResult && (
                                  <>
                                    {(() => {
                                      const subscripcionesFiltradas = searchResult
                                        .map((row, i) => ({ row, index: i }))
                                        .filter(({ row, index }) =>
                                          predictions.has(index) &&
                                          subscripcionesSet.has(Array.isArray(row) ? row[2] : (row as Registro).comercio)

                                        )

                                        .sort((a, b) => predictions.get(a.index)!.dias_estimados - predictions.get(b.index)!.dias_estimados)

                                      const cuponesFiltrados = searchResult
                                        .map((row, i) => ({ row, index: i }))
                                        .filter(({ row, index }) =>
                                          predictions.has(index) &&
                                          !subscripcionesSet.has(Array.isArray(row) ? row[2] : (row as Registro).comercio)

                                        )

                                        .sort((a, b) => predictions.get(a.index)!.dias_estimados - predictions.get(b.index)!.dias_estimados)

                                      return (
                                        <>
                                          {renderTabla("Subscripciones", subscripcionesFiltradas, true)}
                                          {renderTabla("Cupones Disponibles", cuponesFiltrados, false)}

                                        </>
                                      )
                                    })()}
                                  </>
                                )}

                                {chartData && chartData.length > 0 && (
                                  <div className="mt-8 border rounded-md p-4">
                                    <h4 className="text-md font-semibold text-center mb-4">Timeline de Próximos Gastos Recurrentes</h4>
                                    <ResponsiveContainer width="100%" height={300}>
                                      <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                          dataKey="fechaEstimada"
                                          name="Fecha Estimada"
                                          type="category"
                                          tick={{ fontSize: 12 }}
                                          label={{
                                            value: 'Fecha Estimada',
                                            position: 'insideBottom',
                                            offset: -5,
                                            dy: 20,
                                            textAnchor: 'middle',
                                          }}
                                        />
                                        <YAxis
                                          dataKey="monto"
                                          name="Monto Estimado"
                                          tick={{ fontSize: 12 }}
                                          label={{ value: 'Monto Estimado', angle: -90, position: 'insideLeft' }}
                                        />
                                        <Tooltip />
                                        <Legend verticalAlign="top" align="right" />


                                        {/* Subscripciones */}
                                        <Scatter
                                          name="Subscripciones"
                                          data={chartData.filter((d): d is NonNullable<typeof d> => !!d).filter(d => d.tipo === "subscripcion")}

                                          fill="#6366f1"
                                          shape="circle"
                                        >
                                          <LabelList dataKey="comercio" position="top" fontSize={12} />
                                        </Scatter>

                                        {/* Cupones */}
                                        <Scatter
                                          name="Cupones"
                                          data={chartData.filter((d): d is NonNullable<typeof d> => !!d).filter(d => d.tipo === "cupon")}

                                          fill="#facc15"
                                          shape="circle"
                                        >
                                          <LabelList dataKey="comercio" position="top" fontSize={12} />
                                        </Scatter>
                                      </ScatterChart>
                                    </ResponsiveContainer>
                                  </div>
                                )}






                              </div>
                            </div>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {searchResult 
                              ? "Record found" 
                              : "Enter an ID to search for a record"}
                          </p>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">
                          Upload a CSV file to search records
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            renderGraphsView()
          )}
        </main>
      </div>
    </div>
  )
}

export default App
