import { ref } from 'vue'

export function useFormValidation() {
  const error = ref('')

  const clearError = () => { error.value = '' }

  const validate = (rules: { condition: boolean; message: string }[]): boolean => {
    error.value = ''
    for (const rule of rules) {
      if (rule.condition) {
        error.value = rule.message
        return false
      }
    }
    return true
  }

  // rule preset validators from common fields
  const rules = {
    allRequired: (fields: { value: string; label: string }[]) => ({
      condition: fields.some(f => !f.value.trim()),
      message: 'All fields are empty.'
    }),
    required: (value: string, label = 'This field') => ({
      condition: !value.trim(),
      message: `${label} is required.`
    }),
    email: (value: string) => ({
      condition: !!value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      message: 'Please enter a valid email address.'
    }),
    minLength: (value: string, length: number, label = 'This field') => ({
      condition: value.length < length,
      message: `${label} must be at least ${length} characters.`
    }),
    match: (a: string, b: string, label = 'Passwords') => ({
      condition: !!a && !!b && a !== b,
      message: `${label} do not match.`
    }),
  }
  return { error, clearError, validate, rules }
}
