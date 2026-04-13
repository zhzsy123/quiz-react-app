import React from 'react'
import { GitBranch, KeyRound, Link2, Network, Plus, Trash2, Waves } from 'lucide-react'

import {
  buildErDiagramAttributeLabel,
  createErDiagramAttribute,
  createErDiagramEntity,
  createErDiagramRelationship,
  createRelationSchemaRow,
  normalizeErDiagramResponse,
} from '../../entities/quiz/lib/erDiagramAnswerUtils.js'

function AttributeRow({ attribute, disabled, onChange, onRemove }) {
  return (
    <div className="er-attribute-row">
      <input
        type="text"
        className="er-inline-input"
        value={attribute.name}
        onChange={(event) => onChange({ ...attribute, name: event.target.value })}
        disabled={disabled}
        placeholder="属性名"
      />
      <button
        type="button"
        className={`secondary-btn small-btn er-flag-btn ${attribute.isPrimaryKey ? 'active' : ''}`}
        disabled={disabled}
        onClick={() => onChange({ ...attribute, isPrimaryKey: !attribute.isPrimaryKey, isForeignKey: false })}
        title="主键"
      >
        <KeyRound size={14} />
        主键
      </button>
      <button
        type="button"
        className={`secondary-btn small-btn er-flag-btn ${attribute.isForeignKey ? 'active' : ''}`}
        disabled={disabled}
        onClick={() => onChange({ ...attribute, isForeignKey: !attribute.isForeignKey, isPrimaryKey: false })}
        title="外键"
      >
        <Waves size={14} />
        外键
      </button>
      <button type="button" className="secondary-btn small-btn er-remove-btn" disabled={disabled} onClick={onRemove}>
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function AttributePreview({ attribute }) {
  if (!attribute?.name) return null

  return (
    <span
      className={`er-attribute-preview ${attribute.isPrimaryKey ? 'primary' : ''} ${attribute.isForeignKey ? 'foreign' : ''}`}
    >
      {attribute.name}
    </span>
  )
}

function EntityCard({ entity, disabled, onChange, onRemove }) {
  const attributes = Array.isArray(entity.attributes) ? entity.attributes : []

  return (
    <article className="er-entity-card">
      <div className="er-card-head">
        <input
          type="text"
          className="er-card-title-input"
          value={entity.name}
          onChange={(event) => onChange({ ...entity, name: event.target.value })}
          disabled={disabled}
          placeholder="实体名"
        />
        <button type="button" className="secondary-btn small-btn er-remove-btn" disabled={disabled} onClick={onRemove}>
          <Trash2 size={14} />
        </button>
      </div>

      <div className="er-inline-preview">
        {entity.name ? `${entity.name}（` : '实体（'}
        {attributes.filter((attribute) => attribute.name).length > 0 ? (
          attributes
            .filter((attribute) => attribute.name)
            .map((attribute, index) => (
              <React.Fragment key={attribute.id}>
                {index > 0 ? <span className="er-preview-separator">、</span> : null}
                <AttributePreview attribute={attribute} />
              </React.Fragment>
            ))
        ) : (
          <span className="er-placeholder-text">属性列表</span>
        )}
        {'）'}
      </div>

      <div className="er-attribute-list">
        {attributes.map((attribute) => (
          <AttributeRow
            key={attribute.id}
            attribute={attribute}
            disabled={disabled}
            onChange={(nextAttribute) =>
              onChange({
                ...entity,
                attributes: attributes.map((entry) => (entry.id === attribute.id ? nextAttribute : entry)),
              })
            }
            onRemove={() =>
              onChange({
                ...entity,
                attributes: attributes.filter((entry) => entry.id !== attribute.id),
              })
            }
          />
        ))}
      </div>

      <button
        type="button"
        className="secondary-btn small-btn"
        disabled={disabled}
        onClick={() =>
          onChange({
            ...entity,
            attributes: [...attributes, createErDiagramAttribute()],
          })
        }
      >
        <Plus size={14} />
        添加属性
      </button>
    </article>
  )
}

function RelationshipRow({ relationship, entities, disabled, onChange, onRemove }) {
  return (
    <article className="er-relationship-row">
      <div className="er-relationship-grid">
        <input
          type="text"
          className="er-inline-input"
          value={relationship.name}
          onChange={(event) => onChange({ ...relationship, name: event.target.value })}
          disabled={disabled}
          placeholder="联系名"
        />
        <select
          className="er-inline-select"
          value={relationship.fromEntityId}
          onChange={(event) => onChange({ ...relationship, fromEntityId: event.target.value })}
          disabled={disabled}
        >
          <option value="">起点实体</option>
          {entities.map((entity) => (
            <option key={`from-${entity.id}`} value={entity.id}>
              {entity.name || '未命名实体'}
            </option>
          ))}
        </select>
        <input
          type="text"
          className="er-inline-input mini"
          value={relationship.cardinalityFrom}
          onChange={(event) => onChange({ ...relationship, cardinalityFrom: event.target.value })}
          disabled={disabled}
          placeholder="1 / N"
        />
        <select
          className="er-inline-select"
          value={relationship.toEntityId}
          onChange={(event) => onChange({ ...relationship, toEntityId: event.target.value })}
          disabled={disabled}
        >
          <option value="">终点实体</option>
          {entities.map((entity) => (
            <option key={`to-${entity.id}`} value={entity.id}>
              {entity.name || '未命名实体'}
            </option>
          ))}
        </select>
        <input
          type="text"
          className="er-inline-input mini"
          value={relationship.cardinalityTo}
          onChange={(event) => onChange({ ...relationship, cardinalityTo: event.target.value })}
          disabled={disabled}
          placeholder="1 / N"
        />
        <button type="button" className="secondary-btn small-btn er-remove-btn" disabled={disabled} onClick={onRemove}>
          <Trash2 size={14} />
        </button>
      </div>
    </article>
  )
}

function RelationSchemaCard({ relation, disabled, onChange, onRemove }) {
  const attributes = Array.isArray(relation.attributes) ? relation.attributes : []

  return (
    <article className="er-relation-card">
      <div className="er-card-head">
        <input
          type="text"
          className="er-card-title-input"
          value={relation.name}
          onChange={(event) => onChange({ ...relation, name: event.target.value })}
          disabled={disabled}
          placeholder="关系模式名"
        />
        <button type="button" className="secondary-btn small-btn er-remove-btn" disabled={disabled} onClick={onRemove}>
          <Trash2 size={14} />
        </button>
      </div>

      <div className="er-inline-preview">
        {relation.name ? `${relation.name}（` : '关系（'}
        {attributes.filter((attribute) => attribute.name).length > 0 ? (
          attributes
            .filter((attribute) => attribute.name)
            .map((attribute, index) => (
              <React.Fragment key={attribute.id}>
                {index > 0 ? <span className="er-preview-separator">、</span> : null}
                <AttributePreview attribute={attribute} />
              </React.Fragment>
            ))
        ) : (
          <span className="er-placeholder-text">属性列表</span>
        )}
        {'）'}
      </div>

      <div className="er-attribute-list">
        {attributes.map((attribute) => (
          <AttributeRow
            key={attribute.id}
            attribute={attribute}
            disabled={disabled}
            onChange={(nextAttribute) =>
              onChange({
                ...relation,
                attributes: attributes.map((entry) => (entry.id === attribute.id ? nextAttribute : entry)),
              })
            }
            onRemove={() =>
              onChange({
                ...relation,
                attributes: attributes.filter((entry) => entry.id !== attribute.id),
              })
            }
          />
        ))}
      </div>

      <button
        type="button"
        className="secondary-btn small-btn"
        disabled={disabled}
        onClick={() =>
          onChange({
            ...relation,
            attributes: [...attributes, createErDiagramAttribute()],
          })
        }
      >
        <Plus size={14} />
        添加属性
      </button>
    </article>
  )
}

export default function ErDiagramBlock({ item, userResponse, disabled, submitted, onChange }) {
  const response = normalizeErDiagramResponse(userResponse)
  const entities = Array.isArray(response.diagram?.entities) ? response.diagram.entities : []
  const relationships = Array.isArray(response.diagram?.relationships) ? response.diagram.relationships : []
  const relations = Array.isArray(response.relations) ? response.relations : []
  const scoringPoints = Array.isArray(item.answer?.scoring_points) ? item.answer.scoring_points : []

  function updateResponse(nextResponse) {
    onChange?.(item.id, nextResponse)
  }

  return (
    <div className="subjective-block er-diagram-block">
      <section className="er-section-card">
        <div className="er-section-head">
          <div className="er-section-title">
            <Network size={16} />
            <span>E-R 建模面板</span>
          </div>
          <button
            type="button"
            className="secondary-btn small-btn"
            disabled={disabled}
            onClick={() =>
              updateResponse({
                ...response,
                diagram: {
                  ...response.diagram,
                  entities: [...entities, createErDiagramEntity()],
                },
              })
            }
          >
            <Plus size={14} />
            添加实体
          </button>
        </div>

        <div className="er-card-grid">
          {entities.map((entity) => (
            <EntityCard
              key={entity.id}
              entity={entity}
              disabled={disabled}
              onChange={(nextEntity) =>
                updateResponse({
                  ...response,
                  diagram: {
                    ...response.diagram,
                    entities: entities.map((entry) => (entry.id === entity.id ? nextEntity : entry)),
                  },
                })
              }
              onRemove={() =>
                updateResponse({
                  ...response,
                  diagram: {
                    ...response.diagram,
                    entities: entities.filter((entry) => entry.id !== entity.id),
                    relationships: relationships.filter(
                      (entry) => entry.fromEntityId !== entity.id && entry.toEntityId !== entity.id
                    ),
                  },
                })
              }
            />
          ))}
        </div>
      </section>

      <section className="er-section-card">
        <div className="er-section-head">
          <div className="er-section-title">
            <GitBranch size={16} />
            <span>联系与基数</span>
          </div>
          <button
            type="button"
            className="secondary-btn small-btn"
            disabled={disabled}
            onClick={() =>
              updateResponse({
                ...response,
                diagram: {
                  ...response.diagram,
                  relationships: [...relationships, createErDiagramRelationship()],
                },
              })
            }
          >
            <Plus size={14} />
            添加联系
          </button>
        </div>

        <div className="er-relationship-list">
          {relationships.map((relationship) => (
            <RelationshipRow
              key={relationship.id}
              relationship={relationship}
              entities={entities}
              disabled={disabled}
              onChange={(nextRelationship) =>
                updateResponse({
                  ...response,
                  diagram: {
                    ...response.diagram,
                    relationships: relationships.map((entry) =>
                      entry.id === relationship.id ? nextRelationship : entry
                    ),
                  },
                })
              }
              onRemove={() =>
                updateResponse({
                  ...response,
                  diagram: {
                    ...response.diagram,
                    relationships: relationships.filter((entry) => entry.id !== relationship.id),
                  },
                })
              }
            />
          ))}
        </div>
      </section>

      <section className="er-section-card">
        <div className="er-section-head">
          <div className="er-section-title">
            <Link2 size={16} />
            <span>转换后的关系模式</span>
          </div>
          <button
            type="button"
            className="secondary-btn small-btn"
            disabled={disabled}
            onClick={() =>
              updateResponse({
                ...response,
                relations: [...relations, createRelationSchemaRow()],
              })
            }
          >
            <Plus size={14} />
            添加关系模式
          </button>
        </div>

        <div className="er-card-grid">
          {relations.map((relation) => (
            <RelationSchemaCard
              key={relation.id}
              relation={relation}
              disabled={disabled}
              onChange={(nextRelation) =>
                updateResponse({
                  ...response,
                  relations: relations.map((entry) => (entry.id === relation.id ? nextRelation : entry)),
                })
              }
              onRemove={() =>
                updateResponse({
                  ...response,
                  relations: relations.filter((entry) => entry.id !== relation.id),
                })
              }
            />
          ))}
        </div>
      </section>

      <section className="er-section-card">
        <div className="er-section-head">
          <div className="er-section-title">补充说明</div>
        </div>
        <textarea
          className="subjective-textarea"
          value={response.notes || ''}
          onChange={(event) => updateResponse({ ...response, notes: event.target.value })}
          disabled={disabled}
          rows={5}
          spellCheck={false}
          placeholder="可补充说明实体约束、弱实体、联系说明或转换规则。"
        />
      </section>

      {submitted && (item.answer?.reference_answer || scoringPoints.length > 0) ? (
        <div className="analysis-box">
          {item.answer?.reference_answer ? (
            <>
              <div className="analysis-section-title">参考答案</div>
              <div>{item.answer.reference_answer}</div>
            </>
          ) : null}
          {scoringPoints.length > 0 ? (
            <>
              <div className="analysis-section-title">评分要点</div>
              <ul className="analysis-list">
                {scoringPoints.map((point, index) => (
                  <li key={`${item.id}-score-${index}`}>{point}</li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
