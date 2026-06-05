import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'

export default function Settings() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  })
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
      })
    }
  }, [user])

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    try {
      await axios.put(`/api/users/${user?.id}/`, formData)
      toast.success('Profil muvaffaqiyatli yangilandi!')
    } catch (error: any) {
      toast.error(error.response?.data?.email?.[0] || 'Xatolik yuz berdi')
    } finally {
      setIsSaving(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Yangi parollar mos kelmaydi')
      return
    }
    if (passwordData.new_password.length < 6) {
      toast.error('Parol kamida 6 ta belgidan iborat bo\'lishi kerak')
      return
    }
    setIsSaving(true)
    try {
      await axios.post('/api/auth/change-password/', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      })
      toast.success('Parol muvaffaqiyatli o\'zgartirildi!')
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Joriy parol noto\'g\'ri')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Layout title="Sozlamalar" subtitle="Profil sozlamalari">
      <div className="max-w-2xl space-y-6">

        {/* Role info */}
        <div className={`rounded-xl p-4 flex items-center space-x-3 ${
          isSuperAdmin ? 'bg-purple-50 border border-purple-200' : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isSuperAdmin ? 'bg-purple-200' : 'bg-blue-200'
          }`}>
            <svg className={`w-5 h-5 ${isSuperAdmin ? 'text-purple-700' : 'text-blue-700'}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p className={`font-medium text-sm ${isSuperAdmin ? 'text-purple-900' : 'text-blue-900'}`}>
              {isSuperAdmin ? 'Super Admin' : 'Shifoxona Admin'}
            </p>
            <p className={`text-xs ${isSuperAdmin ? 'text-purple-600' : 'text-blue-600'}`}>
              {isSuperAdmin
                ? 'Barcha shifoxonalar va adminlarni boshqarasiz'
                : "Faqat o'z shifoxonangizni boshqarasiz"}
            </p>
          </div>
        </div>

        {/* Profile */}
        <div className="bg-white shadow-sm rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Profil ma'lumotlari</h2>
          <form onSubmit={handleProfileSave} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ism</label>
                <input type="text" value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ismingiz"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Familiya</label>
                <input type="text" value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Familiyangiz"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input type="email" value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefon</label>
              <input type="tel" value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="+998 90 123 45 67"
              />
            </div>
            <button type="submit" disabled={isSaving}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium">
              {isSaving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </form>
        </div>

        {/* Password Change */}
        <div className="bg-white shadow-sm rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Parolni o'zgartirish</h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Joriy parol</label>
              <input type="password" value={passwordData.current_password}
                onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Yangi parol</label>
              <input type="password" value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Yangi parolni tasdiqlang</label>
              <input type="password" value={passwordData.confirm_password}
                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="••••••••"
              />
              {passwordData.new_password && passwordData.confirm_password &&
               passwordData.new_password !== passwordData.confirm_password && (
                <p className="text-xs text-red-500 mt-1">Parollar mos kelmaydi</p>
              )}
            </div>
            <button type="submit" disabled={isSaving}
              className="bg-gray-800 text-white px-6 py-2.5 rounded-lg hover:bg-gray-900 transition disabled:opacity-50 font-medium">
              {isSaving ? 'O\'zgartirilmoqda...' : 'Parolni o\'zgartirish'}
            </button>
          </form>
        </div>

        {/* Account info */}
        <div className="bg-white shadow-sm rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Hisob ma'lumotlari</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Foydalanuvchi nomi:</span>
              <span className="font-medium text-gray-900">@{user?.username}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Rol:</span>
              <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${
                isSuperAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {isSuperAdmin ? 'Super Admin' : 'Shifoxona Admin'}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Holat:</span>
              <span className="font-medium text-green-600 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
                Faol
              </span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
