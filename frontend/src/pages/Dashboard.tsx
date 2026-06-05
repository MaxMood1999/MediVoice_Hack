import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import Layout from '../components/Layout'

interface CategoryItem { label: string; count: number }

interface RecentIssue {
  feedback_id: number
  text: string
  department: string
  hospital: string
  risk_level: 'high' | 'critical'
  key_issues: string
  predicted_category: string
  created_at: string
}

interface FeedbackItem {
  id: number
  text: string
  department_name: string
  hospital_name: string
  risk_level: string
  sentiment: string
  predicted_category: string
  created_at: string
  status: string
  is_spam: boolean
  category_display?: string
  analysis?: {
    risk_level: string
    risk_score: number
    sentiment: string
    spam_probability: number
    predicted_category: string
    suggestions: string
    key_issues: string
  }
}

interface DashboardStats {
  total_hospitals: number
  total_departments: number
  total_feedback_today: number
  critical_feedback_today: number
  low_risk_count: number
  medium_risk_count: number
  high_risk_count: number
  critical_risk_count: number
  top_problematic: Array<{ id: number; name: string; critical_count: number; total_count: number }>
  feedback_trend: Array<{ date: string; count: number }>
  category_breakdown: Record<string, CategoryItem>
  recent_issues: RecentIssue[]
}

const RISK_STYLES: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
}
const RISK_LABELS: Record<string, string> = {
  low: 'Kam xavfli', medium: "O'rta", high: 'Yuqori', critical: 'Kritik',
}
const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  analyzed: 'bg-blue-100 text-blue-800',
  reviewed: 'bg-green-100 text-green-800',
  resolved: 'bg-gray-100 text-gray-800',
}
const STATUS_LABELS: Record<string, string> = {
  pending: 'Kutilmoqda',
  analyzed: 'Tahlil qilindi',
  reviewed: "Ko'rib chiqildi",
  resolved: 'Hal qilindi',
}
const CATEGORY_ICONS: Record<string, string> = {
  cleanliness: '🧹', staff: '👨‍⚕️', queue: '⏱️',
  conditions: '🏥', treatment: '💊', food: '🍽️', other: '📝',
}

