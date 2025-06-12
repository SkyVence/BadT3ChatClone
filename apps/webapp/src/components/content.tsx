import { Fragment, useState } from "react";
import { SidebarApp } from "./sidebar";
import { SidebarInset, SidebarTrigger } from "./ui/sidebar";
import { ChatInput } from "./chat/index";
import { SignInDialog } from "./dialog/sign-in";

interface StreamingMessageData {
    id: string;
    content: string;
    isStreaming: boolean;
}

export function AppContent({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);

    function handleSend(message: string) {
        console.log(message)
    }
    function isLoading() {
        return false;
    }

    return (
        <Fragment>
            <SidebarApp setOpen={setOpen} />
            <SidebarTrigger className="fixed top-4 left-4 z-[9999] size-8" />
            <SidebarInset>
                <main className="flex-1 pb-24">
                    {children}
                </main>

                <div className="w-full max-w-4xl mx-auto border-x border-t border-border rounded-t-xl bg-background">
                    <ChatInput
                        handleSend={handleSend}
                        isLoading={isLoading()}
                    />
                </div>
            </SidebarInset>
            <SignInDialog open={open} onOpenChange={setOpen} />
        </Fragment >
    )
}