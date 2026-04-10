import React from 'react'

function SchemaToken({ token, activeToken, disabled, onHover, onLeave, onInsert, asText = false }) {
  const selected = activeToken === token.value

  return (
    <button
      type="button"
      className={`rel-algebra-token ${token.kind} ${selected ? 'selected' : ''} ${asText ? 'inline' : ''}`}
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
    return <div className="rel-algebra-schema-empty">当前题目没有提供关系模式，无法使用快捷插入。</div>
  }

  return (
    <section className="rel-algebra-schema-panel">
      <div className="rel-algebra-panel-header">
        <div>
          <div className="rel-algebra-panel-title">关系模式</div>
          <div className="rel-algebra-panel-caption">每行一个关系，点击关系名或属性即可插入当前表达式。</div>
        </div>
      </div>

      <div className="rel-algebra-schema-grid">
        {schemas.map((schema, index) => {
          const relationName = String(schema?.name || `R${index + 1}`).trim()
          const attributes = Array.isArray(schema?.attributes) ? schema.attributes : []

          return (
            <section key={`${relationName}-${index}`} className="rel-algebra-schema-card">
              <div className="rel-algebra-schema-line">
                <SchemaToken
                  token={{ kind: 'relation', value: relationName, label: relationName }}
                  activeToken={activeToken}
                  disabled={disabled}
                  onHover={onHoverToken}
                  onLeave={onLeaveToken}
                  onInsert={onInsertToken}
                  asText
                />
                <span className="rel-algebra-schema-paren">（</span>
                {attributes.map((attribute, attrIndex) => {
                  const attr = String(attribute || '').trim()
                  if (!attr) return null
                  return (
                    <React.Fragment key={`${relationName}-${attr}-${attrIndex}`}>
                      {attrIndex > 0 && <span className="rel-algebra-schema-comma">、</span>}
                      <SchemaToken
                        token={{ kind: 'attribute', value: attr, label: attr, relation: relationName }}
                        activeToken={activeToken}
                        disabled={disabled}
                        onHover={onHoverToken}
                        onLeave={onLeaveToken}
                        onInsert={onInsertToken}
                        asText
                      />
                    </React.Fragment>
                  )
                })}
                <span className="rel-algebra-schema-paren">）</span>
              </div>
            </section>
          )
        })}
      </div>
    </section>
  )
}
