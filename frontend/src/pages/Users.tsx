import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'

interface AdminUser {
  id: number
  username: string
  first_name: string
  last_name: string
  email: string
  role: 'super_admin' | 'hospital_admin'
  phone?: string
}

interface Hospital {
  id: number
  name: string
}

export default function Users() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isSuperAdmin = user?.role === 'super_admin'

  const [users, setUsers] = useState<AdminUser[]>([])
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'hospital_admin' as 'super_admin' | 'hospital_admin',
    hospital_id: '',
  })

  useEffect(() => {
    // Faqat super_admin bu sahifani ko'ra oladi
    if (!isSuperAdmin) {
      navigate('/')
      return
    }
    fetchData()
  }, [isSuperAdmin])

  async function fetchData() {
    try {
      const [usersRes, hospitalsRes] = await Promise.all([
        axios.get('/api/users/'),
        axios.get('/api/hospitals/')
      ])
      setUsers(usersRes.data)
      setHospitals(hospitalsRes.data.results || hospitalsRes.data)
    } catch {
      toast.error('Ma\'lumotlarni yuklashda xatolik')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreateUser() {
    if (!newUser.username.trim()) { toast.error('Foydalanuvchi nomi kiritilmagan'); return }
    if (!newUser.password.trim()) { toast.error('Parol kiritilmagan'); return }
    if (newUser.password.length < 6) { toast.error('Parol kamida 6 ta belgidan iborat bo\'lishi kerak'); return }
    if (newUser.role === 'hospital_admin' && !newUser.hospital_id) {
      toast.error('Shifoxona admin uchun shifoxona tanlanishi shart')
      return
    }
    setSaving(true)
    try {
      await axios.post('/api/auth/register/', {
        username: newUser.username,
        email: newUser.email,
        password: newUser.password,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        phone: newUser.phone,
        role: newUser.role,
        hospital_id: newUser.role === 'hospital_admin' ? parseInt(newUser.hospital_id) : undefined,
      })
      toast.success('Admin muvaffaqiyatli yaratildi!')
      setShowModal(false)
      setNewUser({
        username: '', email: '', password: '', first_name: '', last_name: '',
        phone: '', role: 'hospital_admin', hospital_id: ''
      })
      fetchData()
    } catch (error: any) {
      const data = error.response?.data
      const msg = data?.username?.[0] || data?.email?.[0] || data?.error ||
        JSON.stringify(data) || 'Xatolik'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteUser(userId: number) {
    if (userId === user?.id) { toast.error('O\'zingizni o\'chira olmaysiz'); return }
    if (!confirm('Haqiqatan ham bu adminni o\'chirmoqchimisiz?')) return
    setDeletingId(userId)
    try {
      await axios.delete(`/api/users/${userId}/`)
      toast.success('Admin o\'chirildi')
      setUsers(prev => prev.filter(u => u.id !== userId))
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Xatolik yuz berdi')
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isSuperAdmin) return null

  const hospitalAdmins = users.filter(u => u.role === 'hospital_admin')
  const superAdmins = users.filter(u => u.role === 'super_admin')

  return (
    <Layout title="Adminlar boshqaruvi" subtitle="Barcha adminlarni ko'rish va boshqarish">
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-4 text-sm text-gray-500">
          <span>Jami: <b className="text-gray-900">{users.length}</b> ta</span>
          <span>Shifoxona adminlari: <b className="text-blue-600">{hospitalAdmins.length}</b> ta</span>
          <span>Super adminlar: <b className="text-purple-600">{superAdmins.length}</b> ta</span>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Yangi admin
        </button>
      </div>

      {users.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <p>Adminlar topilmadi</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Foydalanuvchi', 'Email', 'Telefon', 'Rol', 'Amallar'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u.id} className={`hover:bg-gray-50 ${u.id === user?.id ? 'bg-blue-50' : ''}`}>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                        u.role === 'super_admin' ? 'bg-purple-500' : 'bg-blue-500'
                      }`}>
                        {(u.first_name || u.username).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username}
                          {u.id === user?.id && <span className="ml-1 text-xs text-blue-500">(siz)</span>}
                        </p>
                        <p className="text-xs text-gray-400">@{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500">
                    {u.email || '—'}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500">
                    {u.phone || '—'}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                      u.role === 'super_admin'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {u.role === 'super_admin' ? 'Super Admin' : 'Shifoxona Admin'}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm">
                    {u.id !== user?.id ? (
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        disabled={deletingId === u.id}
                        className="text-red-500 hover:text-red-700 disabled:opacity-50 transition text-sm font-medium"
                      >
                        {deletingId === u.id ? 'O\'chirilmoqda...' : "O'chirish"}
                      </button>
                    ) : (
                      <span className="text-gray-300 text-sm">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Admin Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Yangi admin yaratish</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ism</label>
                  <input type="text" placeholder="Ism"
                    value={newUser.first_name}
                    onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Familiya</label>
                  <input type="text" placeholder="Familiya"
                    value={newUser.last_name}
                    onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Foydalanuvchi nomi *</label>
                <input type="text" placeholder="username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input type="email" placeholder="email@example.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Telefon</label>
                <input type="tel" placeholder="+998 90 123 45 67"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Parol *</label>
                <input type="password" placeholder="Kamida 6 ta belgi"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rol *</label>
                <select value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any, hospital_id: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                  <option value="hospital_admin">Shifoxona Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              {newUser.role === 'hospital_admin' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Shifoxona *</label>
                  <select value={newUser.hospital_id}
                    onChange={(e) => setNewUser({ ...newUser, hospital_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                    <option value="">— Shifoxona tanlang —</option>
                    {hospitals.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                  {hospitals.length === 0 && (
                    <p className="text-xs text-orange-500 mt-1">
                      Hozircha shifoxonalar yo'q. Avval shifoxona yarating.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Bekor qilish
              </button>
              <button onClick={handleCreateUser} disabled={saving}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium">
                {saving ? 'Yaratilmoqda...' : 'Yaratish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
