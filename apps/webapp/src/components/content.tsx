import { Fragment, useState } from "react";
import { SidebarApp } from "./sidebar";
import { SidebarInset, SidebarTrigger } from "./ui/sidebar";
import { ChatInput } from "./chat/chatInputBox";
import { SignInDialog } from "./dialog/sign-in";
import { useBetterChat } from "@/context/betterChatContext";
import { Toaster } from "@/components/ui/sonner";

function ChatContent({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const { send, isSending, model } = useBetterChat();

    function handleSend(message: string) {
        if (!message.trim()) return;
        if (model) {
            send(message, { modelVersion: model.version });
        } else {
            send(message);
        }
    }

    return (
        <Fragment>
            <Toaster />
            <SidebarApp setOpen={setOpen} />
            <SidebarTrigger className="fixed top-4 left-4 z-[9999] size-8" />
            <SidebarInset className="flex flex-col h-screen overflow-hidden">
                {/* Main content area that scrolls within sidebar inset */}
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-4xl w-full mx-auto p-4 pb-[140px] min-h-full">
                        <main>
                            {children}
                        </main>
                    </div>
                </div>

                {/* Chat input fixed to bottom of sidebar inset */}
                <div className="absolute inset-x-0 bottom-0 z-0 flex justify-center pointer-events-none">
                    <div className="max-w-4xl w-full mx-auto pointer-events-auto ">
                        <ChatInput
                            handleSend={handleSend}
                            isLoading={isSending}
                        />
                    </div>
                </div>
            </SidebarInset>
            <SignInDialog open={open} onOpenChange={setOpen} />
        </Fragment >
    )
}

export function AppContent({ children }: { children: React.ReactNode }) {
    return <ChatContent>{children}</ChatContent>;
}