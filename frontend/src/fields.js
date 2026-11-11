export const studentFields = [
  { name: 'name', label: 'Name', maxlength: 200, autocomplete: 'name' },
  { name: 'id', label: 'Student ID', maxlength: 100 },
  { name: 'phone', label: 'Phone', maxlength: 50, type: 'tel', autocomplete: 'tel' },
  { name: 'zip', label: 'ZIP code', maxlength: 20, autocomplete: 'postal-code' },
]
export const courseFields = [
  { name: 'id', label: 'Course ID', maxlength: 100 },
  { name: 'name', label: 'Course name', maxlength: 200 },
]
export const studentColumns = [
  { key: 'name', label: 'Name' }, { key: 'id', label: 'Student ID' },
  { key: 'phone', label: 'Phone' }, { key: 'zip', label: 'ZIP' },
]
export const courseColumns = [{ key: 'id', label: 'Course ID' }, { key: 'name', label: 'Course name' }]