export default function Dashboard() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // List modal state
  const [modalTitle, setModalTitle] = useState('')
  const [modalItems, setModalItems] = useState<FeedbackItem[]>([])
  const [modalLoading, setModalLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)

  // Detail modal state (xabar bosilganda)
  const [selected, setSelected] = useState<FeedbackItem | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => { fetchDashboardStats() }, [])

  async function fetchDashboardStats() {
    try {
      const response = await axios.get('/api/dashboard/')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function openModal(title: string, params: Record<string, string>) {
    setModalTitle(title)
    setModalItems([])
    setShowModal(true)
    setModalLoading(true)
    try {
      const query = new URLSearchParams(params).toString()
      const res = await axios.get(`/api/feedback/?${query}&page_size=50`)
      const items = res.data.results || res.data
      setModalItems(items)
    } catch (e) {
      console.error(e)
    } finally {
      setModalLoading(false)
    }
  }

  async function openDetail(item: FeedbackItem) {
    setSelected(item)
    setDetailLoading(true)
    try {
      const res = await axios.get(`/api/feedback/${item.id}/`)
      setSelected(res.data)
    } catch {
      // keep existing data
    } finally {
      setDetailLoading(false)
    }
  }

  function closeDetail() {
    setSelected(null)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const totalRisk = (stats?.low_risk_count || 0) + (stats?.medium_risk_count || 0) +
    (stats?.high_risk_count || 0) + (stats?.critical_risk_count || 0)
  const pct = (n: number) => totalRisk > 0 ? Math.round((n / totalRisk) * 100) : 0

  const categoryEntries = Object.entries(stats?.category_breakdown || {})
  const totalCategories = categoryEntries.reduce((s, [, v]) => s + v.count, 0)

  return (
    <Layout title="MediVoice" subtitle={isSuperAdmin ? 'Super Admin Panel' : 'Shifoxona Admin Panel'}>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: isSuperAdmin ? 'Jami shifoxonalar' : 'Shifoxona', value: stats?.total_hospitals || 0, color: 'blue' },
          { label: 'Bugungi murojaatlar', value: stats?.total_feedback_today || 0, color: 'green' },
          { label: 'Kritik murojaatlar', value: stats?.critical_feedback_today || 0, color: 'red' },
          { label: "Jami bo'limlar", value: stats?.total_departments || 0, color: 'yellow' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm p-6 flex items-center space-x-4">
            <div className={`flex-shrink-0 bg-${color}-100 rounded-lg p-3`}>
              <div className={`h-6 w-6 bg-${color}-600 rounded`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{label}</p>
              <p className={`text-2xl font-bold ${color === 'red' ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* Risk Distribution */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Risk taqsimoti (bugun)</h2>
          <p className="text-xs text-gray-400 mb-5">Bosing — u risk darajasidagi xabarlarni ko'ring</p>
          <div className="space-y-4">
            {[
              { key: 'low', label: 'Kam xavfli', count: stats?.low_risk_count || 0, bar: 'bg-green-500', text: 'text-green-700' },
              { key: 'medium', label: "O'rta xavfli", count: stats?.medium_risk_count || 0, bar: 'bg-yellow-500', text: 'text-yellow-700' },
              { key: 'high', label: 'Yuqori xavfli', count: stats?.high_risk_count || 0, bar: 'bg-orange-500', text: 'text-orange-700' },
              { key: 'critical', label: 'Kritik', count: stats?.critical_risk_count || 0, bar: 'bg-red-500', text: 'text-red-700' },
            ].map(({ key, label, count, bar, text }) => (
              <div
                key={key}
                className="cursor-pointer group"
                onClick={() => count > 0 && openModal(`${label} xabarlar`, { 'analysis__risk_level': key })}
              >
                <div className="flex justify-between mb-1">
                  <span className={`text-sm font-medium ${count > 0 ? 'group-hover:underline' : ''} text-gray-700`}>{label}</span>
                  <span className={`text-sm font-semibold ${text}`}>{count} ({pct(count)}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div className={`${bar} h-3 rounded-full transition-all ${count > 0 ? 'group-hover:opacity-80' : ''}`}
                    style={{ width: `${pct(count)}%` }} />
                </div>
              </div>
            ))}
            {totalRisk === 0 && <p className="text-sm text-gray-400 text-center mt-4">Bugun ma'lumot yo'q</p>}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Muammo kategoriyalari</h2>
          <p className="text-xs text-gray-400 mb-5">Bosing — shu kategoriyali xabarlarni ko'ring</p>
          {categoryEntries.length > 0 ? (
            <div className="space-y-4">
              {categoryEntries
                .sort(([, a], [, b]) => b.count - a.count)
                .map(([key, val]) => {
                  const pctCat = totalCategories > 0 ? Math.round((val.count / totalCategories) * 100) : 0
                  return (
                    <div
                      key={key}
                      className="cursor-pointer group"
                      onClick={() => openModal(`${CATEGORY_ICONS[key] || ''} ${val.label} xabarlar`, { 'analysis__predicted_category': key })}
                    >
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700 group-hover:underline">
                          {CATEGORY_ICONS[key] || '📝'} {val.label}
                        </span>
                        <span className="text-sm font-semibold text-gray-700">{val.count} ({pctCat}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3">
                        <div className="bg-blue-500 h-3 rounded-full transition-all group-hover:opacity-80"
                          style={{ width: `${pctCat}%` }} />
                      </div>
                    </div>
                  )
                })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-10">Kategoriya ma'lumoti yo'q</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Problematic */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">
            {isSuperAdmin ? 'Eng muammoli shifoxonalar' : "Bo'limlar statistikasi"}
          </h2>
          {stats?.top_problematic && stats.top_problematic.length > 0 ? (
            <div className="space-y-3">
              {stats.top_problematic.map((hospital, index) => (
                <div key={hospital.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center space-x-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-red-500 text-white' : index === 1 ? 'bg-orange-400 text-white' : 'bg-gray-200 text-gray-700'
                    }`}>{index + 1}</span>
                    <Link to={`/hospitals/${hospital.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 transition">
                      {hospital.name}
                    </Link>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-red-600">{hospital.critical_count}</span>
                    <span className="text-xs text-gray-400"> / {hospital.total_count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-10">Muammoli shifoxonalar yo'q</p>
          )}
        </div>

        {/* Feedback Trend */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">So'nggi 7 kun tendensiyasi</h2>
          {stats?.feedback_trend && stats.feedback_trend.length > 0 ? (
            <div className="flex items-end space-x-2 h-40">
              {stats.feedback_trend.map((day) => {
                const maxCount = Math.max(...stats.feedback_trend.map(d => d.count), 1)
                const heightPct = Math.max(4, (day.count / maxCount) * 100)
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center group">
                    <span className="text-xs text-gray-500 mb-1 opacity-0 group-hover:opacity-100 transition">{day.count}</span>
                    <div className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition" style={{ height: `${heightPct}%` }} />
                    <span className="text-xs text-gray-500 mt-2 whitespace-nowrap">{format(new Date(day.date), 'MMM d')}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-12">Ma'lumot yo'q</p>
          )}
        </div>
      </div>

      {/* Recent Critical Issues */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">🚨 So'nggi muammoli murojaatlar</h2>
        {stats?.recent_issues && stats.recent_issues.length > 0 ? (
          <div className="space-y-3">
            {stats.recent_issues.map((issue) => {
              let keyIssues: string[] = []
              try { keyIssues = JSON.parse(issue.key_issues) } catch { keyIssues = issue.key_issues ? [issue.key_issues] : [] }
              return (
                <div
                  key={issue.feedback_id}
                  className="border border-gray-100 rounded-lg p-4 hover:border-red-200 hover:bg-red-50 transition cursor-pointer"
                  onClick={() => openDetail({ id: issue.feedback_id, text: issue.text, department_name: issue.department, hospital_name: issue.hospital, risk_level: issue.risk_level, sentiment: '', predicted_category: issue.predicted_category, created_at: issue.created_at, status: '', is_spam: false })}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-sm font-medium text-gray-900">{issue.department}</span>
                      <span className="text-xs text-gray-400 ml-2">— {issue.hospital}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${RISK_STYLES[issue.risk_level] || 'bg-gray-100 text-gray-800'}`}>
                        {RISK_LABELS[issue.risk_level] || issue.risk_level}
                      </span>
                      {issue.predicted_category && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700">{issue.predicted_category}</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{issue.text}</p>
                  {keyIssues.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {keyIssues.map((ki, i) => (
                        <span key={i} className="px-2 py-0.5 text-xs bg-red-50 text-red-600 rounded-full">⚠️ {ki}</span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-2">{new Date(issue.created_at).toLocaleString('uz-UZ')}</p>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">Muammoli murojaatlar yo'q</p>
        )}
      </div>

      {/* ===== LIST MODAL (Risk / Kategoriya bosish) ===== */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full shadow-xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="font-semibold text-gray-900 text-lg">{modalTitle}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 p-6">
              {modalLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : modalItems.length === 0 ? (
                <p className="text-center text-gray-400 py-12">Xabarlar topilmadi</p>
              ) : (
                <div className="space-y-3">
                  {modalItems.map((item: FeedbackItem) => (
                    <div
                      key={item.id}
                      className="border border-gray-100 rounded-lg p-4 hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition"
                      onClick={() => openDetail(item)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-sm font-medium text-gray-900">{item.department_name}</span>
                          <span className="text-xs text-gray-400 ml-2">— {item.hospital_name}</span>
                        </div>
                        <div className="flex gap-2 items-center">
                          {item.risk_level && (
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${RISK_STYLES[item.risk_level] || 'bg-gray-100 text-gray-800'}`}>
                              {RISK_LABELS[item.risk_level] || item.risk_level}
                            </span>
                          )}
                          <span className="text-xs text-blue-500">Batafsil →</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">{item.text}</p>
                      <p className="text-xs text-gray-400 mt-2">{new Date(item.created_at).toLocaleString('uz-UZ')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== DETAIL MODAL (Xabar bosilganda) ===== */}
      {selected && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
          onClick={closeDetail}
        >
          <div
            className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">{selected.department_name}</h3>
                <p className="text-sm text-gray-400">{selected.hospital_name}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(selected.created_at).toLocaleString('uz-UZ')}
                </p>
              </div>
              <button
                onClick={closeDetail}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Status badges */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {selected.status && (
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${STATUS_STYLES[selected.status] || 'bg-gray-100 text-gray-800'}`}>
                  {STATUS_LABELS[selected.status] || selected.status}
                </span>
              )}
              {selected.risk_level && (
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${RISK_STYLES[selected.risk_level] || 'bg-gray-100 text-gray-800'}`}>
                  {RISK_LABELS[selected.risk_level] || selected.risk_level}
                </span>
              )}
              {selected.is_spam && (
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                  Spam
                </span>
              )}
            </div>

            {/* Feedback text */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-xs text-gray-400 mb-1 font-medium">Xabar matni</p>
              <p className="text-sm text-gray-700">{selected.text || '—'}</p>
            </div>

            {/* Loading */}
            {detailLoading && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-400">AI tahlil yuklanmoqda...</span>
              </div>
            )}

            {/* AI Analysis */}
            {!detailLoading && selected.analysis && (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  🤖 AI Tahlil natijasi
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-xs text-blue-400 mb-1">Risk darajasi</div>
                    <div className="text-sm font-semibold text-blue-700">
                      {RISK_LABELS[selected.analysis.risk_level] || selected.analysis.risk_level}
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="text-xs text-purple-400 mb-1">Risk skori</div>
                    <div className="text-sm font-semibold text-purple-700">
                      {selected.analysis.risk_score?.toFixed(1)} / 100
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-xs text-green-400 mb-1">Kayfiyat</div>
                    <div className="text-sm font-semibold text-green-700">
                      {selected.analysis.sentiment === 'positive' ? '😊 Ijobiy'
                        : selected.analysis.sentiment === 'negative' ? '😞 Salbiy'
                        : '😐 Neytral'}
                    </div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <div className="text-xs text-orange-400 mb-1">Spam ehtimoli</div>
                    <div className="text-sm font-semibold text-orange-700">
                      {((selected.analysis.spam_probability || 0) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                {selected.analysis.predicted_category && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1 font-medium">Kategoriya</div>
                    <p className="text-sm text-gray-700">{selected.analysis.predicted_category}</p>
                  </div>
                )}

                {selected.analysis.key_issues && (
                  <div className="bg-red-50 rounded-lg p-3">
                    <div className="text-xs text-red-400 mb-1 font-medium">Asosiy muammolar</div>
                    <p className="text-sm text-gray-700">{selected.analysis.key_issues}</p>
                  </div>
                )}

                {selected.analysis.suggestions && (
                  <div className="bg-yellow-50 rounded-lg p-3">
                    <div className="text-xs text-yellow-600 mb-1 font-medium">💡 Tavsiyalar</div>
                    <p className="text-sm text-gray-700">{selected.analysis.suggestions}</p>
                  </div>
                )}
              </div>
            )}

            {!detailLoading && !selected.analysis && (
              <div className="text-center py-4 text-gray-400">
                <p className="text-sm">AI tahlil hali amalga oshirilmagan</p>
              </div>
            )}
          </div>
        </div>
      )}

    </Layout>
  )
}