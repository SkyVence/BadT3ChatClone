"use client"
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Input } from "../ui/input";
import { LogIn, LogOut, Plus, SearchIcon, SettingsIcon, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../provider/context";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { ThemeToggle } from "../theme-toggle";

export function ChatMessages({ messages }: { messages: string[] }) {
    return (
        <div className="flex flex-col gap-2 p-4 max-h-96 overflow-y-auto">
            {messages.length === 0 ? (
                <div className="text-muted-foreground text-center py-8">
                    No messages yet. Start a conversation!
                </div>
            ) : (
                messages.map((message, index) => (
                    <div key={index} className="bg-muted/50 rounded-lg p-3 text-sm">
                        {message}
                    </div>
                ))
            )}
        </div>
    );
}

export function SidebarApp({ setOpen }: { setOpen: (open: boolean) => void }) {
    const router = useRouter()
    const { user, signOut } = useAuth()

    const threads: any[] = []

    return (
        <Sidebar variant="inset">
            <SidebarHeader>
                <div className="mt-9 relative">
                    <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input type="search" placeholder="Search..." className="border-none focus-visible:ring-0 pl-8" />
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>
                        Projects
                    </SidebarGroupLabel>
                    <SidebarGroupAction onClick={() => { router.push("/projects/new") }}>
                        <Plus className="size-4" />
                    </SidebarGroupAction>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton>
                                    <span>Project 1</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton>
                                    <span>Project 1</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton>
                                    <span>Project 1</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton>
                                    <span>Project 1</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton>
                                    <span>See more...</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                <SidebarGroup>
                    <SidebarGroupLabel>
                        Threads
                    </SidebarGroupLabel>
                    <SidebarGroupAction onClick={() => { router.push("/") }}>
                        <Plus className="size-4" />
                    </SidebarGroupAction>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {threads?.length === 0 ? (
                                <SidebarMenuItem>
                                    <SidebarMenuButton>
                                        <span>New Chat</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ) : threads?.map(thread => (
                                <SidebarMenuItem key={thread.id}>
                                    <SidebarMenuButton>
                                        <span>{thread.title || "Untitled"}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                {user ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <SidebarMenuButton size="lg">
                                <Avatar className="size-8 ">
                                    <AvatarImage src={user.image || ""} />
                                    <AvatarFallback>
                                        {user.name.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <span>{user.name}</span>
                                    <span className="text-xs text-muted-foreground">{user.email}</span>
                                </div>
                            </SidebarMenuButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="end">
                            <DropdownMenuLabel className="">
                                <div className="flex items-center gap-2">
                                    <Avatar className="size-8">
                                        <AvatarImage src={user.image || ""} />
                                        <AvatarFallback>
                                            {user.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{user.name}</span>
                                        <span className="text-xs text-muted-foreground">{user.email}</span>
                                    </div>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                <DropdownMenuItem onClick={() => { router.push("/settings") }}>
                                    <SettingsIcon className="size-4" />
                                    <span>Settings</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <ThemeToggle />
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => { signOut() }}>
                                <LogOut className="size-4" />
                                <span className="text-red-500">Logout</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <SidebarMenuButton size="lg" onClick={() => { setOpen(true) }} className="cursor-pointer">
                        <LogIn className="size-4" />
                        <span>Login</span>
                    </SidebarMenuButton>
                )}
            </SidebarFooter>
        </Sidebar >
    )
}

