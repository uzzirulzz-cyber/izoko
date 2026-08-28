import React, { useState, useRef } from 'react'
import Papa from 'papaparse'
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  Database,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Download,
  Trash2,
  Edit2,
  RefreshCw,
  Server,
  Layers,
  Zap,
  Tag,
  Check,
  Search,
  ExternalLink,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { Product, ProductCategory } from '../types'
import { formatPrice } from '../lib/currency'

interface CsvImporterModalProps {
  isOpen: boolean
  onClose: () => void
  existingProducts: Product[]
  onPublishProducts: (
    newProducts: Product[],
    mode: 'merge' | 'replace',
    syncToMongo?: boolean
  ) => void
}

export interface ParsedItem {
  id: string
  sku: string
  name: string
  category: ProductCategory
  description: string
  price: number
  originalPrice?: number
  stock: number
  digital: boolean
  image: string
  rating: number
  reviewCount: number
  deliveryType: 'Instant Auto-Email' | 'Courier Shipping (1-3 Days)' | 'Direct Activation'
  region: 'Global' | 'USA' | 'Europe' | 'Asia' | 'Pakistan'
  tags: string[]
  isHot?: boolean
  isFeatured?: boolean
  isValid: boolean
  validationErrors: string[]
}

const SAMPLE_CSV_CONTENT = `sku,name,category,price,stock,digital,image,description,deliveryType,region,rating,reviewCount
PB-NF-01,Netflix Premium 1 Month Ultra HD,Subscriptions,899,45,true,https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500,Private 4K profile with instant automated PIN activation,Instant Auto-Email,Global,4.9,230
PB-PS-25,PlayStation Network $25 Gift Card (US),Gift Cards,7200,60,true,https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=500,Official Sony PlayStation US digital store balance code,Instant Auto-Email,USA,5.0,180
PB-HY320,Magcubic HY320 4K Smart Android Cinema Projector,Smart Projectors,34500,18,false,https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=500,Native 1080P/4K decode 390 ANSI lumens Android 11 with 180° rotatable gimbal,Courier Shipping (1-3 Days),Global,4.9,94
PB-GPT-PLUS,ChatGPT Plus 1 Month VIP Direct Upgrade,AI & Productivity,6500,30,true,https://images.unsplash.com/photo-1677442136019-21780ecad995?w=500,Access GPT-4o o1 Canvas DALL-E 3 with dedicated high-speed server lane,Direct Activation,Global,4.9,310
PB-WIN11-PRO,Windows 11 Professional Retail License Key,Software,1499,120,true,https://images.unsplash.com/photo-1583508915901-b5f84c1dcde1?w=500,Lifetime official online activation key for 1 PC with free updates,Instant Auto-Email,Global,4.8,420
PB-STEAM-50,Steam Wallet $50 USD Global Digital Code,Games,14200,40,true,https://images.unsplash.com/photo-1612287232230-e54737d2f9ef?w=500,Instantly redeemable Steam wallet funds for any game or DLC,Instant Auto-Email,Global,4.9,150`

const DEFAULT_MONGO_URI =
  'mongodb+srv://new:KgSqbhLKjBK3R8lN@cluster0.mfghk5u.mongodb.net/?appName=Cluster0'

