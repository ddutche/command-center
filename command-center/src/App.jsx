import { useState, useEffect, useCallback } from 'react'
import { useDatabase } from './lib/useDatabase'

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

const EMOJI_BURSTS = ['🎉', '🔥', '⚡', '💪', '🚀', '✨', '🏆', '💥']
const STREAK_EMOJIS = ['😴', '🌱', '🔥', '🔥🔥', '🔥🔥🔥', '☄️', '💎', '🏆', '👑', '🐐']

function getStreakEmoji(streak) {
  if (streak <= 0) return STREAK_EMOJIS[0]
  if (streak >= 9) return STREAK_EMOJIS[9]
  return STREAK_EMOJIS[streak]
}

function getESTDate() {
  return new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' })
}

function FloatingEmoji({ emoji, x, y }) {
  return (
    <div style={{ position: 'fixed', left: x, top: y, fontSize: 28, pointerEvents: 'none', zIndex: 9999, animation: 'emojiFloat 1s ease-out forwards' }}>
      {emoji}
    </div>
  )
}

function ConfettiCannon({ active }) {
  if (!active) return null
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: 50 + (Math.random() - 0.5) * 20,
    color: ['#FF6B6B', '#FECA57', '#48DBFB', '#FF9FF3', '#54A0FF', '#5F27CD', '#01a3a4', '#f368e0'][i % 8],
    delay: Math.random() * 0.3,
    size: 4 + Math.random() * 6,
  }))
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute', left: `${p.x}%`, bottom: 0, width: p.size, height: p.size,
            background: p.color, borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animation: `confettiShoot 1.5s ease-out ${p.delay}s forwards`,
            '--tx': `${(Math.random() - 0.5) * 300}px`, '--ty': `${-400 - Math.random() * 400}px`, '--rot': `${Math.random() * 720}deg`,
          }}
        />
      ))}
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#1a1035', color: '#a78bfa', fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ fontSize: 48, marginBottom: 16, animation: 'pulse 1.5s ease infinite' }}>⚡</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>Loading Command Center...</div>
      <style>{`@keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.1); } }`}</style>
    </div>
  )
}

