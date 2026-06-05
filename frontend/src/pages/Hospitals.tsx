import { useState, useEffect } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'

interface Hospital {
  id: number
  name: string
  region: string
  district: string
  address?: string
  phone?: string
  status: 'active' | 'inactive' | 'suspended'
  departments_count: number
  active_qr_codes_count: number
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Faol',
  inactive: 'Nofaol',
  suspended: 'To\'xtatilgan',
}

export default function Hospitals() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newHospital, setNewHospital] = useState({
    name: '', region: '', district: '', address: '', phone: ''
  })

  useEffect(() => { fetchHospitals() }, [])

  async function fetchHospitals() {
    try {
      const response = await axios.get('/api/hospitals/')
      setHospitals(response.data.results || response.data)
    } catch {
      toast.error('Shifoxonalarni yuklashda xatolik')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreateHospital() {
    if (!newHospital.name.trim()) { toast.error('Nomi kiritilmagan'); return }
    if (!newHospital.region.trim()) { toast.error('Viloyat kiritilmagan'); return }
    setSaving(true)
    try {
      await axios.post('/api/hospitals/', newHospital)
      toast.success('Shifoxona muvaffaqiyatli yaratildi!')
      setShowModal(false)
      setNewHospital({ name: '', region: '', district: '', address: '', phone: '' })
      fetchHospitals()
    } catch (error: any) {
      const msg = error.response?.data?.name?.[0] || JSON.stringify(error.response?.data) || 'Xatolik'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <Layout
      title="Shifoxonalar"
      subtitle={isSuperAdmin ? 'Barcha shifoxonalarni boshqaring' : 'Sizning shifoxonangiz'}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Shifoxonalar ro'yxati
          <span className="ml-2 text-sm font-normal text-gray-400">({hospitals.length} ta)</span>
        </h2>
        {isSuperAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Yangi shifoxona
          </button>
        )}
      </div>

      {hospitals.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <svg className="mx-auto w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
          </svg>
          <p>Shifoxona topilmadi</p>
          {isSuperAdmin && (
            <button onClick={() => setShowModal(true)}
              className="mt-3 text-blue-600 hover:underline text-sm">
              + Yangi shifoxona qo'shish
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Nomi', 'Viloyat', 'Tuman', 'Holat', "Bo'limlar", 'QR Kodlar', 'Amallar'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {hospitals.map((hospital) => (
                <tr key={hospital.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{hospital.name}</div>
                    {hospital.phone && <div className="text-xs text-gray-400">{hospital.phone}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{hospital.region}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{hospital.district || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      hospital.status === 'active' ? 'bg-green-100 text-green-800' :
                      hospital.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {STATUS_LABELS[hospital.status] || hospital.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{hospital.departments_count}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{hospital.active_qr_codes_count}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link to={`/hospitals/${hospital.id}`}
                      className="text-blue-600 hover:text-blue-900 hover:underline">
                      Ko'rish →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Hospital Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Yangi shifoxona qo'shish</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              {[
                { key: 'name', placeholder: 'Shifoxona nomi *', required: true },
                { key: 'region', placeholder: 'Viloyat *', required: true },
                { key: 'district', placeholder: 'Tuman', required: false },
                { key: 'phone', placeholder: 'Telefon (+998...)', required: false },
              ].map(({ key, placeholder }) => (
                <input key={key} type="text" placeholder={placeholder}
                  value={(newHospital as any)[key]}
                  onChange={(e) => setNewHospital({ ...newHospital, [key]: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              ))}
              <textarea placeholder="Manzil"
                value={newHospital.address}
                onChange={(e) => setNewHospital({ ...newHospital, address: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                rows={2}
              />
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg">
                Bekor qilish
              </button>
              <button onClick={handleCreateHospital} disabled={saving}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                {saving ? 'Saqlanmoqda...' : 'Yaratish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
