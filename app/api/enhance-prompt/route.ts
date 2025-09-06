import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json()

    if (!prompt || typeof prompt !== "string") {
      return Response.json({ error: "Invalid prompt provided" }, { status: 400 })
    }

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system: `You are MetaPrompt, an AI assistant specialized in transforming basic UI/UX requests into detailed, comprehensive prompts for AI-powered UI generation tools like v0.

Your role is to take a simple user request and expand it into a structured, detailed prompt that will generate high-quality React components with proper styling, accessibility, and best practices.

ENHANCEMENT GUIDELINES:
1. **Context & Purpose**: Identify the type of component and its intended use
2. **Technical Requirements**: Specify React, TypeScript, Tailwind CSS, and shadcn/ui usage
3. **Styling Details**: Include color schemes, typography, spacing, and responsive design
4. **Accessibility**: Ensure WCAG compliance and semantic HTML
5. **Functionality**: Define interactions, states, and behavior
6. **Best Practices**: Include performance, security, and maintainability considerations

STRUCTURE YOUR RESPONSE:
- Start with a clear component description
- List specific technical requirements
- Include styling and design guidelines
- Specify accessibility requirements
- Define component structure and props
- Add any additional context or constraints

Keep the enhanced prompt comprehensive but focused, ensuring it will generate production-ready components.`,
      prompt: `Transform this basic UI request into a detailed, comprehensive prompt for AI UI generation:

"${prompt}"

Generate an enhanced prompt that will produce a high-quality, production-ready React component.`,
      maxTokens: 1000,
    })

    return Response.json({ enhancedPrompt: text })
  } catch (error) {
    console.error("Error enhancing prompt:", error)
    return Response.json({ error: "Failed to enhance prompt" }, { status: 500 })
  }
}