export default function App() {
  const { data, loading, updateData, usingSupabase } = useDatabase()

  const [tab, setTab] = useState('tasks')
  const [newDaily, setNewDaily] = useState('')
  const [newSomeday, setNewSomeday] = useState('')
  const [newExpName, setNewExpName] = useState('')
  const [newExpAmount, setNewExpAmount] = useState('')
  const [newExpCategory, setNewExpCategory] = useState('Other')
  const [editingExpense, setEditingExpense] = useState(null)
  const [editName, setEditName] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editingTask, setEditingTask] = useState(null)
  const [editTaskText, setEditTaskText] = useState('')
  const [floatingEmojis, setFloatingEmojis] = useState([])
  const [confettiActive, setConfettiActive] = useState(false)
  const [editingGoal, setEditingGoal] = useState(false)
  const [tempGoalTarget, setTempGoalTarget] = useState('')
  const [tempGoalPrize, setTempGoalPrize] = useState('')
  const [tempCompleted, setTempCompleted] = useState('')
  const [newIncomeName, setNewIncomeName] = useState('')
  const [newIncomeAmount, setNewIncomeAmount] = useState('')
  const [newIncomeType, setNewIncomeType] = useState('Other')
  const [editingIncome, setEditingIncome] = useState(null)
  const [editIncomeName, setEditIncomeName] = useState('')
  const [editIncomeAmount, setEditIncomeAmount] = useState('')
  const [editIncomeType, setEditIncomeType] = useState('')

  const categories = ['Housing', 'Utilities', 'Subscriptions', 'Food', 'Transport', 'Health', 'Insurance', 'Debt', 'Other']
  const incomeTypes = ['Salary', 'Freelance', 'Side Business', 'Investments', 'Other']

  // Convenience getters from data
  const dailyTasks = data?.daily_tasks || []
  const somedayTasks = data?.someday_tasks || []
  const expenses = data?.expenses || []
  const incomeStreams = data?.income_streams || []
  const streak = data?.streak || 0
  const bestStreak = data?.best_streak || 0
  const streakBumpedToday = data?.streak_bumped_today || false
  const totalCompleted = data?.total_completed || 0
  const goalTarget = data?.goal_target || 100
  const goalPrize = data?.goal_prize || ''
  const lastResetDate = data?.last_reset_date || getESTDate()

  const completedDaily = dailyTasks.filter((t) => t.done).length
  const completedSomeday = somedayTasks.filter((t) => t.done).length
  const dailyProgress = dailyTasks.length > 0 ? (completedDaily / dailyTasks.length) * 100 : 0
  const goalProgress = Math.min((totalCompleted / goalTarget) * 100, 100)
  const allDailyDone = dailyTasks.length > 0 && completedDaily === dailyTasks.length
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const totalIncome = incomeStreams.reduce((sum, i) => sum + i.amount, 0)
  const netMonthly = totalIncome - totalExpenses
  const groupedExpenses = categories.reduce((acc, cat) => {
    const items = expenses.filter((e) => e.category === cat)
    if (items.length > 0) acc[cat] = items
    return acc
  }, {})

  // Updater helpers
  const setField = useCallback((field, value) => {
    updateData((prev) => ({ ...prev, [field]: typeof value === 'function' ? value(prev[field]) : value }))
  }, [updateData])

  // Auto-streak: when all daily done
  useEffect(() => {
    if (!data || !allDailyDone || streakBumpedToday) return
    updateData((prev) => {
      const newStreak = (prev.streak || 0) + 1
      return {
        ...prev,
        streak: newStreak,
        best_streak: Math.max(prev.best_streak || 0, newStreak),
        streak_bumped_today: true,
      }
    })
  }, [allDailyDone, streakBumpedToday, data])

  // Midnight EST reset
  useEffect(() => {
    if (!data) return
    const checkMidnight = () => {
      const currentDate = getESTDate()
      if (currentDate !== (data.last_reset_date || '')) {
        updateData((prev) => ({
          ...prev,
          daily_tasks: (prev.daily_tasks || []).map((t) => ({ ...t, done: false })),
          streak: prev.streak_bumped_today ? prev.streak : 0,
          streak_bumped_today: false,
          last_reset_date: currentDate,
        }))
      }
    }
    checkMidnight() // check immediately on load
    const interval = setInterval(checkMidnight, 30000)
    return () => clearInterval(interval)
  }, [data?.last_reset_date])

  // Emoji spawn
  const spawnEmoji = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const emoji = EMOJI_BURSTS[Math.floor(Math.random() * EMOJI_BURSTS.length)]
    const id = generateId()
    setFloatingEmojis((prev) => [...prev, { id, emoji, x: rect.left + rect.width / 2, y: rect.top }])
    setTimeout(() => setFloatingEmojis((prev) => prev.filter((fe) => fe.id !== id)), 1200)
  }

  // Task toggle
  const toggleTask = (listKey, id, e) => {
    updateData((prev) => {
      const list = prev[listKey] || []
      const task = list.find((t) => t.id === id)
      if (!task) return prev
      const wasDone = task.done
      const newList = list.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
      const newCompleted = wasDone
        ? Math.max(0, (prev.total_completed || 0) - 1)
        : (prev.total_completed || 0) + 1

      if (!wasDone && newCompleted === prev.goal_target) {
        setConfettiActive(true)
        setTimeout(() => setConfettiActive(false), 2000)
      }
      if (!wasDone) spawnEmoji(e)

      return { ...prev, [listKey]: newList, total_completed: newCompleted }
    })
  }

  const addDaily = () => {
    if (!newDaily.trim()) return
    setField('daily_tasks', (prev) => [...(prev || []), { id: generateId(), text: newDaily.trim(), done: false }])
    setNewDaily('')
  }

  const addSomeday = () => {
    if (!newSomeday.trim()) return
    setField('someday_tasks', (prev) => [...(prev || []), { id: generateId(), text: newSomeday.trim(), done: false }])
    setNewSomeday('')
  }

  const removeTask = (listKey, id) => setField(listKey, (prev) => (prev || []).filter((t) => t.id !== id))

  const startEditTask = (task, listType) => {
    setEditingTask({ id: task.id, listType })
    setEditTaskText(task.text)
  }

  const saveEditTask = () => {
    if (!editTaskText.trim() || !editingTask) return
    const key = editingTask.listType === 'daily' ? 'daily_tasks' : 'someday_tasks'
    setField(key, (prev) => (prev || []).map((t) => (t.id === editingTask.id ? { ...t, text: editTaskText.trim() } : t)))
    setEditingTask(null)
    setEditTaskText('')
  }

  const addExpense = () => {
    if (!newExpName.trim() || !newExpAmount) return
    setField('expenses', (prev) => [...(prev || []), { id: generateId(), name: newExpName.trim(), amount: parseFloat(newExpAmount), category: newExpCategory }])
    setNewExpName(''); setNewExpAmount(''); setNewExpCategory('Other')
  }

  const removeExpense = (id) => setField('expenses', (prev) => (prev || []).filter((e) => e.id !== id))

  const startEditExpense = (exp) => { setEditingExpense(exp.id); setEditName(exp.name); setEditAmount(exp.amount.toString()); setEditCategory(exp.category) }

  const saveEditExpense = () => {
    if (!editName.trim() || !editAmount) return
    setField('expenses', (prev) => (prev || []).map((e) => (e.id === editingExpense ? { ...e, name: editName.trim(), amount: parseFloat(editAmount), category: editCategory } : e)))
    setEditingExpense(null)
  }

  const addIncome = () => {
    if (!newIncomeName.trim() || !newIncomeAmount) return
    setField('income_streams', (prev) => [...(prev || []), { id: generateId(), name: newIncomeName.trim(), amount: parseFloat(newIncomeAmount), type: newIncomeType }])
    setNewIncomeName(''); setNewIncomeAmount(''); setNewIncomeType('Other')
  }

  const removeIncome = (id) => setField('income_streams', (prev) => (prev || []).filter((i) => i.id !== id))

  const startEditIncome = (inc) => { setEditingIncome(inc.id); setEditIncomeName(inc.name); setEditIncomeAmount(inc.amount.toString()); setEditIncomeType(inc.type) }

  const saveEditIncome = () => {
    if (!editIncomeName.trim() || !editIncomeAmount) return
    setField('income_streams', (prev) => (prev || []).map((i) => (i.id === editingIncome ? { ...i, name: editIncomeName.trim(), amount: parseFloat(editIncomeAmount), type: editIncomeType } : i)))
    setEditingIncome(null)
  }

  const saveGoal = () => {
    updateData((prev) => {
      const t = parseInt(tempGoalTarget); const c = parseInt(tempCompleted)
      return {
        ...prev,
        goal_target: t > 0 ? t : prev.goal_target,
        goal_prize: tempGoalPrize.trim() || prev.goal_prize,
        total_completed: !isNaN(c) && c >= 0 ? c : prev.total_completed,
      }
    })
    setEditingGoal(false)
  }

  if (loading || !data) return <LoadingScreen />

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Lilita+One&display=swap');

        @keyframes emojiFloat { 0% { opacity:1; transform:translateY(0) scale(1); } 100% { opacity:0; transform:translateY(-80px) scale(1.5); } }
        @keyframes confettiShoot { 0% { opacity:1; transform:translate(0,0) rotate(0deg); } 100% { opacity:0; transform:translate(var(--tx),var(--ty)) rotate(var(--rot)); } }
        @keyframes slideIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes checkPop { 0% { transform:scale(1); } 50% { transform:scale(1.3); } 100% { transform:scale(1); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes progressGrow { from { width:0%; } }
        @keyframes pulseGlow { 0%,100% { box-shadow:0 0 8px rgba(254,202,87,0.3); } 50% { box-shadow:0 0 24px rgba(254,202,87,0.6); } }
        @keyframes shimmer { 0% { background-position:-200% 0; } 100% { background-position:200% 0; } }
        @keyframes bounceIn { 0% { transform:scale(0.3); opacity:0; } 50% { transform:scale(1.05); } 70% { transform:scale(0.9); } 100% { transform:scale(1); opacity:1; } }

        * { margin:0; padding:0; box-sizing:border-box; }

        body {
          font-family:'Nunito',sans-serif; background:#1a1035; color:#f0e6ff; min-height:100vh;
          background-image: radial-gradient(ellipse at 20% 50%,rgba(120,40,200,0.15) 0%,transparent 50%), radial-gradient(ellipse at 80% 20%,rgba(255,107,107,0.1) 0%,transparent 50%), radial-gradient(ellipse at 50% 80%,rgba(72,219,251,0.1) 0%,transparent 50%);
        }

        .app-container { max-width:720px; margin:0 auto; padding:24px 16px 80px; min-height:100vh; }
        .app-header { text-align:center; margin-bottom:28px; animation:fadeIn 0.5s ease; }
        .app-title { font-family:'Lilita One',cursive; font-size:34px; background:linear-gradient(135deg,#FF6B6B,#FECA57,#48DBFB,#FF9FF3); background-size:200% 200%; animation:shimmer 4s ease infinite; -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
        .app-subtitle { font-size:14px; color:#a78bfa; margin-top:4px; font-weight:600; }
        .sync-badge { display:inline-block; font-size:10px; padding:3px 8px; border-radius:10px; font-weight:700; margin-top:6px; letter-spacing:0.5px; }

        .streak-card { background:linear-gradient(135deg,#2d1b69,#1e1145); border:2px solid #6c3ce0; border-radius:20px; padding:20px; margin-bottom:16px; display:flex; align-items:center; gap:16px; animation:slideIn 0.35s ease; position:relative; overflow:hidden; }
        .streak-card::before { content:''; position:absolute; top:-50%; left:-50%; width:200%; height:200%; background:radial-gradient(circle at 30% 30%,rgba(255,107,107,0.08) 0%,transparent 50%); pointer-events:none; }
        .streak-emoji { font-size:42px; animation:bounceIn 0.5s ease; line-height:1; }
        .streak-info { flex:1; }
        .streak-label { font-size:11px; text-transform:uppercase; letter-spacing:2px; color:#a78bfa; font-weight:700; }
        .streak-number { font-family:'Lilita One',cursive; font-size:36px; color:#FECA57; line-height:1.1; }
        .streak-number span { font-family:'Nunito',sans-serif; font-size:16px; color:#a78bfa; font-weight:600; }
        .streak-best { font-size:12px; color:#7c5cbf; font-weight:600; }
        .streak-best b { color:#FF9FF3; }

        .goal-card { background:linear-gradient(135deg,#1b2a4a,#162040); border:2px solid #2563eb; border-radius:20px; padding:20px; margin-bottom:24px; animation:slideIn 0.4s ease; position:relative; overflow:hidden; }
        .goal-card.completed { border-color:#FECA57; animation:pulseGlow 2s ease infinite, slideIn 0.4s ease; }
        .goal-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
        .goal-title { font-size:12px; text-transform:uppercase; letter-spacing:2px; color:#60a5fa; font-weight:700; }
        .goal-edit-btn { background:rgba(96,165,250,0.15); border:1px solid rgba(96,165,250,0.3); border-radius:8px; color:#60a5fa; font-family:'Nunito',sans-serif; font-size:11px; font-weight:700; padding:4px 10px; cursor:pointer; transition:all 0.2s; }
        .goal-edit-btn:hover { background:rgba(96,165,250,0.25); }
        .goal-counts { display:flex; align-items:baseline; gap:4px; margin-bottom:10px; }
        .goal-current { font-family:'Lilita One',cursive; font-size:32px; color:#48DBFB; }
        .goal-divider { font-size:18px; color:#3b5998; font-weight:700; }
        .goal-target-num { font-size:18px; color:#3b5998; font-weight:700; }
        .goal-bar-bg { width:100%; height:16px; background:#0f1a30; border-radius:12px; overflow:hidden; margin-bottom:10px; }
        .goal-bar-fill { height:100%; border-radius:12px; background:linear-gradient(90deg,#48DBFB,#54A0FF,#5F27CD,#FF9FF3); background-size:200% 100%; animation:shimmer 3s ease infinite, progressGrow 1s ease; transition:width 0.5s ease; }
        .goal-prize { display:flex; align-items:center; gap:8px; font-size:13px; color:#a78bfa; font-weight:600; flex-wrap:wrap; }
        .goal-prize-label { color:#60a5fa; font-size:11px; text-transform:uppercase; letter-spacing:1px; }
        .goal-edit-form { display:flex; flex-direction:column; gap:10px; margin-top:8px; }
        .goal-edit-row { display:flex; gap:8px; align-items:center; }
        .goal-edit-row label { font-size:12px; color:#60a5fa; font-weight:700; min-width:60px; }

        .tab-bar { display:flex; gap:4px; background:#241654; border-radius:16px; padding:5px; margin-bottom:24px; border:2px solid #3b2080; }
        .tab-btn { flex:1; padding:12px 0; border:none; border-radius:12px; font-family:'Nunito',sans-serif; font-size:15px; font-weight:800; cursor:pointer; transition:all 0.25s ease; background:transparent; color:#7c5cbf; }
        .tab-btn.active { background:linear-gradient(135deg,#6c3ce0,#5F27CD); color:#fff; box-shadow:0 4px 15px rgba(108,60,224,0.4); }
        .tab-btn:hover:not(.active) { color:#a78bfa; }

        .section { margin-bottom:28px; animation:slideIn 0.35s ease; }
        .section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
        .section-title { font-family:'Lilita One',cursive; font-size:20px; color:#f0e6ff; }
        .section-count { font-size:12px; font-weight:700; color:#a78bfa; background:#2d1b69; padding:5px 12px; border-radius:20px; border:1px solid #3b2080; }

        .progress-bar-container { width:100%; height:8px; background:#241654; border-radius:8px; margin-bottom:16px; overflow:hidden; border:1px solid #3b2080; }
        .progress-bar-fill { height:100%; background:linear-gradient(90deg,#FF6B6B,#FECA57,#48DBFB); border-radius:8px; transition:width 0.5s ease; animation:progressGrow 0.8s ease; }

        .all-done-banner { background:linear-gradient(135deg,#2d1b69,#1b4a2d); border:2px solid #4ade80; border-radius:16px; padding:16px; text-align:center; margin-bottom:16px; animation:bounceIn 0.5s ease; }
        .all-done-banner .emoji { font-size:28px; }
        .all-done-banner .text { font-weight:800; font-size:16px; color:#4ade80; margin-top:4px; }
        .all-done-banner .sub { font-size:12px; color:#7c5cbf; margin-top:2px; }

        .task-item { display:flex; align-items:center; gap:12px; padding:13px 14px; background:#241654; border-radius:14px; margin-bottom:6px; border:2px solid #3b2080; transition:all 0.25s ease; cursor:default; }
        .task-item:hover { border-color:#6c3ce0; transform:translateX(2px); }
        .task-item.done { background:linear-gradient(135deg,rgba(74,222,128,0.1),rgba(254,202,87,0.05)); border-color:rgba(74,222,128,0.35); }

        .checkbox { width:24px; height:24px; border-radius:8px; border:2.5px solid #6c3ce0; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s ease; flex-shrink:0; }
        .checkbox:hover { border-color:#FF9FF3; transform:scale(1.1); }
        .checkbox.checked { background:linear-gradient(135deg,#4ade80,#48DBFB); border-color:transparent; animation:checkPop 0.3s ease; }

        .task-text { flex:1; font-size:14px; color:#e0d4f5; transition:all 0.25s ease; line-height:1.4; font-weight:600; }
        .task-text.done { text-decoration:line-through; color:#5a4480; }

        .task-actions { display:flex; gap:4px; opacity:0; transition:opacity 0.2s ease; }
        .task-item:hover .task-actions { opacity:1; }

        .action-btn { width:28px; height:28px; border:none; border-radius:8px; background:transparent; color:#6c3ce0; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.15s ease; font-size:14px; }
        .action-btn:hover { background:#2d1b69; color:#a78bfa; }
        .action-btn.delete:hover { background:rgba(255,107,107,0.15); color:#FF6B6B; }

        .add-row { display:flex; gap:8px; margin-top:10px; }
        .add-input { flex:1; padding:11px 14px; background:#1a1035; border:2px solid #3b2080; border-radius:12px; color:#f0e6ff; font-family:'Nunito',sans-serif; font-size:13px; font-weight:600; outline:none; transition:border-color 0.2s ease; }
        .add-input:focus { border-color:#6c3ce0; }
        .add-input::placeholder { color:#4a3580; }

        .add-btn { padding:11px 20px; background:linear-gradient(135deg,#FF6B6B,#FF9FF3); border:none; border-radius:12px; color:#1a1035; font-family:'Nunito',sans-serif; font-size:13px; font-weight:800; cursor:pointer; transition:all 0.2s ease; white-space:nowrap; }
        .add-btn:hover { transform:translateY(-2px); box-shadow:0 4px 15px rgba(255,107,107,0.3); }
        .add-btn:active { transform:translateY(0); }

        .budget-overview { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px; animation:slideIn 0.35s ease; }
        .budget-ov-card { background:linear-gradient(135deg,#241654,#2d1b69); border-radius:18px; padding:20px 16px; border:2px solid #3b2080; text-align:center; }
        .income-card { border-color:rgba(74,222,128,0.35); }
        .expense-ov-card { border-color:rgba(255,107,107,0.35); }
        .budget-ov-label { font-size:11px; text-transform:uppercase; letter-spacing:1.5px; color:#7c5cbf; font-weight:700; margin-bottom:6px; }
        .budget-ov-amount { font-family:'Lilita One',cursive; font-size:26px; }
        .income-amount { color:#4ade80; }
        .expense-ov-amount { color:#FF6B6B; }

        .net-summary { background:linear-gradient(135deg,#1e1145,#241654); border:2px solid; border-radius:18px; padding:18px; margin-bottom:24px; text-align:center; animation:slideIn 0.4s ease; }
        .net-label { font-size:12px; text-transform:uppercase; letter-spacing:1.5px; color:#a78bfa; font-weight:700; margin-bottom:4px; }
        .net-amount { font-family:'Lilita One',cursive; font-size:34px; line-height:1.1; }
        .net-sub { font-size:12px; color:#5a4480; font-weight:600; margin-top:4px; }

        .budget-summary { background:linear-gradient(135deg,#241654,#2d1b69); border-radius:20px; padding:24px; border:2px solid #3b2080; margin-bottom:24px; text-align:center; }
        .budget-per { font-size:13px; color:#5a4480; margin-top:4px; font-weight:600; }

        .category-group { margin-bottom:20px; }
        .category-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; padding:0 2px; }
        .category-name { font-size:12px; font-weight:800; color:#a78bfa; text-transform:uppercase; letter-spacing:1px; }
        .category-subtotal { font-size:12px; color:#5a4480; font-weight:700; }

        .expense-item { display:flex; align-items:center; justify-content:space-between; padding:11px 14px; background:#241654; border-radius:12px; margin-bottom:4px; border:2px solid #3b2080; transition:all 0.2s ease; }
        .expense-item:hover { border-color:#6c3ce0; }
        .expense-name { font-size:14px; color:#e0d4f5; font-weight:600; }
        .expense-right { display:flex; align-items:center; gap:10px; }
        .expense-amount { font-size:14px; font-weight:800; color:#FECA57; font-variant-numeric:tabular-nums; }
        .expense-actions { display:flex; gap:2px; opacity:0; transition:opacity 0.2s ease; }
        .expense-item:hover .expense-actions { opacity:1; }

        .add-expense-form { display:grid; grid-template-columns:1fr 100px 120px auto; gap:8px; margin-top:16px; align-items:center; }
        .add-select { padding:11px 12px; background:#1a1035; border:2px solid #3b2080; border-radius:12px; color:#f0e6ff; font-family:'Nunito',sans-serif; font-size:13px; font-weight:600; outline:none; appearance:none; cursor:pointer; }
        .add-select:focus { border-color:#6c3ce0; }

        .edit-inline { display:flex; gap:6px; align-items:center; flex:1; }
        .edit-inline input, .edit-inline select { padding:6px 10px; background:#1a1035; border:2px solid #6c3ce0; border-radius:8px; color:#f0e6ff; font-family:'Nunito',sans-serif; font-size:13px; font-weight:600; outline:none; }
        .edit-inline input:first-child { flex:1; }

        .save-btn { padding:6px 14px; background:linear-gradient(135deg,#4ade80,#48DBFB); border:none; border-radius:8px; color:#1a1035; font-family:'Nunito',sans-serif; font-size:12px; font-weight:800; cursor:pointer; }
        .cancel-btn { padding:6px 12px; background:#3b2080; border:none; border-radius:8px; color:#a78bfa; font-family:'Nunito',sans-serif; font-size:12px; font-weight:700; cursor:pointer; }
        .empty-state { text-align:center; padding:24px; color:#4a3580; font-size:14px; font-weight:600; }

        .bar-chart { display:flex; align-items:flex-end; gap:6px; height:80px; margin-top:16px; padding:0 2px; }
        .bar-col { flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; }
        .bar-fill { width:100%; border-radius:4px 4px 0 0; background:linear-gradient(180deg,#FF6B6B,#FF9FF3); transition:height 0.4s ease; min-height:2px; }
        .bar-label { font-size:9px; color:#5a4480; text-transform:uppercase; letter-spacing:0.5px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; }

        .streak-btn-reset { background:#3b2080; border:none; border-radius:10px; padding:8px 12px; cursor:pointer; font-family:'Nunito',sans-serif; font-weight:700; font-size:12px; color:#7c5cbf; transition:all 0.2s; }
        .streak-btn-reset:hover { background:#4a2d99; }

        @media (max-width:600px) {
          .add-expense-form { grid-template-columns:1fr 1fr; }
          .app-container { padding:16px 12px 80px; }
          .streak-card { flex-wrap:wrap; }
          .budget-overview { grid-template-columns:1fr; }
        }
      `}</style>

      <ConfettiCannon active={confettiActive} />
      {floatingEmojis.map((fe) => <FloatingEmoji key={fe.id} emoji={fe.emoji} x={fe.x} y={fe.y} />)}

      <div className="app-container">
        <div className="app-header">
          <div className="app-title">Command Center</div>
          <div className="app-subtitle">crush it every single day</div>
          <div style={{ fontSize: 11, color: '#5a4480', fontWeight: 700, marginTop: 6, letterSpacing: 1 }}>
            {new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'long', month: 'short', day: 'numeric' })} EST · resets at midnight
          </div>
          <div className="sync-badge" style={{ background: usingSupabase ? 'rgba(74,222,128,0.15)' : 'rgba(254,202,87,0.15)', color: usingSupabase ? '#4ade80' : '#FECA57', border: `1px solid ${usingSupabase ? 'rgba(74,222,128,0.3)' : 'rgba(254,202,87,0.3)'}` }}>
            {usingSupabase ? '☁️ Synced to cloud' : '💾 Local storage'}
          </div>
        </div>

        <div className="tab-bar">
          <button className={`tab-btn ${tab === 'tasks' ? 'active' : ''}`} onClick={() => setTab('tasks')}>✓ &nbsp;Tasks</button>
          <button className={`tab-btn ${tab === 'budget' ? 'active' : ''}`} onClick={() => setTab('budget')}>$ &nbsp;Budget</button>
        </div>

        {tab === 'tasks' && (
          <>
            {/* Streak */}
            <div className="streak-card">
              <div className="streak-emoji">{getStreakEmoji(streak)}</div>
              <div className="streak-info">
                <div className="streak-label">Daily Streak</div>
                <div className="streak-number">{streak} <span>day{streak !== 1 ? 's' : ''}</span></div>
                <div className="streak-best">Best: <b>{bestStreak} days</b></div>
                {streakBumpedToday && <div style={{ fontSize: 11, color: '#4ade80', fontWeight: 700, marginTop: 2 }}>✓ Today's streak logged!</div>}
              </div>
              <button className="streak-btn-reset" onClick={() => updateData((p) => ({ ...p, streak: 0, streak_bumped_today: false }))} title="Reset streak">Reset</button>
            </div>

            {/* Goal */}
            <div className={`goal-card ${totalCompleted >= goalTarget ? 'completed' : ''}`}>
              <div className="goal-header">
                <div className="goal-title">🏆 Total Tasks Completed</div>
                <button className="goal-edit-btn" onClick={() => { setEditingGoal(!editingGoal); setTempGoalTarget(goalTarget.toString()); setTempGoalPrize(goalPrize); setTempCompleted(totalCompleted.toString()) }}>
                  {editingGoal ? 'Cancel' : 'Edit Goal'}
                </button>
              </div>
              {editingGoal ? (
                <div className="goal-edit-form">
                  <div className="goal-edit-row">
                    <label>Done:</label>
                    <input className="add-input" type="number" value={tempCompleted} onChange={(e) => setTempCompleted(e.target.value)} style={{ width: 100, flex: 'none' }} min="0" />
                    <span style={{ fontSize: 13, color: '#5a4480', fontWeight: 600 }}>completed</span>
                  </div>
                  <div className="goal-edit-row">
                    <label>Target:</label>
                    <input className="add-input" type="number" value={tempGoalTarget} onChange={(e) => setTempGoalTarget(e.target.value)} style={{ width: 100, flex: 'none' }} />
                    <span style={{ fontSize: 13, color: '#5a4480', fontWeight: 600 }}>tasks</span>
                  </div>
                  <div className="goal-edit-row">
                    <label>Prize:</label>
                    <input className="add-input" value={tempGoalPrize} onChange={(e) => setTempGoalPrize(e.target.value)} placeholder="What's the reward?" style={{ flex: 1 }} />
                  </div>
                  <button className="save-btn" onClick={saveGoal} style={{ alignSelf: 'flex-start', padding: '8px 20px' }}>Save Goal</button>
                </div>
              ) : (
                <>
                  <div className="goal-counts">
                    <div className="goal-current">{totalCompleted}</div>
                    <div className="goal-divider">/</div>
                    <div className="goal-target-num">{goalTarget}</div>
                  </div>
                  <div className="goal-bar-bg">
                    <div className="goal-bar-fill" style={{ width: `${goalProgress}%` }} />
                  </div>
                  <div className="goal-prize">
                    <span className="goal-prize-label">Prize:</span>
                    <span>{totalCompleted >= goalTarget ? '🎉 ' : ''}{goalPrize}</span>
                    {totalCompleted >= goalTarget && <span style={{ marginLeft: 'auto', color: '#FECA57', fontWeight: 800 }}>UNLOCKED!</span>}
                  </div>
                </>
              )}
            </div>

            {/* Today */}
            <div className="section">
              <div className="section-header">
                <div className="section-title">🎯 Today</div>
                <div className="section-count">{completedDaily}/{dailyTasks.length} done</div>
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${dailyProgress}%` }} />
              </div>
              {allDailyDone && (
                <div className="all-done-banner">
                  <div className="emoji">🎊</div>
                  <div className="text">ALL TASKS CRUSHED!</div>
                  <div className="sub">Your streak stays alive 💪</div>
                </div>
              )}
              {dailyTasks.length === 0 && <div className="empty-state">No tasks yet — add one below 👇</div>}
              {dailyTasks.map((task) => (
                <div key={task.id} className={`task-item ${task.done ? 'done' : ''}`}>
                  <div className={`checkbox ${task.done ? 'checked' : ''}`} onClick={(e) => toggleTask('daily_tasks', task.id, e)}>
                    {task.done && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a1035" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                  </div>
                  {editingTask?.id === task.id ? (
                    <div className="edit-inline">
                      <input value={editTaskText} onChange={(e) => setEditTaskText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEditTask()} autoFocus />
                      <button className="save-btn" onClick={saveEditTask}>Save</button>
                      <button className="cancel-btn" onClick={() => setEditingTask(null)}>✕</button>
                    </div>
                  ) : (
                    <>
                      <span className={`task-text ${task.done ? 'done' : ''}`}>{task.text}</span>
                      <div className="task-actions">
                        <button className="action-btn" onClick={() => startEditTask(task, 'daily')} title="Edit">✎</button>
                        <button className="action-btn delete" onClick={() => removeTask('daily_tasks', task.id)} title="Delete">✕</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              <div className="add-row">
                <input className="add-input" placeholder="Add a task for today..." value={newDaily} onChange={(e) => setNewDaily(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addDaily()} />
                <button className="add-btn" onClick={addDaily}>Add</button>
              </div>
            </div>

            {/* Someday */}
            <div className="section">
              <div className="section-header">
                <div className="section-title">💭 Someday</div>
                <div className="section-count">{completedSomeday}/{somedayTasks.length} done</div>
              </div>
              {somedayTasks.length === 0 && <div className="empty-state">Nothing in the backlog yet</div>}
              {somedayTasks.map((task) => (
                <div key={task.id} className={`task-item ${task.done ? 'done' : ''}`}>
                  <div className={`checkbox ${task.done ? 'checked' : ''}`} onClick={(e) => toggleTask('someday_tasks', task.id, e)}>
                    {task.done && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a1035" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                  </div>
                  {editingTask?.id === task.id ? (
                    <div className="edit-inline">
                      <input value={editTaskText} onChange={(e) => setEditTaskText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEditTask()} autoFocus />
                      <button className="save-btn" onClick={saveEditTask}>Save</button>
                      <button className="cancel-btn" onClick={() => setEditingTask(null)}>✕</button>
                    </div>
                  ) : (
                    <>
                      <span className={`task-text ${task.done ? 'done' : ''}`}>{task.text}</span>
                      <div className="task-actions">
                        <button className="action-btn" onClick={() => startEditTask(task, 'someday')} title="Edit">✎</button>
                        <button className="action-btn delete" onClick={() => removeTask('someday_tasks', task.id)} title="Delete">✕</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              <div className="add-row">
                <input className="add-input" placeholder="Add something for later..." value={newSomeday} onChange={(e) => setNewSomeday(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSomeday()} />
                <button className="add-btn" onClick={addSomeday}>Add</button>
              </div>
            </div>
          </>
        )}

        {tab === 'budget' && (
          <>
            <div className="budget-overview">
              <div className="budget-ov-card income-card">
                <div className="budget-ov-label">Monthly Income</div>
                <div className="budget-ov-amount income-amount">${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className="budget-ov-card expense-ov-card">
                <div className="budget-ov-label">Monthly Expenses</div>
                <div className="budget-ov-amount expense-ov-amount">${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            </div>

            <div className="net-summary" style={{ borderColor: netMonthly >= 0 ? '#4ade80' : '#FF6B6B' }}>
              <div className="net-label">{netMonthly >= 0 ? '💰' : '⚠️'} Net Monthly</div>
              <div className="net-amount" style={{ color: netMonthly >= 0 ? '#4ade80' : '#FF6B6B' }}>
                {netMonthly >= 0 ? '+' : ''}${netMonthly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="net-sub">${(netMonthly * 12).toLocaleString('en-US', { minimumFractionDigits: 2 })} /yr</div>
            </div>

            {/* Income */}
            <div className="section">
              <div className="section-header">
                <div className="section-title">💸 Income Streams</div>
                <div className="section-count">{incomeStreams.length} stream{incomeStreams.length !== 1 ? 's' : ''}</div>
              </div>
              {incomeStreams.length === 0 && <div className="empty-state">No income streams yet — add one below</div>}
              {incomeStreams.map((inc) => (
                <div className="expense-item" key={inc.id}>
                  {editingIncome === inc.id ? (
                    <div className="edit-inline" style={{ width: '100%' }}>
                      <input value={editIncomeName} onChange={(e) => setEditIncomeName(e.target.value)} placeholder="Name" />
                      <input value={editIncomeAmount} onChange={(e) => setEditIncomeAmount(e.target.value)} type="number" step="0.01" style={{ width: 90 }} />
                      <select className="add-select" value={editIncomeType} onChange={(e) => setEditIncomeType(e.target.value)} style={{ padding: '6px 10px', background: '#1a1035', border: '2px solid #6c3ce0', borderRadius: 8 }}>
                        {incomeTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <button className="save-btn" onClick={saveEditIncome}>Save</button>
                      <button className="cancel-btn" onClick={() => setEditingIncome(null)}>✕</button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span className="expense-name">{inc.name}</span>
                        <span style={{ fontSize: 11, color: '#7c5cbf', fontWeight: 700 }}>{inc.type}</span>
                      </div>
                      <div className="expense-right">
                        <span className="expense-amount" style={{ color: '#4ade80' }}>+${inc.amount.toFixed(2)}</span>
                        <div className="expense-actions">
                          <button className="action-btn" onClick={() => startEditIncome(inc)} title="Edit">✎</button>
                          <button className="action-btn delete" onClick={() => removeIncome(inc.id)} title="Delete">✕</button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
              <div style={{ marginTop: 10 }}>
                <div className="add-expense-form">
                  <input className="add-input" placeholder="Income source" value={newIncomeName} onChange={(e) => setNewIncomeName(e.target.value)} />
                  <input className="add-input" placeholder="Amount" type="number" step="0.01" value={newIncomeAmount} onChange={(e) => setNewIncomeAmount(e.target.value)} />
                  <select className="add-select" value={newIncomeType} onChange={(e) => setNewIncomeType(e.target.value)}>
                    {incomeTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button className="add-btn" onClick={addIncome}>Add</button>
                </div>
              </div>
            </div>

            {/* Expenses */}
            <div className="section">
              <div className="section-header">
                <div className="section-title">🔻 Expenses</div>
                <div className="section-count">${totalExpenses.toFixed(2)}/mo</div>
              </div>
              <div className="budget-summary">
                <div className="budget-per">${(totalExpenses * 12).toLocaleString('en-US', { minimumFractionDigits: 2 })} /yr</div>
                {Object.keys(groupedExpenses).length > 0 && (
                  <div className="bar-chart">
                    {Object.entries(groupedExpenses).map(([cat, items]) => {
                      const catTotal = items.reduce((s, i) => s + i.amount, 0)
                      const maxCat = Math.max(...Object.values(groupedExpenses).map((its) => its.reduce((s, i) => s + i.amount, 0)))
                      return (
                        <div className="bar-col" key={cat} title={`${cat}: $${catTotal.toFixed(2)}`}>
                          <div className="bar-fill" style={{ height: `${(catTotal / maxCat) * 100}%` }} />
                          <div className="bar-label">{cat.slice(0, 5)}</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              {Object.entries(groupedExpenses).map(([cat, items]) => {
                const catTotal = items.reduce((s, i) => s + i.amount, 0)
                return (
                  <div className="category-group" key={cat}>
                    <div className="category-header">
                      <div className="category-name">{cat}</div>
                      <div className="category-subtotal">${catTotal.toFixed(2)}</div>
                    </div>
                    {items.map((exp) => (
                      <div className="expense-item" key={exp.id}>
                        {editingExpense === exp.id ? (
                          <div className="edit-inline" style={{ width: '100%' }}>
                            <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
                            <input value={editAmount} onChange={(e) => setEditAmount(e.target.value)} type="number" step="0.01" style={{ width: 90 }} />
                            <select className="add-select" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} style={{ padding: '6px 10px', background: '#1a1035', border: '2px solid #6c3ce0', borderRadius: 8 }}>
                              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <button className="save-btn" onClick={saveEditExpense}>Save</button>
                            <button className="cancel-btn" onClick={() => setEditingExpense(null)}>✕</button>
                          </div>
                        ) : (
                          <>
                            <span className="expense-name">{exp.name}</span>
                            <div className="expense-right">
                              <span className="expense-amount">${exp.amount.toFixed(2)}</span>
                              <div className="expense-actions">
                                <button className="action-btn" onClick={() => startEditExpense(exp)} title="Edit">✎</button>
                                <button className="action-btn delete" onClick={() => removeExpense(exp.id)} title="Delete">✕</button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )
              })}
              {expenses.length === 0 && <div className="empty-state">No expenses yet — add your first one below</div>}
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 12, color: '#7c5cbf', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10, fontWeight: 800 }}>Add Expense</div>
                <div className="add-expense-form">
                  <input className="add-input" placeholder="Expense name" value={newExpName} onChange={(e) => setNewExpName(e.target.value)} />
                  <input className="add-input" placeholder="Amount" type="number" step="0.01" value={newExpAmount} onChange={(e) => setNewExpAmount(e.target.value)} />
                  <select className="add-select" value={newExpCategory} onChange={(e) => setNewExpCategory(e.target.value)}>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button className="add-btn" onClick={addExpense}>Add</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
