export type Subject = 'data_structure' | 'database'

export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'true_false'
  | 'fill_blank'
  | 'short_answer'
  | 'application'
  | 'sql'

export type AnswerMode =
  | 'single_choice'
  | 'multiple_choice'
  | 'true_false'
  | 'text'
  | 'textarea'
  | 'sql_editor'
  | 'sequence_input'
  | 'multi_blank'
  | 'structured_form'

export interface QuestionSource {
  school?: string
  year?: number
  paperTitle?: string
  paperType?: 'official' | 'recall' | 'mock' | 'custom'
  sectionName?: string
  questionNo?: string
}

export interface OptionItem {
  key: string
  text: string
}

export interface TextBlock {
  type: 'text'
  value: string
}

export interface TableBlock {
  type: 'table'
  caption?: string
  headers: string[]
  rows: Array<Array<string | number | boolean | null>>
}

export interface ImageBlock {
  type: 'image'
  caption?: string
  url: string
  alt?: string
}

export interface GraphEdge {
  from: string
  to: string
  weight?: number
}

export interface GraphBlock {
  type: 'graph'
  caption?: string
  graphType: 'undirected' | 'directed' | 'undirected_weighted' | 'directed_weighted'
  vertices: string[]
  edges: GraphEdge[]
}

export interface BinaryTreeNode {
  id: string
  value?: string | number
  left?: string | null
  right?: string | null
}

export interface BinaryTreeBlock {
  type: 'binary_tree'
  caption?: string
  root: string
  nodes: BinaryTreeNode[]
}

export interface SchemaColumn {
  name: string
  dataType: string
  isPrimaryKey?: boolean
  isForeignKey?: boolean
  references?: string
  nullable?: boolean
}

export interface SchemaTable {
  name: string
  columns: SchemaColumn[]
}

export interface SchemaBlock {
  type: 'schema'
  caption?: string
  tables: SchemaTable[]
}

export type QuestionContentBlock =
  | TextBlock
  | TableBlock
  | ImageBlock
  | GraphBlock
  | BinaryTreeBlock
  | SchemaBlock

export interface SequenceAnswerSpecField {
  key: string
  label: string
  separatorHint?: string
}

export interface MultiBlankSpecField {
  key: string
  label: string
}

export interface StructuredFormField {
  key: string
  label: string
  fieldType: 'text' | 'textarea' | 'number' | 'array_text'
}

export type AnswerSpec =
  | { placeholder?: string; maxLength?: number }
  | { fields: SequenceAnswerSpecField[] }
  | { blanks: MultiBlankSpecField[] }
  | { fields: StructuredFormField[] }

export type StandardAnswer =
  | { type: 'single_choice' | 'multiple_choice'; value: string | string[] }
  | { type: 'true_false'; value: boolean }
  | { type: 'text' | 'short_answer'; value: string; acceptedValues?: string[] }
  | { type: 'sequence_input'; fields: Record<string, string | Array<string | number>> }
  | { type: 'multi_blank'; blanks: Record<string, string | number | boolean | Array<string | number>> }
  | { type: 'structured_form'; fields: Record<string, unknown> }
  | { type: 'sql'; sql: string; acceptedSql?: string[] }

export interface JudgeConfig {
  strategy: 'exact' | 'normalized_text' | 'unordered_set' | 'ordered_sequence' | 'sql_result_compare' | 'manual'
  caseInsensitive?: boolean
  trimSpaces?: boolean
  ignorePunctuation?: boolean
  sequenceSeparator?: string
  sqlChecker?: {
    compareBy: 'result_set' | 'ast' | 'normalized_sql'
  }
}

export interface ExamQuestion {
  id: string
  source?: QuestionSource
  subject: Subject
  module: string
  subtype?: string
  questionType: QuestionType
  difficulty?: 1 | 2 | 3 | 4 | 5
  score?: number
  knowledgePoints?: string[]
  tags?: string[]
  content: QuestionContentBlock[]
  options?: OptionItem[]
  answerMode: AnswerMode
  answerSpec?: AnswerSpec
  standardAnswer: StandardAnswer
  analysis?: string
  judgeConfig?: JudgeConfig
}

export interface ExamImportPackage {
  version: '1.0'
  meta: {
    title: string
    sourceType: 'ai_generated' | 'paper_parsed' | 'manual'
    school?: string
    year?: number
    paperTitle?: string
    paperType?: 'official' | 'recall' | 'mock' | 'custom'
    subjectScope?: Subject[]
    language?: 'zh-CN'
  }
  questions: ExamQuestion[]
}
