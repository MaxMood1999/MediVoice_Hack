import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'

interface Department {
  id: number
  name: string
  description?: string
  hospital: number
}

interface HospitalData {
  id: number
  name: string
  region: string
  district: string
  address?: string
  phone?: string
  status: string
  departments: Department[]
}

interface HospitalStats {
  total_feedback: number
  critical_feedback: number
  avg_risk_score: number
}

export default function HospitalDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'

  const [hospital, setHospital] = useState<HospitalData | null>(null)
  const [stats, setStats] = useState<HospitalStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showDeptModal, setShowDeptModal] = useState(false)
  const [savingDept, setSavingDept] = useState(false)
  const [newDept, setNewDept] = useState({ name: '', description: '' })

  useEffect(() => { fetchHospitalDetails() }, [id])

  async function fetchHospitalDetails() {
    try {
      const [hospitalRes, statsRes] = await Promise.all([
        axios.get(`/api/hospitals/${id}/`),
        axios.get(`/api/hospitals/${id}/statistics/`)
      ])
      setHospital(hospitalRes.data)
      setStats(statsRes.data)
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error('Bu shifoxonani ko\'rishga ruxsatingiz yo\'q')
      } else {
        toast.error('Ma\'lumotlarni yuklashda xatolik')
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAddDepartment() {
    if (!newDept.name.trim()) { toast.error('Bo\'lim nomi kiritilmagan'); return }
    setSavingDept(true)
    try {
      await axios.post('/api/departments/', {
        name: newDept.name,
        description: newDept.description,
        hospital: parseInt(id!)
      })
      toast.success('Bo\'lim muvaffaqiyatli qo\'shildi!')
      setShowDeptModal(false)
      setNewDept({ name: '', description: '' })
      fetchHospitalDetails()
    } catch (error: any) {
      const msg = error.response?.data?.error ||
        error.response?.data?.name?.[0] ||
        JSON.stringify(error.response?.data) || 'Xatolik'
      toast.error(msg)
    } finally {
      setSavingDept(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!hospital) {
    return (
      <Layout title="Shifoxona topilmadi">
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">Shifoxona mavjud emas yoki ruxsat yo'q</p>
          <Link to="/hospitals" className="text-blue-600 hover:underline">← Orqaga</Link>
        </div>
      </Layout>
    )
  }

  // hospital admin faqat o'z shifoxonasini ko'rishi kerak — bu backendda tekshiriladi
  // lekin UI da ham aniq ko'rsatish kerak
  const canAddDepartment = isSuperAdmin || (!isSuperAdmin)
  // hospital admin ham o'z shifoxonasiga department qo'sha oladi (backend ruxsat beradi)

  return (
    <Layout title={hospital.name} subtitle={`${hospital.region}${hospital.district ? ', ' + hospital.district : ''}`}>
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-gray-500 mb-6">
        <Link to="/hospitals" className="hover:text-blue-600 transition">Shifoxonalar</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">{hospital.name}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm font-medium text-gray-500 mb-1">Jami murojaatlar</p>
          <p className="text-3xl font-bold text-gray-900">{stats?.total_feedback ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm font-medium text-gray-500 mb-1">Kritik murojaatlar</p>
          <p className="text-3xl font-bold text-red-600">{stats?.critical_feedback ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm font-medium text-gray-500 mb-1">O'rtacha risk</p>
          <p className="text-3xl font-bold text-gray-900">{stats?.avg_risk_score ?? 0}</p>
        </div>
      </div>

      {/* Hospital Info */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Shifoxona ma'lumotlari</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {hospital.address && (
            <div>
              <span className="text-gray-500">Manzil: </span>
              <span className="text-gray-900">{hospital.address}</span>
            </div>
          )}
          {hospital.phone && (
            <div>
              <span className="text-gray-500">Telefon: </span>
              <span className="text-gray-900">{hospital.phone}</span>
            </div>
          )}
          <div>
            <span className="text-gray-500">Holat: </span>
            <span className={`font-medium ${
              hospital.status === 'active' ? 'text-green-600' :
              hospital.status === 'inactive' ? 'text-gray-500' : 'text-red-600'
            }`}>
              {hospital.status === 'active' ? 'Faol' : hospital.status === 'inactive' ? 'Nofaol' : "To'xtatilgan"}
            </span>
          </div>
        </div>
      </div>

      {/* Departments */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Bo'limlar
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({hospital.departments?.length || 0} ta)
            </span>
          </h2>
          {canAddDepartment && (
            <button
              onClick={() => setShowDeptModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center text-sm"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Bo'lim qo'shish
            </button>
          )}
        </div>

        {hospital.departments && hospital.departments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {hospital.departments.map((dept) => (
              <div key={dept.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm">{dept.name}</h3>
                    {dept.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{dept.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-400">
            <svg className="mx-auto w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" />
            </svg>
            <p className="text-sm">Hozircha bo'limlar yo'q</p>
            {canAddDepartment && (
              <button onClick={() => setShowDeptModal(true)}
                className="mt-2 text-blue-600 hover:underline text-sm">
                + Bo'lim qo'shish
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add Department Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Yangi bo'lim qo'shish</h3>
              <button onClick={() => setShowDeptModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              <span className="font-medium text-gray-700">{hospital.name}</span> shifoxonasiga bo'lim qo'shiladi
            </p>
            <div className="space-y-4">
              <input type="text" placeholder="Bo'lim nomi *"
                value={newDept.name}
                onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <textarea placeholder="Tavsif (ixtiyoriy)"
                value={newDept.description}
                onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setShowDeptModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Bekor qilish
              </button>
              <button onClick={handleAddDepartment} disabled={savingDept}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                {savingDept ? 'Qo\'shilmoqda...' : 'Qo\'shish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
