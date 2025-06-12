import { SiGoogle, SiOpenai, SiAnthropic } from "@icons-pack/react-simple-icons"

// Define model types and features
export type ModelFeature = "vision" | "web" | "files" | "thinking" | "reasoning" | "experimental"

export interface ModelInfo {
    id: string
    name: string
    version: string
    provider: string
    providerIcon: React.ReactNode
    features: ModelFeature[]
    isFavorite?: boolean
    isNew?: boolean
    isExperimental?: boolean
    subtitle?: string
    color?: string
}


export const models: ModelInfo[] = [
    {
        id: "gemini-2.5-flash",
        version: "gemini-2.5-flash-preview-05-20",
        name: "Gemini\n2.5 Flash",
        provider: "Google",
        providerIcon: <SiGoogle />,
        features: ["vision", "web", "files"],
        isFavorite: true,
        color: "text-primary",
    },
    {
        id: "gemini-2.0-flash",
        name: "Gemini\n2.0 Flash",
        version: "gemini-2.0-flash",
        provider: "Google",
        providerIcon: <SiGoogle />,
        features: ["vision", "web", "files"],
        color: "text-primary",
    },
    {
        id: "gemini-2.0-flash-lite",
        name: "Gemini\n2.0 Flash Lite",
        version: "gemini-2.0-flash-lite",
        provider: "Google",
        providerIcon: <SiGoogle />,
        features: ["vision", "files"],
        color: "text-primary",
    },
    {
        id: "gemini-2.5-flash-thinking",
        name: "Gemini\n2.5 Flash",
        version: "gemini-2.0-flash-lite",
        provider: "Google",
        providerIcon: <SiGoogle />,
        features: ["thinking"],
        subtitle: "(Thinking)",
        color: "text-primary",
    },
    {
        id: "gemini-2.5-pro",
        name: "Gemini\n2.5 Pro",
        version: "gemini-2.5-pro-preview-06-05",
        provider: "Google",
        providerIcon: <SiGoogle />,
        features: ["vision", "web"],
        color: "text-primary",
    },
    {
        id: "gpt-imagegen",
        name: "GPT\nImageGen",
        version: "gpt-image-1",
        provider: "OpenAI",
        providerIcon: <SiOpenai />,
        features: ["vision", "files"],
        color: "text-emerald-500",
    },
    {
        id: "gpt-4o-mini",
        name: "GPT\n4o-mini",
        version: "gpt-4o-mini",
        provider: "OpenAI",
        providerIcon: <SiOpenai />,
        features: ["vision"],
        color: "text-emerald-500",
    },
    {
        id: "gpt-4o",
        name: "GPT\n4o",
        version: "gpt-4o",
        provider: "OpenAI",
        providerIcon: <SiOpenai />,
        features: ["vision"],
        color: "text-emerald-500",
        subtitle: "",
    },
    {
        id: "gpt-4.1",
        name: "GPT\n4.1",
        version: "gpt-4.1",
        provider: "OpenAI",
        providerIcon: <SiOpenai />,
        features: ["vision"],
        color: "text-emerald-500",
    },
    {
        id: "gpt-4.1-mini",
        name: "GPT\n4.1 Mini",
        version: "gpt-4.1-mini",
        provider: "OpenAI",
        providerIcon: <SiOpenai />,
        features: ["vision"],
        color: "text-emerald-500",
    },
    {
        id: "gpt-4.1-nano",
        name: "GPT\n4.1 Nano",
        version: "gpt-4.1-nano",
        provider: "OpenAI",
        providerIcon: <SiOpenai />,
        features: ["vision", "experimental"],
        color: "text-emerald-500",
    },
    {
        id: "o3-mini",
        name: "o3\nmini",
        version: "o3-mini",
        provider: "OpenAI",
        providerIcon: <SiOpenai />,
        features: ["reasoning"],
        color: "text-emerald-500",
    },
    {
        id: "o4-mini",
        name: "o4\nmini",
        version: "o4-mini",
        provider: "OpenAI",
        providerIcon: <SiOpenai />,
        features: ["vision", "reasoning"],
        color: "text-emerald-500",
    },
    {
        id: "o3",
        name: "o3",
        version: "o3",
        provider: "OpenAI",
        providerIcon: <SiOpenai />,
        features: ["vision", "reasoning"],
        color: "text-emerald-500",
    },
    {
        id: "o3-pro",
        name: "o3\nPro",
        version: "o3-pro",
        provider: "OpenAI",
        providerIcon: <SiOpenai />,
        features: ["vision", "files", "reasoning"],
        isNew: true,
        color: "text-emerald-500",
    },
    {
        id: "claude-3.5-sonnet",
        name: "Claude\n3.5 Sonnet",
        version: "claude-3-5-sonnet-20240620",
        provider: "Anthropic",
        providerIcon: <SiAnthropic />,
        features: ["vision", "files"],
        color: "text-orange-500",
    },
    {
        id: "claude-3.7-sonnet",
        name: "Claude\n3.7 Sonnet",
        version: "claude-3-7-sonnet-latest",
        provider: "Anthropic",
        providerIcon: <SiAnthropic />,
        features: ["vision", "files"],
        color: "text-orange-500",
    },
    {
        id: "claude-3.7-sonnet-reasoning",
        name: "Claude\n3.7 Sonnet",
        version: "claude-3-7-sonnet-latest",
        provider: "Anthropic",
        providerIcon: <SiAnthropic />,
        features: ["vision", "files", "reasoning"],
        subtitle: "(Reasoning)",
        color: "text-orange-500",
    },
    {
        id: "claude-4-sonnet",
        name: "Claude\n4 Sonnet",
        version: "claude-sonnet-4-20250514",
        provider: "Anthropic",
        providerIcon: <SiAnthropic />,
        features: ["vision", "files", "reasoning"],
        color: "text-orange-500",
    },
    {
        id: "claude-4-sonnet-reasoning",
        name: "Claude\n4 Sonnet",
        version: "claude-sonnet-4-20250514",
        provider: "Anthropic",
        providerIcon: <SiAnthropic />,
        features: ["vision", "files", "reasoning"],
        subtitle: "(Reasoning)",
        color: "text-orange-500",
    },
    {
        id: "claude-4-opus",
        name: "Claude\n4 Opus",
        version: "claude-opus-4-20250514",
        provider: "Anthropic",
        providerIcon: <SiAnthropic />,
        features: ["vision", "files", "reasoning"],
        color: "text-orange-500",
    },
]