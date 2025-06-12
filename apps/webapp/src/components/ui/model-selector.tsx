"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import {
    Search,
    ChevronDown,
    ChevronUp,
    Filter,
    Star,
    Eye,
    Globe,
    FileText,
    Brain,
    Zap,
    Circle,
    Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ModelFeature, ModelInfo, models } from "@/models"

// Feature icon mapping
const featureIcons: Record<ModelFeature, React.ReactNode> = {
    vision: <Eye className="h-3.5 w-3.5" />,
    web: <Globe className="h-3.5 w-3.5" />,
    files: <FileText className="h-3.5 w-3.5" />,
    thinking: <Brain className="h-3.5 w-3.5" />,
    reasoning: <Brain className="h-3.5 w-3.5" />,
    experimental: <Circle className="h-3.5 w-3.5" />,
}

const featureLabels: Record<ModelFeature, string> = {
    vision: "Vision",
    web: "Web Search",
    files: "File Upload",
    thinking: "Thinking",
    reasoning: "Reasoning",
    experimental: "Experimental",
}

interface ModelSelectorProps {
    selectedModel: string
    onSelectModel: (modelId: string) => void
    onToggleFavorite?: (modelId: string, isFavorite: boolean) => void
}

export function ModelSelector({ selectedModel, onSelectModel, onToggleFavorite }: ModelSelectorProps) {
    const [open, setOpen] = useState(false)
    const [showAll, setShowAll] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedFilters, setSelectedFilters] = useState<ModelFeature[]>([])
    const [isAnimating, setIsAnimating] = useState(false)

    // Get the currently selected model
    const currentModel = models.find((model) => model.id === selectedModel) || models[0]

    // Filter models based on search and feature filters
    const filteredModels = models.filter((model) => {
        const matchesSearch =
            model.name.toLowerCase().replace("\n", " ").includes(searchQuery.toLowerCase()) ||
            model.provider.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesFilters =
            selectedFilters.length === 0 || selectedFilters.every((filter) => model.features.includes(filter))

        return matchesSearch && matchesFilters
    })

    // Separate favorites and others
    const favoriteModels = filteredModels.filter((model) => model.isFavorite)
    const otherModels = filteredModels.filter((model) => !model.isFavorite)

    const handleFilterToggle = (feature: ModelFeature) => {
        setSelectedFilters((prev) => (prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature]))
    }

    const handleShowAllToggle = () => {
        setIsAnimating(true)
        setShowAll(!showAll)
        // Reset animation state after animation completes
        setTimeout(() => setIsAnimating(false), 500)
    }

    const ModelCard = ({ model }: { model: ModelInfo }) => (
        <div
            className={cn(
                "relative rounded-lg p-3 cursor-pointer transition-colors min-h-[120px]",
                "bg-card border border-border",
                "hover:border-accent",
                model.id === selectedModel && "border-primary bg-accent",
                model.isNew && "border-2 border-[#FFD700] shadow-[0_0_8px_2px_#FFD70080]"
            )}
            onClick={() => {
                onSelectModel(model.id)
                setOpen(false)
                setShowAll(false)
            }}
        >
            {/* Badges */}
            <div className="absolute top-2 right-2 flex gap-1 flex-wrap">
                {model.isExperimental && <Badge className="bg-destructive text-white text-xs px-1.5 py-0.5">△</Badge>}
            </div>

            {/* Provider Icon */}
            <div className="flex justify-center mb-2">
                <div className={cn("text-xl", model.color)}>{model.providerIcon}</div>
            </div>

            {/* Model Name */}
            <div className="text-center mb-2">
                <div className="font-medium text-xs leading-tight text-foreground break-words hyphens-auto">
                    {model.name.replace("\n", " ")}
                </div>
                {model.subtitle && <div className="text-xs mt-1 text-muted-foreground break-words">{model.subtitle}</div>}
            </div>

            {/* Features */}
            <div className="flex justify-center gap-1 flex-wrap">
                {model.features.slice(0, 4).map((feature) => (
                    <div key={feature} className="text-muted-foreground">
                        {featureIcons[feature]}
                    </div>
                ))}
            </div>
        </div>
    )

    return (
        <div className="flex items-center gap-2">
            {/* Main Model Selector Dropdown */}
            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 px-3 py-2 h-auto min-w-0">
                        <div className={cn("text-lg flex-shrink-0", currentModel.color)}>{currentModel.providerIcon}</div>
                        <span className="text-sm font-medium truncate">{currentModel.name.replace("\n", " ")}</span>
                        <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[min(90vw,500px)] p-0" align="start">
                    <div className="rounded-lg bg-popover border border-border">
                        {/* Search Bar */}
                        <div className="p-4 border-b border-border">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                <Input
                                    placeholder="Search models..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-card border-input text-foreground placeholder-muted-foreground"
                                />
                            </div>
                        </div>

                        {/* Favorites Section */}
                        {favoriteModels.length > 0 && (
                            <div className="p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Star className="h-4 w-4 text-pink-500" />
                                    <span className="text-pink-500 font-medium">Favorites</span>
                                </div>

                                {/* Conditional layout: List when collapsed, Grid when expanded */}
                                {!showAll ? (
                                    // List layout for favorites only
                                    <div className="space-y-2">
                                        {favoriteModels.slice(0, 5).map((model) => (
                                            <div
                                                key={model.id}
                                                className={cn(
                                                    "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                                                    "bg-card border border-border hover:border-accent",
                                                    model.id === selectedModel && "border-primary bg-accent",
                                                )}
                                                onClick={() => {
                                                    onSelectModel(model.id)
                                                    setOpen(false)
                                                    setShowAll(false)
                                                }}
                                            >
                                                {/* Provider Icon */}
                                                <div className={cn("text-lg flex-shrink-0", model.color)}>{model.providerIcon}</div>

                                                {/* Model Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-sm text-foreground truncate">
                                                        {model.name.replace("\n", " ")}
                                                    </div>
                                                    {model.subtitle && (
                                                        <div className="text-xs text-muted-foreground truncate">{model.subtitle}</div>
                                                    )}
                                                </div>

                                                {/* Features */}
                                                <div className="flex gap-2 flex-shrink-0">
                                                    {model.features.slice(0, 3).map((feature) => (
                                                        <div key={feature} className="text-muted-foreground">
                                                            {featureIcons[feature]}
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Badges */}
                                                <div className="flex gap-1 flex-shrink-0">
                                                    {model.subtitle?.includes("Thinking") && (
                                                        <Badge className="bg-purple-500 text-white text-xs px-1.5 py-0.5">△</Badge>
                                                    )}
                                                    {model.subtitle?.includes("Reasoning") && (
                                                        <Badge className="bg-pink-500 text-white text-xs px-1.5 py-0.5">△</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    // Responsive grid layout when expanded
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {favoriteModels.map((model) => (
                                            <div key={model.id}>
                                                <ModelCard model={model} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Show All / Others Section with Diagonal Animation */}
                        <div className="relative overflow-hidden">
                            {!showAll ? (
                                <div className="p-4 border-t border-border">
                                    <div className="flex items-center justify-between gap-2">
                                        <Button
                                            variant="ghost"
                                            onClick={handleShowAllToggle}
                                            disabled={isAnimating}
                                            className="flex-1 justify-between text-foreground hover:text-foreground min-w-0"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <motion.div initial={false} animate={{ rotate: 0 }} transition={{ duration: 0.3 }}>
                                                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                                                </motion.div>
                                                <span className="truncate">Show all</span>
                                                <div className="w-2 h-2 bg-pink-500 rounded-full flex-shrink-0"></div>
                                            </div>
                                        </Button>

                                        {/* Filter Dropdown */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="px-2 flex-shrink-0">
                                                    <Filter className="h-4 w-4" />
                                                    {selectedFilters.length > 0 && (
                                                        <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                                                            {selectedFilters.length}
                                                        </Badge>
                                                    )}
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-48" align="end">
                                                <div className="p-2">
                                                    <div className="text-sm font-medium mb-2 text-muted-foreground">Filter by features</div>
                                                    <div className="space-y-1">
                                                        {Object.entries(featureLabels).map(([feature, label]) => (
                                                            <div
                                                                key={feature}
                                                                className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer"
                                                                onClick={() => handleFilterToggle(feature as ModelFeature)}
                                                            >
                                                                <div className="w-4 h-4 border border-gray-600 rounded flex items-center justify-center flex-shrink-0">
                                                                    {selectedFilters.includes(feature as ModelFeature) && (
                                                                        <Check className="h-3 w-3 text-blue-400" />
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <div className="flex-shrink-0">{featureIcons[feature as ModelFeature]}</div>
                                                                    <span className="text-sm text-muted-foreground truncate">{label}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {selectedFilters.length > 0 && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setSelectedFilters([])}
                                                            className="w-full mt-2 text-xs"
                                                        >
                                                            Clear filters
                                                        </Button>
                                                    )}
                                                </div>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            ) : (
                                <motion.div
                                    key="expanded-content"
                                    initial={{
                                        scaleX: 0,
                                        scaleY: 0,
                                        transformOrigin: "top left",
                                    }}
                                    animate={{
                                        scaleX: 1,
                                        scaleY: 1,
                                        transformOrigin: "top left",
                                    }}
                                    exit={{
                                        scaleX: 0,
                                        scaleY: 0,
                                        transformOrigin: "top left",
                                    }}
                                    transition={{
                                        duration: 0.4,
                                        ease: [0.25, 0.46, 0.45, 0.94], // Custom easing for smooth diagonal effect
                                    }}
                                    className="border-t border-border"
                                >
                                    {/* Others Section */}
                                    <div className="p-4">
                                        <div className="font-medium mb-3 text-muted-foreground">Others</div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-96 overflow-y-auto">
                                            {otherModels.map((model, index) => (
                                                <motion.div
                                                    key={model.id}
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{
                                                        delay: 0.1 + index * 0.02,
                                                        duration: 0.2,
                                                    }}
                                                >
                                                    <ModelCard model={model} />
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Collapse Button */}
                                    <div className="p-4 border-t border-border">
                                        <div className="flex items-center justify-between gap-2">
                                            <Button
                                                variant="ghost"
                                                onClick={handleShowAllToggle}
                                                disabled={isAnimating}
                                                className="flex-1 justify-between text-foreground hover:text-foreground min-w-0"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <motion.div initial={false} animate={{ rotate: 180 }} transition={{ duration: 0.3 }}>
                                                        <ChevronUp className="h-4 w-4 flex-shrink-0" />
                                                    </motion.div>
                                                    <span className="truncate">Show less</span>
                                                </div>
                                            </Button>

                                            {/* Filter Dropdown */}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="px-2 flex-shrink-0">
                                                        <Filter className="h-4 w-4" />
                                                        {selectedFilters.length > 0 && (
                                                            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                                                                {selectedFilters.length}
                                                            </Badge>
                                                        )}
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="w-48" align="end">
                                                    <div className="p-2">
                                                        <div className="text-sm font-medium mb-2 text-muted-foreground">Filter by features</div>
                                                        <div className="space-y-1">
                                                            {Object.entries(featureLabels).map(([feature, label]) => (
                                                                <div
                                                                    key={feature}
                                                                    className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer"
                                                                    onClick={() => handleFilterToggle(feature as ModelFeature)}
                                                                >
                                                                    <div className="w-4 h-4 border border-gray-600 rounded flex items-center justify-center flex-shrink-0">
                                                                        {selectedFilters.includes(feature as ModelFeature) && (
                                                                            <Check className="h-3 w-3 text-blue-400" />
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <div className="flex-shrink-0">{featureIcons[feature as ModelFeature]}</div>
                                                                        <span className="text-sm text-muted-foreground truncate">{label}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {selectedFilters.length > 0 && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setSelectedFilters([])}
                                                                className="w-full mt-2 text-xs"
                                                            >
                                                                Clear filters
                                                            </Button>
                                                        )}
                                                    </div>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
