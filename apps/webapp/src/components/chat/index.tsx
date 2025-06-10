"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/chat/textarea-chat"
import { Globe, Paperclip, ArrowUp, ChevronDown, Check, ChevronsUpDown } from "lucide-react"
import { models } from "@/models"
import { cn } from "@/lib/utils"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export function ChatInput({ handleSend }: { handleSend: (message: string) => void }) {
    const [message, setMessage] = useState("")
    const [selectedModel, setSelectedModel] = useState("")
    const [open, setOpen] = useState(false)

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend(message)
            setMessage("")
        }
    }

    const getCurrentModelCapabilities = () => {
        const model = models.find((m) => m.version === selectedModel)
        return model?.capabilities || { search: false, attach: false }
    }

    return (
        <div className="relative bg-muted rounded-lg border-t border-l border-r border-border p-1">
            <div className="relative bg-card rounded-lg border-t border-l border-r border-border p-4">
                {/* Main input area */}
                <div className="mb-4">
                    <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your message here..."
                        className="min-h-[60px] bg-transparent border-none resize-none text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 text-base p-0"
                    />
                </div>

                {/* Bottom toolbar */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* Model selector - Replaced Select with Combobox */}
                        <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    role="combobox"
                                    aria-expanded={open}
                                    className="w-auto justify-between bg-transparent border-none text-foreground hover:bg-accent focus:ring-0 focus:ring-offset-0 h-8 px-3"
                                >
                                    {selectedModel
                                        ? models.find((model) => model.version === selectedModel)?.version
                                        : "Select model..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0 bg-popover border-border">
                                <Command>
                                    <CommandInput placeholder="Search models..." className="h-9" />
                                    <CommandList>
                                        <CommandEmpty>No model found.</CommandEmpty>
                                        <CommandGroup>
                                            {models.map((model) => (
                                                <CommandItem
                                                    key={model.version}
                                                    value={model.version}
                                                    onSelect={(currentValue) => {
                                                        setSelectedModel(currentValue === selectedModel ? "" : currentValue)
                                                        setOpen(false)
                                                    }}
                                                    className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedModel === model.version ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {model.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>

                        {/* Conditional Search button */}
                        {getCurrentModelCapabilities().search && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-foreground hover:bg-accent h-8 px-3"
                            >
                                <Globe className="h-4 w-4 mr-2" />
                                Search
                            </Button>
                        )}

                        {/* Conditional Attach button */}
                        {getCurrentModelCapabilities().attach && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-foreground hover:bg-accent h-8 px-3"
                            >
                                <Paperclip className="h-4 w-4 mr-2" />
                                Attach
                            </Button>
                        )}
                    </div>

                    {/* Send button */}
                    <Button
                        onClick={() => {
                            handleSend(message)
                            setMessage("")
                        }}
                        disabled={!message.trim()}
                        className="bg-primary hover:bg-primary/90 disabled:bg-muted-foreground disabled:opacity-50 h-8 w-8 p-0 rounded-full"
                    >
                        <ArrowUp className="h-4 w-4 text-primary-foreground" />
                    </Button>
                </div>
            </div>
        </div>
    )
}