export const CsvImporterModal: React.FC<CsvImporterModalProps> = ({
  isOpen,
  onClose,
  existingProducts,
  onPublishProducts,
}) => {
  // Wizard steps: 'import' -> 'review' -> 'publish'
  const [currentStep, setCurrentStep] = useState<'import' | 'review' | 'publish'>('import')

  // Source selection: 'csv_upload' | 'csv_paste' | 'mongodb'
  const [sourceType, setSourceType] = useState<'csv_upload' | 'csv_paste' | 'mongodb'>('mongodb')

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<string | null>(null)

  // Raw text paste
  const [rawText, setRawText] = useState('')

  // MongoDB Connection State
  const [mongoUri, setMongoUri] = useState(DEFAULT_MONGO_URI)
  const [mongoDbName, setMongoDbName] = useState('playbeat')
  const [mongoCollection, setMongoCollection] = useState('products')
  const [isMongoTesting, setIsMongoTesting] = useState(false)
  const [mongoConnected, setMongoConnected] = useState(false)
  const [mongoStatusMsg, setMongoStatusMsg] = useState<string | null>(null)
  const [availableDbs, setAvailableDbs] = useState<string[]>([])
  const [availableCollections, setAvailableCollections] = useState<string[]>([])
  const [isMongoFetching, setIsMongoFetching] = useState(false)

  // Parsed Products State for Review
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([])
  const [searchReviewQuery, setSearchReviewQuery] = useState('')
  const [reviewFilter, setReviewFilter] = useState<'all' | 'valid' | 'invalid' | 'digital' | 'hardware'>('all')
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  // Publish Options
  const [publishMode, setPublishMode] = useState<'merge' | 'replace'>('merge')
  const [syncToMongoCloud, setSyncToMongoCloud] = useState(true)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState(false)
  const [publishedSummary, setPublishedSummary] = useState<{
    total: number
    digital: number
    hardware: number
    mongoSynced: boolean
  } | null>(null)

  if (!isOpen) return null

  // ==========================================
  // CSV PARSING ENGINE
  // ==========================================
  const parseCsvText = (text: string) => {
    Papa.parse(text.trim(), {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        const rows = results.data as Record<string, any>[]
        const mappedItems: ParsedItem[] = rows.map((row, index) => {
          const errors: string[] = []
          const name = String(row.name || row.title || row.Product || row.product_name || `Imported Item ${index + 1}`).trim()
          const rawSku = String(row.sku || row.SKU || row.id || `PB-IMP-${Math.floor(1000 + Math.random() * 9000)}`).trim()
          const category = (row.category || row.Category || 'Digital Products') as ProductCategory
          const price = Number(row.price || row.Price || row.amount || 0)
          const stock = Number(row.stock || row.Stock || row.quantity || 50)
          const digital =
            row.digital !== undefined
              ? String(row.digital).toLowerCase() === 'true' || row.digital === true || row.digital === 1
              : !category.toLowerCase().includes('projector')

          const image =
            row.image ||
            row.imageUrl ||
            row.image_url ||
            row.Image ||
            (digital
              ? 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500'
              : 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=500')

          const description = String(row.description || row.Description || `${name} - Official PlayBeat Verified Product`).trim()
          const rating = Number(row.rating || row.Rating || 4.9)
          const reviewCount = Number(row.reviewCount || row.reviews || 85)

          let deliveryType: 'Instant Auto-Email' | 'Courier Shipping (1-3 Days)' | 'Direct Activation' =
            digital ? 'Instant Auto-Email' : 'Courier Shipping (1-3 Days)'
          if (row.deliveryType && ['Instant Auto-Email', 'Courier Shipping (1-3 Days)', 'Direct Activation'].includes(row.deliveryType)) {
            deliveryType = row.deliveryType
          }

          let region: 'Global' | 'USA' | 'Europe' | 'Asia' | 'Pakistan' = 'Global'
          if (row.region && ['Global', 'USA', 'Europe', 'Asia', 'Pakistan'].includes(row.region)) {
            region = row.region
          }

          if (!name || name.length < 2) errors.push('Product name is required')
          if (isNaN(price) || price < 0) errors.push('Price must be a valid positive number')

          return {
            id: `imp-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
            sku: rawSku,
            name,
            category,
            description,
            price,
            stock,
            digital,
            image,
            rating,
            reviewCount,
            deliveryType,
            region,
            tags: [category, digital ? 'Digital' : 'Hardware', 'Instant'],
            isValid: errors.length === 0,
            validationErrors: errors,
          }
        })

        setParsedItems(mappedItems)
        if (mappedItems.length > 0) {
          setCurrentStep('review')
        }
      },
      error: (err) => {
        alert(`CSV Parsing Failed: ${err.message}`)
      },
    })
  }

  // Handle File Input
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setFileSize(`${(file.size / 1024).toFixed(1)} KB`)

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (content) {
        parseCsvText(content)
      }
    }
    reader.readAsText(file)
  }

  // Download Sample Template
  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'playbeat_products_template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Test MongoDB Connection
  const handleTestMongo = async () => {
    setIsMongoTesting(true)
    setMongoStatusMsg(null)
    try {
      const res = await fetch('/api/mongodb/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri: mongoUri, dbName: mongoDbName }),
      })
      const data = await res.json()
      if (data.success) {
        setMongoConnected(true)
        setMongoStatusMsg('Connected to MongoDB Cluster0 successfully!')
        if (data.databases && data.databases.length > 0) {
          setAvailableDbs(data.databases)
        }
        if (data.collections && data.collections.length > 0) {
          setAvailableCollections(data.collections)
        }
      } else {
        setMongoConnected(false)
        setMongoStatusMsg(data.error || 'Connection failed')
      }
    } catch (err: any) {
      setMongoConnected(false)
      setMongoStatusMsg(err.message || 'Server connection error')
    } finally {
      setIsMongoTesting(false)
    }
  }

  // Fetch Products directly from MongoDB
  const handleFetchFromMongo = async () => {
    setIsMongoFetching(true)
    try {
      const params = new URLSearchParams({
        uri: mongoUri,
        dbName: mongoDbName,
        collection: mongoCollection,
      })
      const res = await fetch(`/api/mongodb/products?${params.toString()}`)
      const data = await res.json()

      if (data.success && Array.isArray(data.products)) {
        if (data.products.length === 0) {
          alert(`Connected to MongoDB (${mongoDbName}.${mongoCollection}), but no product documents were found in this collection. You can upload or import products to populate it!`)
          return
        }

        const items: ParsedItem[] = data.products.map((p: any, idx: number) => {
          return {
            id: p.id || `mongo-${idx}`,
            sku: p.sku || `PB-M-${1000 + idx}`,
            name: p.name || 'Unnamed Product',
            category: p.category || 'Digital Products',
            description: p.description || '',
            price: Number(p.price) || 0,
            stock: Number(p.stock) || 50,
            digital: p.digital !== undefined ? Boolean(p.digital) : true,
            image: p.image || '/playbeat-logo.png',
            rating: Number(p.rating) || 4.9,
            reviewCount: Number(p.reviewCount) || 120,
            deliveryType: p.deliveryType || 'Instant Auto-Email',
            region: p.region || 'Global',
            tags: Array.isArray(p.tags) ? p.tags : ['Synced', 'MongoDB'],
            isValid: true,
            validationErrors: [],
          }
        })

        setParsedItems(items)
        setCurrentStep('review')
      } else {
        alert(data.error || 'Failed to fetch documents from MongoDB collection')
      }
    } catch (err: any) {
      alert(`MongoDB Fetch Error: ${err.message}`)
    } finally {
      setIsMongoFetching(false)
    }
  }

  // Filter parsed items in review step
  const filteredReviewItems = parsedItems.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(searchReviewQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchReviewQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchReviewQuery.toLowerCase())

    if (!matchSearch) return false

    if (reviewFilter === 'valid') return item.isValid
    if (reviewFilter === 'invalid') return !item.isValid
    if (reviewFilter === 'digital') return item.digital
    if (reviewFilter === 'hardware') return !item.digital
    return true
  })

  // Review Row Edits
  const handleUpdateItem = (id: string, updates: Partial<ParsedItem>) => {
    setParsedItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...updates }
          const errors: string[] = []
          if (!updated.name || updated.name.length < 2) errors.push('Product name is required')
          if (isNaN(updated.price) || updated.price < 0) errors.push('Valid price required')
          return {
            ...updated,
            isValid: errors.length === 0,
            validationErrors: errors,
          }
        }
        return item
      })
    )
  }

  const handleDeleteItem = (id: string) => {
    setParsedItems((prev) => prev.filter((item) => item.id !== id))
  }

  // Publish Process
  const handleExecutePublish = async () => {
    setIsPublishing(true)
    try {
      const validProductsToPublish: Product[] = parsedItems
        .filter((item) => item.isValid)
        .map((item) => ({
          id: item.id,
          sku: item.sku,
          name: item.name,
          category: item.category,
          description: item.description,
          price: item.price,
          originalPrice: item.originalPrice || Math.round(item.price * 1.15),
          stock: item.stock,
          digital: item.digital,
          image: item.image,
          rating: item.rating,
          reviewCount: item.reviewCount,
          deliveryType: item.deliveryType,
          region: item.region,
          tags: item.tags,
          isHot: item.isHot || false,
          isFeatured: item.isFeatured || false,
        }))

      // Sync to MongoDB Cloud if requested
      let mongoSuccess = false
      if (syncToMongoCloud) {
        try {
          const res = await fetch('/api/mongodb/products/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              products: validProductsToPublish,
              uri: mongoUri,
              dbName: mongoDbName,
              collection: mongoCollection,
              replaceAll: publishMode === 'replace',
            }),
          })
          const data = await res.json()
          if (data.success) {
            mongoSuccess = true
          }
        } catch (err) {
          console.error('Failed to sync to MongoDB API:', err)
        }
      }

      // Update Local State / Storefront Catalog
      onPublishProducts(validProductsToPublish, publishMode, syncToMongoCloud)

      // Confetti & Celebration
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#FFC107', '#38BDF8', '#10B981', '#F59E0B'],
      })

      const digitalCount = validProductsToPublish.filter((p) => p.digital).length
      const hardwareCount = validProductsToPublish.length - digitalCount

      setPublishedSummary({
        total: validProductsToPublish.length,
        digital: digitalCount,
        hardware: hardwareCount,
        mongoSynced: mongoSuccess,
      })

      setPublishSuccess(true)
      setCurrentStep('publish')
    } catch (err: any) {
      alert(`Publish error: ${err.message}`)
    } finally {
      setIsPublishing(false)
    }
  }

  // Summary KPIs for Review
  const totalCount = parsedItems.length
  const validCount = parsedItems.filter((p) => p.isValid).length
  const digitalCount = parsedItems.filter((p) => p.digital).length
  const hardwareCount = totalCount - digitalCount
  const totalValue = parsedItems.reduce((acc, p) => acc + (p.price || 0) * (p.stock || 0), 0)

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl rounded-3xl bg-[#090D18] border border-amber-500/30 shadow-[0_0_50px_rgba(0,0,0,0.9),0_0_30px_rgba(255,193,7,0.15)] flex flex-col max-h-[90vh] overflow-hidden text-zinc-100 font-sans">
        {/* ========================================== */}
        {/* MODAL HEADER WITH 3-STEP PROGRESS */}
        {/* ========================================== */}
        <div className="px-6 py-4 border-b border-white/10 bg-[#0C1120] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-black shadow-lg shadow-amber-400/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-tight">
                  Product Importer & Database Sync
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-[10px] font-mono text-amber-300 font-bold">
                  v3.4 Multi-Source
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                Import CSV files, paste data, or sync live with MongoDB Cluster0
              </p>
            </div>
          </div>

          {/* Stepper Navigation */}
          <div className="flex items-center gap-2 bg-[#070A12] p-1.5 rounded-2xl border border-white/5 text-xs font-mono">
            {/* Step 1 */}
            <div
              onClick={() => !publishSuccess && setCurrentStep('import')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl cursor-pointer transition ${
                currentStep === 'import'
                  ? 'bg-amber-400 text-black font-bold shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-black/20 text-[10px] flex items-center justify-center font-bold">
                1
              </span>
              <span>Import Source</span>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />

            {/* Step 2 */}
            <div
              onClick={() => parsedItems.length > 0 && !publishSuccess && setCurrentStep('review')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                currentStep === 'review'
                  ? 'bg-amber-400 text-black font-bold shadow'
                  : parsedItems.length > 0
                  ? 'text-zinc-400 hover:text-white cursor-pointer'
                  : 'text-zinc-600 cursor-not-allowed'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-black/20 text-[10px] flex items-center justify-center font-bold">
                2
              </span>
              <span>Review ({parsedItems.length})</span>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />

            {/* Step 3 */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                currentStep === 'publish'
                  ? 'bg-emerald-400 text-black font-bold shadow'
                  : 'text-zinc-600'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-black/20 text-[10px] flex items-center justify-center font-bold">
                3
              </span>
              <span>Publish</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================== */}
        {/* MODAL BODY */}
        {/* ========================================== */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* ========================================================= */}
          {/* STEP 1: IMPORT SOURCE (CSV / PASTE / MONGODB) */}
          {/* ========================================================= */}
          {currentStep === 'import' && (
            <div className="space-y-6">
              {/* Source Tabs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSourceType('mongodb')}
                  className={`p-4 rounded-2xl border text-left transition flex items-start gap-3.5 ${
                    sourceType === 'mongodb'
                      ? 'bg-amber-500/10 border-amber-400 text-white shadow-lg shadow-amber-400/10'
                      : 'bg-[#0E1322] border-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                  }`}
                >
                  <div className="p-2.5 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white flex items-center gap-2">
                      <span>MongoDB Cluster0</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-400">
                        Live Sync
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                      Connect to your Mongo database & fetch stored products
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSourceType('csv_upload')}
                  className={`p-4 rounded-2xl border text-left transition flex items-start gap-3.5 ${
                    sourceType === 'csv_upload'
                      ? 'bg-amber-500/10 border-amber-400 text-white shadow-lg shadow-amber-400/10'
                      : 'bg-[#0E1322] border-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                  }`}
                >
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">Upload CSV File</div>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                      Drag & drop your .csv spreadsheet or product catalog export
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSourceType('csv_paste')}
                  className={`p-4 rounded-2xl border text-left transition flex items-start gap-3.5 ${
                    sourceType === 'csv_paste'
                      ? 'bg-amber-500/10 border-amber-400 text-white shadow-lg shadow-amber-400/10'
                      : 'bg-[#0E1322] border-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                  }`}
                >
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">Direct Raw Text Paste</div>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                      Paste comma-separated rows or exported table text directly
                    </p>
                  </div>
                </button>
              </div>

              {/* TAB CONTENT 1: MONGODB CLUSTER SYNC */}
              {sourceType === 'mongodb' && (
                <div className="rounded-2xl bg-[#0E1322] border border-white/10 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-amber-400" />
                      <h3 className="font-bold text-sm text-white">
                        MongoDB Connection Configuration
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      {mongoConnected ? (
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>Cluster Connected</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl bg-zinc-800 text-zinc-400 font-mono text-xs">
                          Not Connected
                        </span>
                      )}
                    </div>
                  </div>

                  {/* URI Input */}
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                      MongoDB Connection URI
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={mongoUri}
                        onChange={(e) => setMongoUri(e.target.value)}
                        placeholder="mongodb+srv://user:pass@cluster.mongodb.net/..."
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#070A12] border border-white/10 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-400/50"
                      />
                      <button
                        type="button"
                        onClick={handleTestMongo}
                        disabled={isMongoTesting}
                        className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-mono font-semibold text-white transition flex items-center gap-2 disabled:opacity-50"
                      >
                        {isMongoTesting ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Zap className="w-4 h-4 text-amber-400" />
                        )}
                        <span>Test Ping</span>
                      </button>
                    </div>
                    {mongoStatusMsg && (
                      <p
                        className={`text-xs font-mono mt-2 ${
                          mongoConnected ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {mongoStatusMsg}
                      </p>
                    )}
                  </div>

                  {/* Database and Collection Pickers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-mono text-zinc-400 mb-1">
                        Database Name
                      </label>
                      {availableDbs.length > 0 ? (
                        <select
                          value={mongoDbName}
                          onChange={(e) => setMongoDbName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#070A12] border border-white/10 text-xs font-mono text-white focus:outline-none"
                        >
                          {availableDbs.map((db) => (
                            <option key={db} value={db}>
                              {db}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={mongoDbName}
                          onChange={(e) => setMongoDbName(e.target.value)}
                          placeholder="playbeat"
                          className="w-full px-3 py-2 rounded-xl bg-[#070A12] border border-white/10 text-xs font-mono text-white focus:outline-none"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-zinc-400 mb-1">
                        Collection Name
                      </label>
                      {availableCollections.length > 0 ? (
                        <select
                          value={mongoCollection}
                          onChange={(e) => setMongoCollection(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#070A12] border border-white/10 text-xs font-mono text-white focus:outline-none"
                        >
                          {availableCollections.map((col) => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={mongoCollection}
                          onChange={(e) => setMongoCollection(e.target.value)}
                          placeholder="products"
                          className="w-full px-3 py-2 rounded-xl bg-[#070A12] border border-white/10 text-xs font-mono text-white focus:outline-none"
                        />
                      )}
                    </div>
                  </div>

                  {/* Action Row */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/5">
                    <div className="text-xs text-zinc-400 font-mono">
                      Target: <strong className="text-amber-300">{mongoDbName}.{mongoCollection}</strong>
                    </div>

                    <button
                      type="button"
                      onClick={handleFetchFromMongo}
                      disabled={isMongoFetching}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs transition shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isMongoFetching ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Database className="w-4 h-4" />
                      )}
                      <span>Fetch Products from MongoDB</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB CONTENT 2: FILE DRAG AND DROP */}
              {sourceType === 'csv_upload' && (
                <div className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/20 hover:border-amber-400/80 rounded-3xl p-8 bg-[#0C1120] hover:bg-[#0E1528] transition flex flex-col items-center justify-center gap-3 cursor-pointer text-center group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv,application/vnd.ms-excel"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    <div className="w-16 h-16 rounded-3xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition duration-300 shadow-xl shadow-amber-400/10">
                      <UploadCloud className="w-8 h-8" />
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Click to browse or drag & drop CSV file
                      </h4>
                      <p className="text-xs text-zinc-400 mt-1 font-mono">
                        Supports UTF-8 CSV with standard product catalog headers
                      </p>
                    </div>

                    {fileName && (
                      <div className="mt-2 px-3 py-1 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 font-mono text-xs">
                        Loaded: <strong>{fileName}</strong> ({fileSize})
                      </div>
                    )}
                  </div>

                  {/* Sample Template Download */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-[#0E1322] border border-white/5">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                      <div>
                        <div className="font-semibold text-xs text-white">
                          Need a structured template?
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono">
                          Pre-configured columns for digital keys, subscriptions & smart projectors
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadSample}
                      className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-zinc-200 hover:text-white transition flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span>Download Sample CSV</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB CONTENT 3: RAW CSV TEXT PASTE */}
              {sourceType === 'csv_paste' && (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-[#0E1322] border border-white/10 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono text-zinc-300 font-semibold">
                        Paste Raw CSV Data
                      </label>
                      <button
                        type="button"
                        onClick={() => setRawText(SAMPLE_CSV_CONTENT)}
                        className="text-[11px] font-mono text-amber-400 hover:underline"
                      >
                        Paste Sample Data
                      </button>
                    </div>
                    <textarea
                      rows={8}
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder="sku,name,category,price,stock,digital,image,description..."
                      className="w-full p-3 rounded-xl bg-[#070A12] border border-white/10 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-400/50 resize-y"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={!rawText.trim()}
                      onClick={() => parseCsvText(rawText)}
                      className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs transition shadow-lg shadow-amber-400/20 flex items-center gap-2 disabled:opacity-50"
                    >
                      <span>Parse & Review Data</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 2: REVIEW & INLINE EDITING */}
          {/* ========================================================= */}
          {currentStep === 'review' && (
            <div className="space-y-4">
              {/* Summary KPIs Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#0E1322] border border-white/5 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider">
                    Total Products
                  </span>
                  <div className="text-xl font-extrabold text-white font-mono">{totalCount}</div>
                  <div className="text-[10px] text-emerald-400 font-mono">
                    ✓ {validCount} Ready to Publish
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0E1322] border border-white/5 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider">
                    Digital Keys
                  </span>
                  <div className="text-xl font-extrabold text-amber-400 font-mono">
                    {digitalCount}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono">Instant Auto-Email</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0E1322] border border-white/5 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider">
                    Hardware / Projectors
                  </span>
                  <div className="text-xl font-extrabold text-cyan-400 font-mono">
                    {hardwareCount}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono">Physical Courier</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0E1322] border border-white/5 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider">
                    Total Inventory Value
                  </span>
                  <div className="text-xl font-extrabold text-emerald-400 font-mono">
                    {formatPrice(totalValue, 'PKR')}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono">Base Currency (PKR)</div>
                </div>
              </div>

              {/* Review Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[#0E1322] border border-white/5">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={searchReviewQuery}
                    onChange={(e) => setSearchReviewQuery(e.target.value)}
                    placeholder="Search imported items..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#070A12] border border-white/5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
                  {(
                    [
                      { id: 'all', label: `All (${totalCount})` },
                      { id: 'valid', label: `Ready (${validCount})` },
                      { id: 'digital', label: `Digital (${digitalCount})` },
                      { id: 'hardware', label: `Hardware (${hardwareCount})` },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setReviewFilter(tab.id)}
                      className={`px-3 py-1 rounded-xl transition ${
                        reviewFilter === tab.id
                          ? 'bg-amber-400 text-black font-bold'
                          : 'bg-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Grid Table */}
              <div className="rounded-2xl bg-[#0C1120] border border-white/10 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#070A12] border-b border-white/10 text-zinc-400 font-mono uppercase text-[10px] sticky top-0 z-10">
                      <tr>
                        <th className="p-3">Product Name & SKU</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Price (PKR)</th>
                        <th className="p-3">Stock</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredReviewItems.map((item) => {
                        const isEditing = editingItemId === item.id
                        return (
                          <tr key={item.id} className="hover:bg-white/[0.02] transition">
                            <td className="p-3">
                              {isEditing ? (
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) =>
                                      handleUpdateItem(item.id, { name: e.target.value })
                                    }
                                    className="w-full px-2 py-1 rounded bg-[#070A12] border border-amber-400 text-xs text-white"
                                  />
                                  <input
                                    type="text"
                                    value={item.sku}
                                    onChange={(e) =>
                                      handleUpdateItem(item.id, { sku: e.target.value })
                                    }
                                    placeholder="SKU"
                                    className="w-32 px-2 py-0.5 rounded bg-[#070A12] border border-white/20 text-[10px] font-mono text-zinc-300"
                                  />
                                </div>
                              ) : (
                                <div className="flex items-center gap-2.5">
                                  <img
                                    src={item.image}
                                    alt={item.name}
                                    className="w-8 h-8 rounded-lg object-cover bg-zinc-900 shrink-0"
                                  />
                                  <div>
                                    <div className="font-semibold text-white line-clamp-1">
                                      {item.name}
                                    </div>
                                    <div className="text-[10px] font-mono text-zinc-400">
                                      {item.sku}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </td>

                            <td className="p-3">
                              {isEditing ? (
                                <select
                                  value={item.category}
                                  onChange={(e) =>
                                    handleUpdateItem(item.id, {
                                      category: e.target.value as ProductCategory,
                                    })
                                  }
                                  className="px-2 py-1 rounded bg-[#070A12] border border-white/20 text-xs text-white"
                                >
                                  <option>Subscriptions</option>
                                  <option>Gift Cards</option>
                                  <option>Smart Projectors</option>
                                  <option>AI & Productivity</option>
                                  <option>Games</option>
                                  <option>Software</option>
                                </select>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-zinc-300">
                                  {item.category}
                                </span>
                              )}
                            </td>

                            <td className="p-3 font-mono font-bold text-amber-400">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={item.price}
                                  onChange={(e) =>
                                    handleUpdateItem(item.id, { price: Number(e.target.value) })
                                  }
                                  className="w-24 px-2 py-1 rounded bg-[#070A12] border border-amber-400 text-xs text-white"
                                />
                              ) : (
                                formatPrice(item.price, 'PKR')
                              )}
                            </td>

                            <td className="p-3 font-mono text-zinc-300">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={item.stock}
                                  onChange={(e) =>
                                    handleUpdateItem(item.id, { stock: Number(e.target.value) })
                                  }
                                  className="w-16 px-2 py-1 rounded bg-[#070A12] border border-white/20 text-xs text-white"
                                />
                              ) : (
                                `${item.stock} in stock`
                              )}
                            </td>

                            <td className="p-3 font-mono text-[11px]">
                              {isEditing ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateItem(item.id, { digital: !item.digital })
                                  }
                                  className="px-2 py-0.5 rounded text-[10px] bg-white/10 text-white"
                                >
                                  {item.digital ? '⚡ Digital' : '📦 Hardware'}
                                </button>
                              ) : item.digital ? (
                                <span className="text-emerald-400">⚡ Digital</span>
                              ) : (
                                <span className="text-cyan-400">📦 Hardware</span>
                              )}
                            </td>

                            <td className="p-3">
                              {item.isValid ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  Ready
                                </span>
                              ) : (
                                <span
                                  title={item.validationErrors.join(', ')}
                                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1 cursor-help"
                                >
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Issue</span>
                                </span>
                              )}
                            </td>

                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingItemId(isEditing ? null : item.id)
                                  }
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white"
                                  title={isEditing ? 'Done Editing' : 'Edit Row'}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                                  title="Delete Row"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons for Step 2 */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setCurrentStep('import')}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-300 flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Source</span>
                </button>

                <div className="flex items-center gap-3">
                  <div className="hidden sm:block text-right">
                    <div className="text-xs font-semibold text-white">
                      {validCount} of {totalCount} items verified
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      Ready for immediate live store publishing
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={validCount === 0}
                    onClick={() => setCurrentStep('publish')}
                    className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs transition shadow-lg shadow-amber-400/20 flex items-center gap-2 disabled:opacity-50"
                  >
                    <span>Proceed to Publish</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 3: PUBLISH OPTIONS & CONFIRMATION */}
          {/* ========================================================= */}
          {currentStep === 'publish' && !publishSuccess && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-[#0E1322] border border-white/10 p-5 space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-white">
                    Publishing Target & Catalog Strategy
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Select how newly verified products will be merged into the active PlayBeat catalog.
                  </p>
                </div>

                {/* Merge vs Replace */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => setPublishMode('merge')}
                    className={`p-4 rounded-2xl border cursor-pointer transition ${
                      publishMode === 'merge'
                        ? 'bg-amber-400/10 border-amber-400 text-white'
                        : 'bg-[#070A12] border-white/5 text-zinc-400 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-xs text-white flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-amber-400" />
                        <span>Merge with Existing Catalog (Recommended)</span>
                      </div>
                      {publishMode === 'merge' && (
                        <CheckCircle2 className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Preserves existing catalog products. Updates existing SKUs with new prices/stock and appends all new products.
                    </p>
                  </div>

                  <div
                    onClick={() => setPublishMode('replace')}
                    className={`p-4 rounded-2xl border cursor-pointer transition ${
                      publishMode === 'replace'
                        ? 'bg-rose-500/10 border-rose-500 text-white'
                        : 'bg-[#070A12] border-white/5 text-zinc-400 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-xs text-white flex items-center gap-1.5">
                        <RefreshCw className="w-4 h-4 text-rose-400" />
                        <span>Replace Entire Catalog</span>
                      </div>
                      {publishMode === 'replace' && (
                        <CheckCircle2 className="w-4 h-4 text-rose-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Wipes current catalog and sets these {validCount} items as the sole active products.
                    </p>
                  </div>
                </div>

                {/* MongoDB Cloud Sync Checkbox */}
                <div className="p-4 rounded-2xl bg-[#070A12] border border-amber-500/20 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">
                        Simultaneously Persist to MongoDB Cloud Vault
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono">
                        Target: {mongoDbName}.{mongoCollection} ({DEFAULT_MONGO_URI.split('@')[1]?.split('/')[0]})
                      </div>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={syncToMongoCloud}
                      onChange={(e) => setSyncToMongoCloud(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-400"></div>
                  </label>
                </div>
              </div>

              {/* Ready to Publish Action Bar */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep('review')}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-300 flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Review</span>
                </button>

                <button
                  type="button"
                  disabled={isPublishing}
                  onClick={handleExecutePublish}
                  className="px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-black font-extrabold text-sm transition shadow-2xl shadow-amber-400/30 hover:scale-105 active:scale-95 flex items-center gap-2 disabled:opacity-50"
                >
                  {isPublishing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>Publish {validCount} Products Now</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 3 SUCCESS STATE */}
          {/* ========================================================= */}
          {currentStep === 'publish' && publishSuccess && publishedSummary && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-5 animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center shadow-2xl shadow-emerald-500/20">
                <Check className="w-10 h-10 stroke-[3]" />
              </div>

              <div className="space-y-1 max-w-md">
                <h3 className="text-xl font-extrabold text-white">
                  Products Published Successfully!
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  Your store catalog is now live with the newly imported and synced inventory.
                </p>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-lg p-4 rounded-2xl bg-[#0E1322] border border-white/5 text-center font-mono">
                <div>
                  <div className="text-lg font-black text-white">{publishedSummary.total}</div>
                  <div className="text-[10px] text-zinc-400 uppercase">Live Products</div>
                </div>
                <div>
                  <div className="text-lg font-black text-amber-400">{publishedSummary.digital}</div>
                  <div className="text-[10px] text-zinc-400 uppercase">Digital Keys</div>
                </div>
                <div>
                  <div className="text-lg font-black text-cyan-400">{publishedSummary.hardware}</div>
                  <div className="text-[10px] text-zinc-400 uppercase">Hardware</div>
                </div>
              </div>

              {publishedSummary.mongoSynced && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-xs">
                  <Database className="w-3.5 h-3.5" />
                  <span>Verified: Synced to MongoDB Cluster0</span>
                </div>
              )}

              <div className="pt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs transition shadow-lg shadow-amber-400/20"
                >
                  Return to Admin Product Manager
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
