export const RELATIONAL_ALGEBRA_TEMPLATES = [
  {
    key: 'project',
    label: '投影',
    description: '选择目标属性',
    expression: 'π[属性](关系)',
  },
  {
    key: 'select-project',
    label: '选择后投影',
    description: '先筛选再输出字段',
    expression: 'π[属性](σ[条件](关系))',
  },
  {
    key: 'join',
    label: '连接查询',
    description: '两表连接后投影',
    expression: 'π[属性](关系 ⋈ 关系)',
  },
  {
    key: 'select-join',
    label: '筛选连接',
    description: '筛选 + 连接组合',
    expression: 'π[属性](σ[条件](关系 ⋈ 关系))',
  },
  {
    key: 'difference',
    label: '差集',
    description: '求补集或排除集合',
    expression: 'π[属性](关系) - π[属性](关系)',
  },
  {
    key: 'division',
    label: '除法',
    description: '“对所有”类查询',
    expression: '关系 ÷ 关系',
  },
]
