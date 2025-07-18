"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/chat/textarea-chat"
import { Globe, Paperclip, ArrowUp, ChevronDown, Check, ChevronsUpDown } from "lucide-react"
import { ModelSelector } from "@/components/ui/model-selector"
import { models } from "@/models"
import { useStreamer } from "@/context/chat"

interface ChatInputProps {
    handleSend: (message: string) => void;
    isLoading?: boolean;
}

export function ChatInput({
    handleSend,
    isLoading = false
}: ChatInputProps) {
    const [message, setMessage] = useState("")
    const { model, setModel } = useStreamer()

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend(message)
            setMessage("")
        }
    }

    const getCurrentModelCapabilities = () => {
        return model?.features || []
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
                        <ModelSelector selectedModel={model} onSelectModel={setModel} />

                        {/* Conditional Search button */}
                        {getCurrentModelCapabilities().includes("web") && (
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
                        {getCurrentModelCapabilities().includes("files") && (
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
                        disabled={!message.trim() || isLoading}
                        className="bg-primary hover:bg-primary/90 disabled:bg-muted-foreground disabled:opacity-50 h-8 w-8 p-0 rounded-full"
                    >
                        <ArrowUp className="h-4 w-4 text-primary-foreground" />
                    </Button>
                </div>
            </div>
        </div>
    )
}