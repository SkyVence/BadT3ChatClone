import { trpc } from "@/utils/trpc";
import { useSubscription } from "@trpc/tanstack-react-query";
import { Fragment, useEffect, useState } from "react";
import { ChatMessages, SidebarApp } from "./sidebar";
import { SidebarInset, SidebarTrigger } from "./ui/sidebar";
import { ChatInput } from "./chat";
import { SignInDialog } from "./dialog/sign-in";

export function AppContent({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<string[]>([]);
    const [currentPrompt, setCurrentPrompt] = useState<string>("");
    const [isActive, setIsActive] = useState(false);

    // Move useSubscription to component level using your original approach
    const chatMutation = useSubscription(trpc.ai.chatv2.subscriptionOptions({
        provider: "anthropic",
        model: "claude-3-7-sonnet-20250219",
        prompt: currentPrompt,
    }))

    // Handle the streaming data when it arrives
    useEffect(() => {
        if (chatMutation.data && isActive) {
            setMessages(prev => {
                const newMessages = [...prev];
                if (newMessages.length > 0) {
                    // Append to the last message (AI response)
                    newMessages[newMessages.length - 1] += chatMutation.data;
                }
                return newMessages;
            });
        }
    }, [chatMutation.data, isActive]);

    const handleSend = (message: string) => {
        if (!message.trim()) return;

        // Add user message to chat
        setMessages(prev => [...prev, `User: ${message}`]);

        // Add placeholder for AI response
        setMessages(prev => [...prev, "AI: "]);

        // Trigger the subscription with the new message
        setCurrentPrompt(message);
        setIsActive(true);
    };

    return (
        <Fragment>
            <SidebarApp setOpen={setOpen} />
            <SidebarTrigger className="fixed top-4 left-4 z-[9999] size-8" />
            <SidebarInset>
                <main className="flex-1 pb-24">
                    {children}
                </main>

                <div className="w-full max-w-4xl mx-auto border-x border-t border-border rounded-t-xl bg-background">
                    <ChatMessages messages={messages} />
                    <ChatInput handleSend={handleSend} />
                </div>
            </SidebarInset>
            <SignInDialog open={open} onOpenChange={setOpen} />
        </Fragment >
    )
}