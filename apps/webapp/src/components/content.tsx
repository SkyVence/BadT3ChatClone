import { Fragment, useState } from "react";
import { SidebarApp } from "./sidebar";
import { SidebarInset, SidebarTrigger } from "./ui/sidebar";
import { ChatInput } from "./chat/index";
import { SignInDialog } from "./dialog/sign-in";
import { ChatProvider, useChat } from "./chat/ChatContext";

interface StreamingMessageData {
    id: string;
    content: string;
    isStreaming: boolean;
}

function ChatContent({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const { sendMessage, isLoading } = useChat();

    function handleSend(message: string) {
        sendMessage(message);
    }

    return (
        <Fragment>
            <SidebarApp setOpen={setOpen} />
            <SidebarTrigger className="fixed top-4 left-4 z-[9999] size-8" />
            <SidebarInset>
                <div className="flex flex-col min-h-screen">
                    <div className="flex-1 overflow-y-auto max-w-4xl w-full mx-auto p-4 mb-[88px]">
                        <main className="flex-1">
                            {children}
                        </main>
                    </div>
                    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none">
                        <div className="max-w-4xl w-full mx-auto pointer-events-auto py-4">
                            <ChatInput
                                handleSend={handleSend}
                                isLoading={isLoading}
                            />
                        </div>
                    </div>
                </div>
            </SidebarInset>
            <SignInDialog open={open} onOpenChange={setOpen} />
        </Fragment >
    )
}

export function AppContent({ children }: { children: React.ReactNode }) {
    return (
        <ChatProvider>
            <ChatContent>{children}</ChatContent>
        </ChatProvider>
    );
}