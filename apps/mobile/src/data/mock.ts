export const summary = {
  income: 12800,
  expense: 4620,
  balance: 8180,
}

export const groupedBills = [
  {
    date: '今天',
    weekday: '周三',
    income: 0,
    expense: 126,
    items: [
      { id: '1', category: '午饭', note: '公司楼下简餐', amount: -28, time: '12:21' },
      { id: '2', category: '咖啡', note: '瑞幸', amount: -18, time: '15:08' },
      { id: '3', category: '打车', note: '回家', amount: -80, time: '19:40' },
    ],
  },
  {
    date: '昨天',
    weekday: '周二',
    income: 5000,
    expense: 286,
    items: [
      { id: '4', category: '工资', note: '4月工资', amount: 5000, time: '09:00' },
      { id: '5', category: '购物', note: '上衣', amount: -199, time: '20:18' },
      { id: '6', category: '晚饭', note: '火锅', amount: -87, time: '21:03' },
    ],
  },
]

export const goals = [
  { id: 'goal-1', name: '买电脑', current: 5200, target: 8000, eta: '约 4 个月' },
  { id: 'goal-2', name: '旅行基金', current: 1800, target: 5000, eta: '约 3 个月' },
]

export const settingsItems = [
  '分类管理',
  '标签管理',
  '导入账单',
  'AI 配置',
  '数据导出',
]
