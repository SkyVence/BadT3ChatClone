import { Fragment, useState } from "react";
import { ChatMessages, SidebarApp } from "./sidebar";
import { SidebarInset, SidebarTrigger } from "./ui/sidebar";
import { ChatInput } from "./chat";
import { SignInDialog } from "./dialog/sign-in";

export function AppContent({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<string[]>([]);

    function handleSend(message: string) {
        console.log(message);
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
                    <ChatMessages messages={messages} />
                    <ChatInput handleSend={handleSend} />
                </div>
            </SidebarInset>
            <SignInDialog open={open} onOpenChange={setOpen} />
        </Fragment >
    )
}