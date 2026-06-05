import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'

interface Analysis {
  risk_level: string
  risk_score: number
  sentiment: string
  spam_probability: number
  predicted_category: string
  suggestions: string
  key_issues: string
}

interface Feedback {
  id: number
  uuid: string
  department_name: string
  hospital_name: string
  category_display: string
  status: 'pending' | 'analyzed' | 'reviewed' | 'resolved'
  is_spam: boolean
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  created_at: string
  text: string
  analysis?: Analysis
}

const RISK_STYLES: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
}
const RISK_LABELS: Record<string, string> = {
  low: 'Kam xavfli',
  medium: "O'rta",
  high: 'Yuqori',
  critical: 'Kritik',
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

type FilterType = 'all' | 'pending' | 'critical'

export default function FeedbackList() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [selected, setSelected] = useState<Feedback | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => { fetchFeedbacks() }, [])

  async function fetchFeedbacks() {
    try {
      const response = await axios.get('/api/feedback/')
      setFeedbacks(response.data.results || response.data)
    } catch {
      console.error('Feedbacklarni yuklashda xatolik')
    } finally {
      setIsLoading(false)
    }
  }

  async function openDetail(feedback: Feedback) {
    setSelected(feedback)
    setDetailLoading(true)
    try {
      const res = await axios.get(`/api/feedback/${feedback.id}/`)
      setSelected(res.data)
    } catch {
      // keep existing data
    } finally {
      setDetailLoading(false)
    }
  }

  const filtered = feedbacks.filter(f => {
    if (filter === 'critical') return f.risk_level === 'critical'
    if (filter === 'pending') return f.status === 'pending'
    return true
  })

  const counts = {
    all: feedbacks.length,
    pending: feedbacks.filter(f => f.status === 'pending').length,
    critical: feedbacks.filter(f => f.risk_level === 'critical').length,
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
      title="Fikr-mulohazalar"
      subtitle={isSuperAdmin ? 'Barcha murojaatlar' : "O'z shifoxonangiz murojaatlari"}
    >
      {/* Filter buttons */}
      <div className="flex space-x-2 mb-6">
        {([
          { key: 'all', label: 'Barchasi' },
          { key: 'pending', label: 'Kutilayotgan' },
          { key: 'critical', label: 'Kritik' },
        ] as { key: FilterType; label: string }[]).map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-1.5 transition ${
              filter === key
                ? key === 'critical' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}>
            <span>{label}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              filter === key ? 'bg-white bg-opacity-30 text-current' : 'bg-gray-100 text-gray-600'
            }`}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white shadow-sm rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <svg className="mx-auto w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            <p className="text-sm">Fikr-mulohazalar topilmadi</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['#', "Bo'lim / Shifoxona", 'Kategoriya', 'Risk', 'Holat', 'Spam', 'Sana'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((feedback, idx) => (
                <tr
                  key={feedback.id}
                  className="hover:bg-blue-50 cursor-pointer transition"
                  onClick={() => openDetail(feedback)}
                >
                  <td className="px-5 py-4 whitespace-nowrap text-xs text-gray-400 font-mono">
                    {idx + 1}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{feedback.department_name}</div>
                    <div className="text-xs text-gray-400">{feedback.hospital_name}</div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500">
                    {feedback.category_display || '—'}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 inline-flex text-xs font-semibold rounded-full ${RISK_STYLES[feedback.risk_level] || 'bg-gray-100 text-gray-800'}`}>
                      {RISK_LABELS[feedback.risk_level] || feedback.risk_level || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 inline-flex text-xs font-semibold rounded-full ${STATUS_STYLES[feedback.status] || 'bg-gray-100 text-gray-800'}`}>
                      {STATUS_LABELS[feedback.status] || feedback.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm">
                    {feedback.is_spam
                      ? <span className="text-red-500 font-medium">Spam</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(feedback.created_at).toLocaleDateString('uz-UZ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
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
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Status badges */}
            <div className="flex gap-2 mb-4">
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${STATUS_STYLES[selected.status] || 'bg-gray-100 text-gray-800'}`}>
                {STATUS_LABELS[selected.status] || selected.status}
              </span>
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