import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'

interface QRCode {
  id: number
  uuid: string
  department_name: string
  hospital_name: string
  status: 'active' | 'inactive' | 'deactivated'
  feedback_url: string
  scan_count: number
  created_at: string
}

interface Department {
  id: number
  name: string
  hospital: number
  hospital_name: string
}

export default function QRCodeGenerator() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'
  const [qrCodes, setQRCodes] = useState<QRCode[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    try {
      const [qrRes, deptRes] = await Promise.all([
        axios.get('/api/qrcodes/'),
        axios.get('/api/departments/')
      ])
      setQRCodes(qrRes.data.results || qrRes.data)
      setDepartments(deptRes.data.results || deptRes.data)
    } catch {
      toast.error('Ma\'lumotlarni yuklashda xatolik')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleGenerateQR() {
    if (!selectedDepartment) { toast.error('Bo\'lim tanlang'); return }
    setSaving(true)
    try {
      await axios.post('/api/qrcodes/', {
        department: parseInt(selectedDepartment),
        status: 'active'
      })
      toast.success('QR kod muvaffaqiyatli yaratildi!')
      setShowModal(false)
      setSelectedDepartment('')
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Xatolik yuz berdi')
    } finally {
      setSaving(false)
    }
  }

  function copyToClipboard(url: string) {
    navigator.clipboard.writeText(url)
    toast.success('URL nusxalandi!')
  }

  function downloadQR(qr: QRCode) {
    const canvas = document.createElement('canvas')
    const size = 300
    canvas.width = size
    canvas.height = size + 60
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr.feedback_url)}`
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 300, 300)
      ctx.fillStyle = '#111'
      ctx.font = 'bold 13px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(qr.department_name, 150, 322)
      ctx.font = '11px Arial'
      ctx.fillStyle = '#555'
      ctx.fillText(qr.hospital_name, 150, 340)
      const link = document.createElement('a')
      link.download = `qr-${qr.department_name}.png`
      link.href = canvas.toDataURL()
      link.click()
    }
    img.src = qrUrl
  }

  function printQR(qr: QRCode) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr.feedback_url)}`
    const win = window.open('', '_blank')!
    win.document.write(`
      <html><head><title>QR - ${qr.department_name}</title></head>
      <body style="text-align:center;font-family:Arial;padding:20px">
        <h2 style="margin:0 0 4px">${qr.hospital_name}</h2>
        <h3 style="margin:0 0 16px;color:#555">${qr.department_name}</h3>
        <img src="${qrUrl}" style="width:280px;border:1px solid #eee;padding:8px"/>
        <p style="font-size:11px;color:#888;margin-top:8px">${qr.feedback_url}</p>
        <script>window.onload=()=>{window.print()}<\/script>
      </body></html>
    `)
    win.document.close()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <Layout title="QR Kodlar" subtitle="Bo'limlar uchun QR kodlar">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          QR Kodlar
          <span className="ml-2 text-sm font-normal text-gray-400">({qrCodes.length} ta)</span>
        </h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Yangi QR kod
        </button>
      </div>

      {qrCodes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <svg className="mx-auto w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          <p>Hozircha QR kodlar yo'q</p>
          <button onClick={() => setShowModal(true)} className="mt-2 text-blue-600 hover:underline text-sm">
            + Yangi QR kod yaratish
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {qrCodes.map((qr) => (
            <div key={qr.id} className="bg-white rounded-xl shadow-sm p-5 flex flex-col">
              {/* QR Preview */}
              <div className="flex justify-center mb-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qr.feedback_url)}`}
                  alt="QR kod"
                  className="w-28 h-28 rounded border border-gray-100"
                />
              </div>

              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{qr.department_name}</h3>
                  <p className="text-xs text-gray-400">{qr.hospital_name}</p>
                </div>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                  qr.status === 'active' ? 'bg-green-100 text-green-700' :
                  qr.status === 'inactive' ? 'bg-gray-100 text-gray-600' :
                  'bg-red-100 text-red-700'
                }`}>
                  {qr.status === 'active' ? 'Faol' : qr.status === 'inactive' ? 'Nofaol' : "O'chirilgan"}
                </span>
              </div>

              <div className="bg-gray-50 rounded-lg p-2.5 mb-3">
                <p className="text-xs text-gray-400 mb-0.5">URL:</p>
                <p className="text-xs font-mono text-gray-600 truncate">{qr.feedback_url}</p>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                <span>Skanerlangan: <b className="text-gray-700">{qr.scan_count}</b> marta</span>
                <span>{new Date(qr.created_at).toLocaleDateString('uz-UZ')}</span>
              </div>

              <div className="flex space-x-2 mt-auto">
                <button onClick={() => copyToClipboard(qr.feedback_url)}
                  className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 transition text-xs font-medium">
                  URL nusxalash
                </button>
                <button onClick={() => downloadQR(qr)}
                  className="flex-1 bg-green-50 text-green-700 px-3 py-2 rounded-lg hover:bg-green-100 transition text-xs font-medium">
                  Yuklab olish
                </button>
                <button onClick={() => printQR(qr)}
                  className="flex-1 bg-purple-50 text-purple-700 px-3 py-2 rounded-lg hover:bg-purple-100 transition text-xs font-medium">
                  Chop etish
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Yangi QR kod yaratish</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bo'lim tanlang</label>
              {departments.length === 0 ? (
                <p className="text-sm text-gray-500 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  Hozircha bo'limlar yo'q. Avval shifoxonaga bo'lim qo'shing.
                </p>
              ) : (
                <select value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">— Bo'lim tanlang —</option>
                  {isSuperAdmin ? (
                    // Super admin uchun shifoxona bo'yicha guruhlash
                    Object.entries(
                      departments.reduce((acc, d) => {
                        if (!acc[d.hospital_name]) acc[d.hospital_name] = []
                        acc[d.hospital_name].push(d)
                        return acc
                      }, {} as Record<string, Department[]>)
                    ).map(([hospitalName, depts]) => (
                      <optgroup key={hospitalName} label={hospitalName}>
                        {depts.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </optgroup>
                    ))
                  ) : (
                    departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))
                  )}
                </select>
              )}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Bekor qilish
              </button>
              <button onClick={handleGenerateQR} disabled={saving || !selectedDepartment}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                {saving ? 'Yaratilmoqda...' : 'Yaratish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
