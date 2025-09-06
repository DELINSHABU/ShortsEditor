export interface PromptTemplate {
  id: string
  name: string
  description: string
  category: string
  template: string
  tags: string[]
}

export const defaultTemplates: PromptTemplate[] = [
  {
    id: "login-form",
    name: "Login Form",
    description: "Modern authentication form with social login options",
    category: "Authentication",
    template: "Create a modern login form with email/password fields and social sign-in buttons",
    tags: ["form", "auth", "social-login"],
  },
  {
    id: "dashboard-card",
    name: "Dashboard Card",
    description: "Analytics card component for dashboards",
    category: "Dashboard",
    template: "Create a dashboard analytics card showing key metrics with charts",
    tags: ["dashboard", "analytics", "card", "charts"],
  },
  {
    id: "pricing-table",
    name: "Pricing Table",
    description: "Responsive pricing plans comparison table",
    category: "Marketing",
    template: "Create a responsive pricing table with multiple tiers and feature comparisons",
    tags: ["pricing", "table", "comparison", "marketing"],
  },
  {
    id: "contact-form",
    name: "Contact Form",
    description: "Professional contact form with validation",
    category: "Forms",
    template: "Create a professional contact form with name, email, subject, and message fields",
    tags: ["form", "contact", "validation"],
  },
  {
    id: "hero-section",
    name: "Hero Section",
    description: "Landing page hero with CTA buttons",
    category: "Marketing",
    template: "Create a compelling hero section with headline, description, and call-to-action buttons",
    tags: ["hero", "landing", "cta", "marketing"],
  },
]

export function getTemplatesByCategory(category: string): PromptTemplate[] {
  return defaultTemplates.filter((template) => template.category === category)
}

export function searchTemplates(query: string): PromptTemplate[] {
  const lowercaseQuery = query.toLowerCase()
  return defaultTemplates.filter(
    (template) =>
      template.name.toLowerCase().includes(lowercaseQuery) ||
      template.description.toLowerCase().includes(lowercaseQuery) ||
      template.tags.some((tag) => tag.toLowerCase().includes(lowercaseQuery)),
  )
}
