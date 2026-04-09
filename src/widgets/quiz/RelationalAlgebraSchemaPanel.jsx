import React from 'react'

function SchemaToken({ token, activeToken, disabled, onHover, onLeave, onInsert }) {
  const selected = activeToken === token.value

  return (
    <button
      type="button"
      className={`rel-algebra-token ${token.kind} ${selected ? 'selected' : ''}`}
      disabled={disabled}
      onMouseEnter={() => onHover?.(token.value)}
      onMouseLeave={() => onLeave?.(token.value)}
      onClick={() => onInsert?.(token.value, { wrap: false, kind: token.kind })}
    >
      {token.label}
    </button>
  )
}

export default function RelationalAlgebraSchemaPanel({
  schemas = [],
  activeToken,
  disabled = false,
  onHoverToken,
  onLeaveToken,
  onInsertToken,
}) {
  if (!Array.isArray(schemas) || schemas.length === 0) {
    return <div className="rel-algebra-schema-empty">当前题目未提供关系模式，建议先确认题干结构是否完整。</div>
  }

  return (
    <div className="rel-algebra-schema-panel">
      <div className="rel-algebra-schema-panel-title">关系模式</div>
      <div className="rel-algebra-schema-grid">
        {schemas.map((schema, index) => {
          const relationName = String(schema?.name || `R${index + 1}`).trim()
          const attributes = Array.isArray(schema?.attributes) ? schema.attributes : []

          return (
            <section key={`${relationName}-${index}`} className="rel-algebra-schema-card">
              <div className="rel-algebra-schema-head">
                <span className="rel-algebra-schema-name">{relationName}</span>
                <span className="rel-algebra-schema-meta">{attributes.length} attrs</span>
              </div>
              <div className="rel-algebra-token-row">
                <SchemaToken
                  token={{ kind: 'relation', value: relationName, label: relationName }}
                  activeToken={activeToken}
                  disabled={disabled}
                  onHover={onHoverToken}
                  onLeave={onLeaveToken}
                  onInsert={onInsertToken}
                />
                {attributes.map((attribute, attrIndex) => {
                  const attr = String(attribute || '').trim()
                  if (!attr) return null
                  return (
                    <SchemaToken
                      key={`${relationName}-${attr}-${attrIndex}`}
                      token={{ kind: 'attribute', value: attr, label: attr, relation: relationName }}
                      activeToken={activeToken}
                      disabled={disabled}
                      onHover={onHoverToken}
                      onLeave={onLeaveToken}
                      onInsert={onInsertToken}
                    />
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
