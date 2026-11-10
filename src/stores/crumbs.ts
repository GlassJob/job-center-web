import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useCrumbsStore = defineStore('crumbs', () => {
  const serviceTitle = ref('')
  const jobTitle = ref('')

  function setServiceTitle(title: string) {
    serviceTitle.value = title
  }

  function setJobTitle(title: string) {
    jobTitle.value = title
  }

  return { serviceTitle, jobTitle, setServiceTitle, setJobTitle }
})
