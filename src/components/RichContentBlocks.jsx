import React from 'react'

function renderCellValue(value) {
  if (value === null || value === undefined || value === '') return '--'
  return String(value)
}

function TextContentBlock({ block }) {
  return <div className="question-block question-block-text">{block.value}</div>
}

function TableContentBlock({ block }) {
  return (
    <div className="question-block question-block-table">
      {block.caption && <div className="question-block-caption">{block.caption}</div>}
      <div className="question-table-wrap">
        <table className="question-table">
          <thead>
            <tr>
              {(block.headers || []).map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(block.rows || []).map((row, rowIndex) => (
              <tr key={rowIndex}>
                {(row || []).map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`}>{renderCellValue(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ImageContentBlock({ block }) {
  return (
    <figure className="question-block question-block-image">
      <img
        src={block.url}
        alt={block.alt || block.caption || '题目图片'}
        className="question-image"
      />
      {block.caption && <figcaption className="question-block-caption">{block.caption}</figcaption>}
    </figure>
  )
}

function GraphContentBlock({ block }) {
  return (
    <div className="question-block question-block-graph">
      <div className="question-graph-head">
        <span className="tag blue">图结构</span>
        <span className="tag">{block.graphType}</span>
      </div>
      {block.caption && <div className="question-block-caption">{block.caption}</div>}
      <div className="question-graph-meta">
        <div>
          <strong>顶点：</strong>
          {(block.vertices || []).join('、') || '--'}
        </div>
        <div>
          <strong>边数：</strong>
          {(block.edges || []).length}
        </div>
      </div>
      <div className="question-table-wrap">
        <table className="question-table compact">
          <thead>
            <tr>
              <th>起点</th>
              <th>终点</th>
              <th>权重</th>
            </tr>
          </thead>
          <tbody>
            {(block.edges || []).map((edge, index) => (
              <tr key={`${edge.from}-${edge.to}-${index}`}>
                <td>{edge.from}</td>
                <td>{edge.to}</td>
                <td>{edge.weight ?? '--'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BinaryTreeContentBlock({ block }) {
  return (
    <div className="question-block question-block-tree">
      <div className="question-graph-head">
        <span className="tag blue">二叉树</span>
        <span className="tag">根节点：{block.root}</span>
      </div>
      {block.caption && <div className="question-block-caption">{block.caption}</div>}
      <div className="question-table-wrap">
        <table className="question-table compact">
          <thead>
            <tr>
              <th>节点</th>
              <th>值</th>
              <th>左孩子</th>
              <th>右孩子</th>
            </tr>
          </thead>
          <tbody>
            {(block.nodes || []).map((node) => (
              <tr key={node.id}>
                <td>{node.id}</td>
                <td>{renderCellValue(node.value)}</td>
                <td>{renderCellValue(node.left)}</td>
                <td>{renderCellValue(node.right)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SchemaContentBlock({ block }) {
  return (
    <div className="question-block question-block-schema">
      {block.caption && <div className="question-block-caption">{block.caption}</div>}
      <div className="schema-card-list">
        {(block.tables || []).map((table) => (
          <div key={table.name} className="schema-card">
            <div className="schema-card-title">{table.name}</div>
            <div className="question-table-wrap">
              <table className="question-table compact">
                <thead>
                  <tr>
                    <th>字段</th>
                    <th>类型</th>
                    <th>约束</th>
                  </tr>
                </thead>
                <tbody>
                  {(table.columns || []).map((column) => {
                    const flags = []
                    if (column.isPrimaryKey) flags.push('PK')
                    if (column.isForeignKey) flags.push(`FK${column.references ? ` -> ${column.references}` : ''}`)
                    if (column.nullable === false) flags.push('NOT NULL')

                    return (
                      <tr key={`${table.name}-${column.name}`}>
                        <td>{column.name}</td>
                        <td>{column.dataType}</td>
                        <td>{flags.length ? flags.join(' / ') : '--'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function UnsupportedContentBlock({ block }) {
  return (
    <div className="question-block question-block-text">
      不支持的内容块类型：{block?.type || 'unknown'}
    </div>
  )
}

function renderBlock(block, index) {
  switch (block?.type) {
    case 'text':
      return <TextContentBlock key={index} block={block} />
    case 'table':
      return <TableContentBlock key={index} block={block} />
    case 'image':
      return <ImageContentBlock key={index} block={block} />
    case 'graph':
      return <GraphContentBlock key={index} block={block} />
    case 'binary_tree':
      return <BinaryTreeContentBlock key={index} block={block} />
    case 'schema':
      return <SchemaContentBlock key={index} block={block} />
    default:
      return <UnsupportedContentBlock key={index} block={block} />
  }
}

export default function RichContentBlocks({ blocks = [] }) {
  if (!Array.isArray(blocks) || blocks.length === 0) return null

  return (
    <div className="question-rich-content">
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  )
}
